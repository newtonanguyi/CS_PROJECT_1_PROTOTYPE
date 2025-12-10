import json
import random
from datetime import datetime, timedelta
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
import numpy as np
from sklearn.linear_model import LinearRegression


# Mock market data (in production, this would come from a real API or database)
MOCK_MARKET_DATA = {
    'Tomato': {
        'current_price': 45.50,
        'unit': 'per kg',
        'trend': 'up',
        'history': []
    },
    'Maize': {
        'current_price': 28.30,
        'unit': 'per kg',
        'trend': 'stable',
        'history': []
    },
    'Potato': {
        'current_price': 35.20,
        'unit': 'per kg',
        'trend': 'down',
        'history': []
    },
    'Onion': {
        'current_price': 42.80,
        'unit': 'per kg',
        'trend': 'up',
        'history': []
    },
    'Rice': {
        'current_price': 55.00,
        'unit': 'per kg',
        'trend': 'stable',
        'history': []
    },
    'Wheat': {
        'current_price': 32.50,
        'unit': 'per kg',
        'trend': 'up',
        'history': []
    }
}


def generate_price_history(crop_name, days=30):
    """Generate mock price history for a crop."""
    base_price = MOCK_MARKET_DATA[crop_name]['current_price']
    history = []
    
    for i in range(days, 0, -1):
        date = datetime.now() - timedelta(days=i)
        # Add some random variation
        variation = random.uniform(-0.05, 0.05)
        price = base_price * (1 + variation * (days - i) / days)
        history.append({
            'date': date.strftime('%Y-%m-%d'),
            'price': round(price, 2)
        })
    
    return history


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_market_prices(request):
    """Get current market prices for various crops."""
    crop = request.query_params.get('crop', None)
    
    if crop and crop in MOCK_MARKET_DATA:
        data = MOCK_MARKET_DATA[crop].copy()
        data['history'] = generate_price_history(crop, 30)
        return Response(data, status=status.HTTP_200_OK)
    
    # Return all crops
    all_prices = {}
    for crop_name, crop_data in MOCK_MARKET_DATA.items():
        all_prices[crop_name] = {
            'current_price': crop_data['current_price'],
            'unit': crop_data['unit'],
            'trend': crop_data['trend']
        }
    
    return Response({
        'crops': all_prices,
        'last_updated': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_price_history(request, crop):
    """Get price history for a specific crop."""
    if crop not in MOCK_MARKET_DATA:
        return Response({
            'error': f'Crop "{crop}" not found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    days = int(request.query_params.get('days', 30))
    history = generate_price_history(crop, days)
    
    return Response({
        'crop': crop,
        'history': history,
        'current_price': MOCK_MARKET_DATA[crop]['current_price']
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def predict_price(request, crop):
    """Predict future price for a crop using simple linear regression."""
    if crop not in MOCK_MARKET_DATA:
        return Response({
            'error': f'Crop "{crop}" not found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    # Generate historical data
    history = generate_price_history(crop, 60)
    
    # Prepare data for regression
    X = np.array([[i] for i in range(len(history))])
    y = np.array([item['price'] for item in history])
    
    # Train simple linear regression model
    model = LinearRegression()
    model.fit(X, y)
    
    # Predict next 7 days
    future_days = 7
    future_X = np.array([[len(history) + i] for i in range(future_days)])
    predictions = model.predict(future_X)
    
    # Format predictions
    future_dates = []
    for i in range(future_days):
        date = datetime.now() + timedelta(days=i+1)
        future_dates.append({
            'date': date.strftime('%Y-%m-%d'),
            'predicted_price': round(float(predictions[i]), 2),
            'confidence': 'medium'  # Simple model, medium confidence
        })
    
    current_price = MOCK_MARKET_DATA[crop]['current_price']
    avg_predicted = np.mean(predictions)
    trend = 'up' if avg_predicted > current_price else 'down' if avg_predicted < current_price else 'stable'
    
    return Response({
        'crop': crop,
        'current_price': current_price,
        'predictions': future_dates,
        'trend': trend,
        'average_predicted': round(float(avg_predicted), 2),
        'note': 'Predictions are based on historical trends and may not reflect actual market conditions.'
    }, status=status.HTTP_200_OK)







