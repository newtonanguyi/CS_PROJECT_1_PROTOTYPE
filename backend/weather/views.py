import os
import requests
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
from dotenv import load_dotenv

load_dotenv()

# OpenWeatherMap API key (set in .env file)
OPENWEATHER_API_KEY = os.getenv('OPENWEATHER_API_KEY', 'your_api_key_here')
OPENWEATHER_BASE_URL = 'https://api.openweathermap.org/data/2.5'
OPEN_METEO_GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search'
OPEN_METEO_FORECAST_URL = 'https://api.open-meteo.com/v1/forecast'


def map_open_meteo_weather_code(code):
    """Map Open-Meteo weather code to human-readable description."""
    mapping = {
        0: 'Clear sky',
        1: 'Mainly clear',
        2: 'Partly cloudy',
        3: 'Overcast',
        45: 'Fog',
        48: 'Depositing rime fog',
        51: 'Light drizzle',
        53: 'Moderate drizzle',
        55: 'Dense drizzle',
        61: 'Slight rain',
        63: 'Moderate rain',
        65: 'Heavy rain',
        71: 'Slight snow',
        73: 'Moderate snow',
        75: 'Heavy snow',
        80: 'Rain showers',
        81: 'Moderate rain showers',
        82: 'Violent rain showers',
        95: 'Thunderstorm',
    }
    return mapping.get(code, 'Partly cloudy')


