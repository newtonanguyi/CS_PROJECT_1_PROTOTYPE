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
            # If API key is not set or invalid, return mock data
            if OPENWEATHER_API_KEY == 'your_api_key_here':
                return Response({
                    'location': location,
                    'temperature': 25,
                    'humidity': 65,
                    'description': 'Partly cloudy',
                    'rain_prediction': 'Low chance of rain tomorrow',
                    'advice': 'Good weather for field work. Monitor for any sudden changes.',
                    'forecast': {
                        'tomorrow': {
                            'temperature': 26,
                            'humidity': 70,
                            'rain_chance': 20
                        }
                    },
                    'note': 'Using mock data. Set OPENWEATHER_API_KEY in .env for real data.'
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    'error': f'Weather API error: {current_response.status_code}'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
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
        wind_speed = current_data.get('wind', {}).get('speed', 0)
        
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
            'rain_prediction': rain_prediction,
            'advice': advice,
            'forecast': {
                'tomorrow': tomorrow_forecast
            }
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
    
    # Wind advice
    if wind_speed > 15:
        advice_parts.append("Strong winds - avoid spraying, protect young plants.")
    
    return " ".join(advice_parts) if advice_parts else "Monitor weather conditions regularly."




