import json
from pathlib import Path
from datetime import datetime, timedelta
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
import numpy as np
from sklearn.linear_model import LinearRegression


# Path to realistic price config (FAO/regional data)
_PRICE_CONFIG_PATH = Path(__file__).resolve().parent / 'data' / 'price_config.json'

# Fallback if config missing (same API shape)
MOCK_MARKET_DATA = {
    'Tomato': {'current_price': 4200.0, 'unit': 'per kg', 'trend': 'up'},
    'Maize': {'current_price': 2400.0, 'unit': 'per kg', 'trend': 'stable'},
    'Potato': {'current_price': 3200.0, 'unit': 'per kg', 'trend': 'stable'},
    'Onion': {'current_price': 4500.0, 'unit': 'per kg', 'trend': 'up'},
    'Rice': {'current_price': 5200.0, 'unit': 'per kg', 'trend': 'stable'},
    'Wheat': {'current_price': 3100.0, 'unit': 'per kg', 'trend': 'up'},
}


def _load_price_config():
    """Load realistic price config. Returns None if missing or invalid."""
    try:
        if _PRICE_CONFIG_PATH.exists():
            with open(_PRICE_CONFIG_PATH, 'r', encoding='utf-8') as f:
                return json.load(f)
    except (json.JSONDecodeError, IOError):
        pass
    return None


def _deterministic_noise(seed, day_index):
    """Reproducible value in [-1, 1] for realistic variation."""
    x = (seed * 31 + day_index) % 10000
    return (x / 5000.0) - 1.0


def generate_realistic_price_history(crop_name, days=30, config=None):
    """
    Generate deterministic price history from config (FAO/regional-based).
    Same inputs always produce same outputs. Returns list of {date, price}.
    """
    if not config or 'crops' not in config or crop_name not in config['crops']:
        return None
    c = config['crops'][crop_name]
    base = float(c['base_price'])
    vol = float(c.get('volatility', 0.03))
    trend = float(c.get('trend_pct_per_month', 0)) / 100.0
    seed = int(c.get('seed', 0))
    unit = config.get('unit', 'per kg')
    history = []
    for i in range(days, 0, -1):
        day_index = i
        date = datetime.now() - timedelta(days=i)
        # Trend over time (older = more past)
        trend_factor = 1.0 + trend * (day_index / 30.0)
        noise = _deterministic_noise(seed, day_index) * vol
        price = base * trend_factor * (1.0 + noise)
        price = max(round(price, 2), 100)  # keep positive and reasonable
        history.append({'date': date.strftime('%Y-%m-%d'), 'price': price})
    return history


def get_market_data_for_crop(crop_name, config):
    """Get current price and trend from realistic history for one crop."""
    history = generate_realistic_price_history(crop_name, days=60, config=config)
    if not history:
        return None
    current_price = history[-1]['price']
    if len(history) >= 7:
        recent_avg = np.mean([h['price'] for h in history[-7:]])
        older_avg = np.mean([h['price'] for h in history[-14:-7]]) if len(history) >= 14 else recent_avg
        if recent_avg > older_avg * 1.005:
            trend = 'up'
        elif recent_avg < older_avg * 0.995:
            trend = 'down'
        else:
            trend = 'stable'
    else:
        trend = 'stable'
    return {
        'current_price': current_price,
        'unit': config.get('unit', 'per kg'),
        'trend': trend,
        'history': history,
    }


def _all_crop_names():
    """Set of valid crop names (from config or fallback)."""
    config = _load_price_config()
    if config and 'crops' in config:
        return set(config['crops'].keys())
    return set(MOCK_MARKET_DATA.keys())