def get_open_meteo_weather(location):
    """
    Get real weather data from Open-Meteo (no API key required).
    Returns normalized response dict or None if lookup fails.
    """
    try:
        geo_response = requests.get(
            OPEN_METEO_GEOCODE_URL,
            params={'name': location, 'count': 1, 'language': 'en', 'format': 'json'},
            timeout=10,
        )
        if geo_response.status_code != 200:
            return None
        geo_data = geo_response.json()
        results = geo_data.get('results') or []
        if not results:
            return None

        place = results[0]
        latitude = place.get('latitude')
        longitude = place.get('longitude')
        resolved_location = ", ".join(
            [p for p in [place.get('name'), place.get('admin1'), place.get('country')] if p]
        ) or location

        forecast_response = requests.get(
            OPEN_METEO_FORECAST_URL,
            params={
                'latitude': latitude,
                'longitude': longitude,
                'current': 'temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code',
                'hourly': 'precipitation_probability,relative_humidity_2m,temperature_2m',
                'timezone': 'auto',
                'forecast_days': 2,
            },
            timeout=10,
        )
        if forecast_response.status_code != 200:
            return None
        forecast_data = forecast_response.json()

        current = forecast_data.get('current', {})
        hourly = forecast_data.get('hourly', {})
        precip_list = hourly.get('precipitation_probability', []) or []
        temp_list = hourly.get('temperature_2m', []) or []
        humidity_list = hourly.get('relative_humidity_2m', []) or []

        # Use next 24 hourly entries as short-term forecast window
        next_24_precip = precip_list[:24] if len(precip_list) >= 24 else precip_list
        rain_chance = int(round(max(next_24_precip))) if next_24_precip else 0

        if rain_chance >= 60:
            rain_prediction = 'High chance of rain in next 24 hours'
        elif rain_chance >= 30:
            rain_prediction = 'Moderate chance of rain in next 24 hours'
        else:
            rain_prediction = 'Low chance of rain in next 24 hours'

        # Approximate tomorrow values from 24h+ index if present
        tomorrow_temp = temp_list[24] if len(temp_list) > 24 else current.get('temperature_2m')
        tomorrow_humidity = humidity_list[24] if len(humidity_list) > 24 else current.get('relative_humidity_2m')

        temp = float(current.get('temperature_2m', 0))
        humidity = int(round(float(current.get('relative_humidity_2m', 0))))
        wind_speed = float(current.get('wind_speed_10m', 0))  # km/h from Open-Meteo
        description = map_open_meteo_weather_code(current.get('weather_code', 2))

        advice = generate_agricultural_advice(temp, humidity, rain_prediction, wind_speed)

        return {
            'location': resolved_location,
            'temperature': round(temp, 1),
            'humidity': humidity,
            'description': description,
            'wind_speed': round(wind_speed, 1),
            'wind_speed_unit': 'km/h',
            'rain_prediction': rain_prediction,
            'advice': advice,
            'forecast': {
                'tomorrow': {
                    'temperature': round(float(tomorrow_temp), 1) if tomorrow_temp is not None else round(temp, 1),
                    'humidity': int(round(float(tomorrow_humidity))) if tomorrow_humidity is not None else humidity,
                    'rain_chance': rain_chance,
                }
            },
            'source': 'open-meteo',
        }
    except requests.exceptions.RequestException:
        return None
    except Exception:
        return None


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_weather(request, location):
    """Get weather forecast for a location."""
    if not location:
        return Response({
            'error': 'Location parameter is required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Get current weather
        current_url = f'{OPENWEATHER_BASE_URL}/weather'
        current_params = {
            'q': location,
            'appid': OPENWEATHER_API_KEY,
            'units': 'metric'
        }
        
        current_response = requests.get(current_url, params=current_params, timeout=10)
        
        if current_response.status_code != 200:
            # Prefer real fallback data from Open-Meteo when OpenWeather fails.
            open_meteo_data = get_open_meteo_weather(location)
            if open_meteo_data:
                note = 'Real weather data provided by Open-Meteo fallback.'
                if OPENWEATHER_API_KEY and OPENWEATHER_API_KEY != 'your_api_key_here' and current_response.status_code == 401:
                    note = 'OpenWeather API key invalid; using real Open-Meteo fallback data.'
                elif current_response.status_code == 429:
                    note = 'OpenWeather rate-limited; using real Open-Meteo fallback data.'
                open_meteo_data['note'] = note
                return Response(open_meteo_data, status=status.HTTP_200_OK)

            # Last-resort sample response (still include wind_speed so UI remains complete)
            fallback_note = 'Using sample data because weather providers were unavailable.'
            return Response({
                'location': location,
                'temperature': 25,
                'humidity': 65,
                'description': 'Partly cloudy',
                'wind_speed': 8.3,
                'wind_speed_unit': 'km/h',
                'rain_prediction': 'Low chance of rain tomorrow',
                'advice': 'Good weather for field work. Monitor for any sudden changes.',
                'forecast': {
                    'tomorrow': {
                        'temperature': 26,
                        'humidity': 70,
                        'rain_chance': 20
                    }
                },
                'note': fallback_note,
                'source': 'sample'
            }, status=status.HTTP_200_OK)
        
        current_data = current_response.json()
        
        # Get forecast (5-day)
        forecast_url = f'{OPENWEATHER_BASE_URL}/forecast'
        forecast_params = {
            'q': location,
            'appid': OPENWEATHER_API_KEY,
            'units': 'metric'
        }
        
        forecast_response = requests.get(forecast_url, params=forecast_params, timeout=10)
        forecast_data = forecast_response.json() if forecast_response.status_code == 200 else None
        
        # Extract current weather info
        temp = current_data['main']['temp']
        humidity = current_data['main']['humidity']
        description = current_data['weather'][0]['description']
        # OpenWeather wind speed is m/s; convert to km/h for user-friendly display
        wind_speed_mps = float(current_data.get('wind', {}).get('speed', 0))
        wind_speed = wind_speed_mps * 3.6
        
        # Analyze forecast for rain prediction
        rain_prediction = 'Low chance of rain'
        rain_advice = 'Good weather for field work.'
        
        if forecast_data:
            # Check next 24 hours for rain
            tomorrow_forecast = None
            for item in forecast_data.get('list', [])[:8]:  # Next 24 hours (3-hour intervals)
                if 'rain' in item.get('weather', [{}])[0].get('main', '').lower() or \
                   item.get('weather', [{}])[0].get('description', '').lower().find('rain') != -1:
                    rain_prediction = 'Rain expected in next 24 hours'
                    rain_advice = 'Avoid spraying pesticides. Postpone field work if possible.'
                    tomorrow_forecast = {
                        'temperature': item['main']['temp'],
                        'humidity': item['main']['humidity'],
                        'rain_chance': item.get('pop', 0) * 100 if 'pop' in item else 50
                    }
                    break
            
            if not tomorrow_forecast and len(forecast_data.get('list', [])) > 0:
                tomorrow_forecast = {
                    'temperature': forecast_data['list'][0]['main']['temp'],
                    'humidity': forecast_data['list'][0]['main']['humidity'],
                    'rain_chance': forecast_data['list'][0].get('pop', 0) * 100 if 'pop' in forecast_data['list'][0] else 0
                }
        else:
            tomorrow_forecast = {
                'temperature': temp + 2,
                'humidity': humidity + 5,
                'rain_chance': 0
            }
        
        # Generate agricultural advice
        advice = generate_agricultural_advice(temp, humidity, rain_prediction, wind_speed)
        
        return Response({
            'location': location,
            'temperature': round(temp, 1),
            'humidity': humidity,
            'description': description.title(),
            'wind_speed': round(wind_speed, 1),
            'wind_speed_unit': 'km/h',
            'rain_prediction': rain_prediction,
            'advice': advice,
            'forecast': {
                'tomorrow': tomorrow_forecast
            },
            'source': 'openweathermap'
        }, status=status.HTTP_200_OK)
    
    except requests.exceptions.RequestException as e:
        return Response({
            'error': f'Weather service unavailable: {str(e)}',
            'location': location,
            'note': 'Service temporarily unavailable. Please try again later.'
        }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def generate_agricultural_advice(temperature, humidity, rain_prediction, wind_speed):
    """Generate agricultural advice based on weather conditions."""
    advice_parts = []
    
    # Temperature advice
    if temperature < 10:
        advice_parts.append("Cold weather - protect sensitive crops with covers.")
    elif temperature > 35:
        advice_parts.append("Hot weather - ensure adequate irrigation and shade for sensitive plants.")
    else:
        advice_parts.append("Good temperature for most crops.")
    
    # Humidity advice
    if humidity > 80:
        advice_parts.append("High humidity - watch for fungal diseases, ensure good air circulation.")
    elif humidity < 40:
        advice_parts.append("Low humidity - increase irrigation frequency.")
    
    # Rain advice
    if 'rain' in rain_prediction.lower():
        advice_parts.append("Rain expected - avoid spraying pesticides, postpone field work if possible.")
    else:
        advice_parts.append("No rain expected - good time for field work and spraying.")
    
    # Wind advice (wind_speed expected in km/h)
    if wind_speed > 25:
        advice_parts.append("Strong winds - avoid spraying, protect young plants.")
    
    return " ".join(advice_parts) if advice_parts else "Monitor weather conditions regularly."