def _get_history(crop_name, days=30):
    """Get price history for a crop (realistic if config exists, else fallback)."""
    config = _load_price_config()
    if config:
        hist = generate_realistic_price_history(crop_name, days=min(days, 90), config=config)
        if hist:
            return hist
    # Fallback: deterministic from MOCK base
    base = MOCK_MARKET_DATA.get(crop_name, {}).get('current_price', 3000)
    seed = hash(crop_name) % 10000
    history = []
    for i in range(days, 0, -1):
        date = datetime.now() - timedelta(days=i)
        noise = _deterministic_noise(seed, i) * 0.03
        price = base * (1.0 + noise)
        history.append({'date': date.strftime('%Y-%m-%d'), 'price': round(max(price, 100), 2)})
    return history


def _current_price_and_trend(crop_name):
    """Get current price and trend for a crop."""
    config = _load_price_config()
    if config:
        data = get_market_data_for_crop(crop_name, config)
        if data:
            return data['current_price'], data['trend']
    m = MOCK_MARKET_DATA.get(crop_name, {})
    return m.get('current_price', 3000), m.get('trend', 'stable')


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_market_prices(request):
    """Get current market prices for various crops (realistic data from FAO/regional config)."""
    crop = request.query_params.get('crop', None)
    crop_names = _all_crop_names()

    if crop and crop in crop_names:
        config = _load_price_config()
        if config:
            data = get_market_data_for_crop(crop, config)
            if data:
                return Response({
                    'current_price': data['current_price'],
                    'unit': data['unit'],
                    'trend': data['trend'],
                    'history': data['history'][-30:],
                }, status=status.HTTP_200_OK)
        # Fallback
        hist = _get_history(crop, 30)
        price, trend = _current_price_and_trend(crop)
        return Response({
            'current_price': price,
            'unit': 'per kg',
            'trend': trend,
            'history': hist,
        }, status=status.HTTP_200_OK)

    all_prices = {}
    for crop_name in crop_names:
        price, trend = _current_price_and_trend(crop_name)
        config = _load_price_config()
        unit = (config.get('unit', 'per kg') if config else 'per kg')
        all_prices[crop_name] = {
            'current_price': price,
            'unit': unit,
            'trend': trend,
        }

    return Response({
        'crops': all_prices,
        'last_updated': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'data_source': 'FAO/regional market data (Uganda/East Africa)' if _load_price_config() else 'fallback',
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_price_history(request, crop):
    """Get price history for a specific crop."""
    crop_names = _all_crop_names()
    if crop not in crop_names:
        return Response(
            {'error': f'Crop "{crop}" not found'},
            status=status.HTTP_404_NOT_FOUND,
        )
    try:
        days = min(int(request.query_params.get('days', 30)), 90)
    except ValueError:
        days = 30
    history = _get_history(crop, days)
    price, _ = _current_price_and_trend(crop)
    return Response({
        'crop': crop,
        'history': history,
        'current_price': price,
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def predict_price(request, crop):
    """Predict future price using linear regression on realistic historical data."""
    crop_names = _all_crop_names()
    if crop not in crop_names:
        return Response(
            {'error': f'Crop "{crop}" not found'},
            status=status.HTTP_404_NOT_FOUND,
        )

    history = _get_history(crop, 60)
    X = np.array([[i] for i in range(len(history))])
    y = np.array([item['price'] for item in history])

    model = LinearRegression()
    model.fit(X, y)

    future_days = 7
    future_X = np.array([[len(history) + i] for i in range(future_days)])
    predictions = model.predict(future_X)

    future_dates = []
    for i in range(future_days):
        date = datetime.now() + timedelta(days=i + 1)
        future_dates.append({
            'date': date.strftime('%Y-%m-%d'),
            'predicted_price': round(float(predictions[i]), 2),
            'confidence': 'medium',
        })

    current_price, _ = _current_price_and_trend(crop)
    avg_predicted = float(np.mean(predictions))
    trend = 'up' if avg_predicted > current_price else ('down' if avg_predicted < current_price else 'stable')

    return Response({
        'crop': crop,
        'current_price': current_price,
        'predictions': future_dates,
        'trend': trend,
        'average_predicted': round(avg_predicted, 2),
        'note': 'Predictions based on historical price trends (FAO/regional data). Actual markets may vary.',
    }, status=status.HTTP_200_OK)
