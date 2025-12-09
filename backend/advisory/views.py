import json
import requests
from datetime import datetime
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
from pathlib import Path


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def get_ai_advisory(request):
    """Get comprehensive AI advisory combining weather, disease, and RAG knowledge."""
    user_location = request.user.location or request.data.get('location', '')
    crop_type = request.data.get('crop_type', '')
    detected_disease = request.data.get('detected_disease', None)
    query = request.data.get('query', '')
    
    advisory = {
        'weather_advice': None,
        'disease_advice': None,
        'rag_advice': None,
        'seasonal_recommendations': None,
        'comprehensive_advice': ''
    }
    
    # Get weather advice
    if user_location:
        try:
            weather_response = requests.get(
                f'http://localhost:8000/api/weather/{user_location}/',
                headers={'Authorization': f'Bearer {request.auth}'},
                timeout=5
            )
            if weather_response.status_code == 200:
                weather_data = weather_response.json()
                advisory['weather_advice'] = {
                    'temperature': weather_data.get('temperature'),
                    'humidity': weather_data.get('humidity'),
                    'rain_prediction': weather_data.get('rain_prediction'),
                    'advice': weather_data.get('advice')
                }
        except:
            pass
    
    # Get disease advice
    if detected_disease:
        treatments_path = settings.MODELS_DIR / 'disease_treatments.json'
        if treatments_path.exists():
            with open(treatments_path, 'r') as f:
                treatments = json.load(f)
            
            treatment = treatments.get(detected_disease, treatments.get('default', {}))
            advisory['disease_advice'] = {
                'disease': detected_disease,
                'treatment': treatment.get('general', ''),
                'prevention': treatment.get('prevention', ''),
                'organic': treatment.get('organic', '')
            }
    
    # Get RAG advice
    if query or crop_type:
        search_query = query or f"Best practices for growing {crop_type}"
        try:
            rag_response = requests.post(
                'http://localhost:8000/api/rag/search/',
                json={'query': search_query, 'top_k': 3},
                headers={'Authorization': f'Bearer {request.auth}'},
                timeout=5
            )
            if rag_response.status_code == 200:
                rag_data = rag_response.json()
                advisory['rag_advice'] = {
                    'query': search_query,
                    'results': rag_data.get('results', [])
                }
        except:
            pass
    
    # Generate seasonal recommendations
    from datetime import datetime
    current_month = datetime.now().month
    
    seasonal_recommendations = get_seasonal_recommendations(current_month, user_location)
    advisory['seasonal_recommendations'] = seasonal_recommendations
    
    # Compile comprehensive advice
    comprehensive_parts = []
    
    if advisory['weather_advice']:
        comprehensive_parts.append(f"Weather: {advisory['weather_advice']['advice']}")
    
    if advisory['disease_advice']:
        comprehensive_parts.append(f"Disease Management: {advisory['disease_advice']['treatment']}")
    
    if advisory['rag_advice'] and advisory['rag_advice']['results']:
        comprehensive_parts.append(f"Best Practices: {advisory['rag_advice']['results'][0]}")
    
    if seasonal_recommendations:
        comprehensive_parts.append(f"Seasonal: {seasonal_recommendations.get('recommendation', '')}")
    
    advisory['comprehensive_advice'] = " ".join(comprehensive_parts) if comprehensive_parts else "Continue monitoring your crops regularly and maintain good agricultural practices."
    
    return Response(advisory, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_seasonal_guide(request):
    """Get seasonal planting and management guide."""
    month = int(request.query_params.get('month', datetime.now().month))
    location = request.user.location or request.query_params.get('location', '')
    
    recommendations = get_seasonal_recommendations(month, location)
    
    return Response(recommendations, status=status.HTTP_200_OK)


def get_seasonal_recommendations(month, location=''):
    """Get seasonal recommendations based on month."""
    
    # Northern hemisphere seasons (adjust for southern if needed)
    if month in [12, 1, 2]:  # Winter
        return {
            'season': 'Winter',
            'recommendation': 'Focus on planning, soil preparation, and greenhouse crops. Protect sensitive plants from frost.',
            'suitable_crops': ['Lettuce', 'Spinach', 'Carrots', 'Cabbage', 'Broccoli'],
            'activities': ['Soil testing', 'Planning next season', 'Greenhouse maintenance', 'Tool maintenance']
        }
    elif month in [3, 4, 5]:  # Spring
        return {
            'season': 'Spring',
            'recommendation': 'Ideal time for planting most crops. Prepare soil, start seedlings, and begin main planting season.',
            'suitable_crops': ['Tomatoes', 'Peppers', 'Corn', 'Beans', 'Squash', 'Cucumbers'],
            'activities': ['Soil preparation', 'Planting', 'Fertilization', 'Irrigation setup']
        }
    elif month in [6, 7, 8]:  # Summer
        return {
            'season': 'Summer',
            'recommendation': 'Maintain irrigation, monitor for pests and diseases, and harvest early crops. Provide shade for sensitive plants.',
            'suitable_crops': ['Tomatoes', 'Peppers', 'Corn', 'Okra', 'Eggplant'],
            'activities': ['Regular watering', 'Pest monitoring', 'Disease control', 'Harvesting']
        }
    else:  # Fall (9, 10, 11)
        return {
            'season': 'Fall',
            'recommendation': 'Harvest season. Plant cool-season crops. Prepare for winter. Collect seeds for next year.',
            'suitable_crops': ['Lettuce', 'Spinach', 'Radishes', 'Carrots', 'Beets'],
            'activities': ['Harvesting', 'Planting cool-season crops', 'Soil preparation', 'Composting']
        }


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def chat_advisory(request):
    """AI chat advisory endpoint that combines all modules."""
    user_message = request.data.get('message', '').strip()
    user_location = request.user.location or request.data.get('location', '')
    
    if not user_message:
        return Response({
            'error': 'Message is required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Initialize response parts
    response_parts = []
    query_lower = user_message.lower()
    
    # Handle conversational/greeting messages
    greeting_words = ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening', 'greetings']
    thanks_words = ['thank', 'thanks', 'appreciate', 'grateful', 'helpful']
    goodbye_words = ['bye', 'goodbye', 'see you', 'farewell', 'later']
    yes_words = ['yes', 'yeah', 'yep', 'sure', 'ok', 'okay', 'alright', 'correct']
    no_words = ['no', 'nope', 'not', "don't", "doesn't", "isn't", "aren't"]
    
    # Handle greetings
    if any(word in query_lower for word in greeting_words):
        response_parts.append("Hello! I'm your AI agricultural advisor. I'm here to help you with farming questions, crop management, disease detection, weather advice, and more. How can I assist you today?")
        return Response({
            'message': user_message,
            'response': response_parts[0],
            'timestamp': datetime.now().isoformat()
        }, status=status.HTTP_200_OK)
    
    # Handle thank you messages
    if any(word in query_lower for word in thanks_words):
        responses = [
            "You're very welcome! I'm glad I could help. Feel free to ask if you have any other farming questions.",
            "You're welcome! Happy to assist with your agricultural needs. Don't hesitate to reach out if you need more advice.",
            "My pleasure! I'm here whenever you need agricultural guidance. Good luck with your farming!",
            "You're welcome! Wishing you a successful harvest. Let me know if you have any other questions."
        ]
        import random
        return Response({
            'message': user_message,
            'response': random.choice(responses),
            'timestamp': datetime.now().isoformat()
        }, status=status.HTTP_200_OK)
    
    # Handle goodbye messages
    if any(word in query_lower for word in goodbye_words):
        return Response({
            'message': user_message,
            'response': "Goodbye! Take care of your crops and feel free to come back anytime you need agricultural advice. Happy farming!",
            'timestamp': datetime.now().isoformat()
        }, status=status.HTTP_200_OK)
    
    # Handle simple yes/no responses
    if len(query_lower.split()) <= 3 and any(word in query_lower for word in yes_words):
        return Response({
            'message': user_message,
            'response': "Great! Is there anything specific about farming or crop management you'd like to know more about?",
            'timestamp': datetime.now().isoformat()
        }, status=status.HTTP_200_OK)
    
    if len(query_lower.split()) <= 3 and any(word in query_lower for word in no_words):
        return Response({
            'message': user_message,
            'response': "I understand. If you have any questions about farming, crops, diseases, weather, or agricultural practices, I'm here to help!",
            'timestamp': datetime.now().isoformat()
        }, status=status.HTTP_200_OK)
    
    # Use RAG to search for relevant information
    rag_results = []
    try:
        # First, try to initialize knowledge base if empty
        try:
            init_response = requests.get(
                'http://localhost:8000/api/rag/initialize/',
                headers={'Authorization': f'Bearer {request.auth}'},
                timeout=3
            )
        except:
            pass
        
        # Then search
        rag_response = requests.post(
            'http://localhost:8000/api/rag/search/',
            json={'query': user_message, 'top_k': 3},
            headers={'Authorization': f'Bearer {request.auth}'},
            timeout=5
        )
        if rag_response and rag_response.status_code == 200:
            rag_data = rag_response.json()
            rag_results = rag_data.get('results', [])
    except Exception as e:
        print(f"RAG search error: {e}")
    
    # Generate contextual response based on query type
    
    # Check query type and generate appropriate response
    if any(word in query_lower for word in ['disease', 'sick', 'infected', 'problem', 'issue', 'wrong', 'yellow', 'brown', 'spot', 'mold', 'blight', 'wilt']):
        # Disease-related query
        if rag_results:
            response_parts.append(f"Regarding your question about plant diseases:\n\n{rag_results[0]}")
            if len(rag_results) > 1:
                response_parts.append(f"\n\nAdditional advice:\n{rag_results[1]}")
        else:
            response_parts.append("For plant disease issues, I recommend:\n\n• Remove infected plant parts immediately to prevent spread\n• Apply appropriate fungicides or pesticides as needed\n• Ensure good air circulation by proper spacing\n• Avoid overhead watering that wets leaves\n• Use disease-resistant varieties when possible\n• Practice crop rotation to prevent disease buildup\n\nYou can also use the Disease Detection feature to upload an image and get an AI-powered diagnosis!")
    
    elif any(word in query_lower for word in ['water', 'irrigation', 'watering', 'moisture', 'dry', 'thirsty', 'dehydrated']):
        # Water/irrigation query
        if rag_results:
            response_parts.append(f"About irrigation and watering:\n\n{rag_results[0]}")
            if len(rag_results) > 1 and 'irrigation' in rag_results[1].lower():
                response_parts.append(f"\n\nMore tips:\n{rag_results[1]}")
        else:
            response_parts.append("Watering best practices:\n\n• Water early in the morning (before 10 AM) to reduce evaporation\n• Use drip irrigation or soaker hoses for efficiency\n• Water at the base of plants, not overhead\n• Check soil moisture by inserting finger 2-3 inches deep\n• Most vegetables need 1-2 inches of water per week\n• Avoid overwatering which can cause root rot\n• Mulch around plants to retain moisture")
    
    elif any(word in query_lower for word in ['fertilizer', 'fertilize', 'nutrient', 'feed', 'fertilizer', 'npk', 'compost']):
        # Fertilizer query
        if rag_results:
            response_parts.append(f"Regarding fertilization:\n\n{rag_results[0]}")
            if len(rag_results) > 1 and any(word in rag_results[1].lower() for word in ['fertil', 'nutrient', 'compost']):
                response_parts.append(f"\n\nAdditional information:\n{rag_results[1]}")
        else:
            response_parts.append("Fertilization tips:\n\n• Test your soil first to determine specific nutrient needs\n• Use organic compost to improve soil structure naturally\n• Apply fertilizers during active growth periods\n• Common NPK ratios: 10-10-10 for general use, 5-10-10 for root crops\n• Avoid over-fertilization which can burn plant roots\n• Water after applying fertilizers to help absorption\n• Organic options: compost, manure, bone meal (slow release)\n• Chemical fertilizers work faster but use carefully")
    
    elif any(word in query_lower for word in ['plant', 'grow', 'planting', 'seed', 'sow', 'transplant', 'seedling']):
        # Planting query
        if rag_results:
            response_parts.append(f"About planting:\n\n{rag_results[0]}")
            if len(rag_results) > 1 and any(word in rag_results[1].lower() for word in ['plant', 'seed', 'grow']):
                response_parts.append(f"\n\nMore planting tips:\n{rag_results[1]}")
        else:
            response_parts.append("Planting guidance:\n\n• Prepare soil well before planting (loosen, add compost)\n• Plant at the right depth (usually 2-3 times seed size)\n• Follow proper spacing guidelines for your crop\n• Choose the appropriate season (check Seasonal Guide)\n• Ensure good drainage to prevent waterlogging\n• Water thoroughly after planting\n• Start seeds indoors 6-8 weeks before last frost for warm-season crops\n• Harden off seedlings before transplanting outdoors")
    
    elif any(word in query_lower for word in ['pest', 'insect', 'bug', 'aphid', 'mite', 'caterpillar', 'worm', 'infestation']):
        # Pest query
        if rag_results:
            response_parts.append(f"Regarding pest management:\n\n{rag_results[0]}")
            if len(rag_results) > 1 and 'pest' in rag_results[1].lower():
                response_parts.append(f"\n\nMore pest control tips:\n{rag_results[1]}")
        else:
            response_parts.append("Pest management:\n\n• Monitor crops regularly for early pest detection\n• Use Integrated Pest Management (IPM) approach\n• Introduce beneficial insects (ladybugs, lacewings)\n• Remove heavily infested leaves or plants\n• Use neem oil or insecticidal soap for organic control\n• Apply chemical pesticides only when necessary\n• Follow label instructions carefully and safely\n• Common pests: aphids, spider mites, whiteflies, caterpillars")
    
    elif any(word in query_lower for word in ['soil', 'dirt', 'ground', 'ph', 'clay', 'sandy', 'loam']):
        # Soil query
        if rag_results:
            response_parts.append(f"About soil management:\n\n{rag_results[0]}")
            if len(rag_results) > 1 and 'soil' in rag_results[1].lower():
                response_parts.append(f"\n\nMore soil tips:\n{rag_results[1]}")
        else:
            response_parts.append("Soil health tips:\n\n• Test soil pH regularly (most crops prefer 6.0-7.0)\n• Add organic matter through compost to improve structure\n• Practice crop rotation to maintain nutrients\n• Avoid soil compaction by not walking on beds\n• Maintain proper drainage (well-draining soil)\n• Improve clay soil: add sand and organic matter\n• Improve sandy soil: add compost and clay\n• Mulch to retain moisture and suppress weeds")
    
    elif any(word in query_lower for word in ['harvest', 'harvesting', 'pick', 'collect', 'ripe', 'mature', 'ready']):
        # Harvest query
        if rag_results:
            response_parts.append(f"Regarding harvesting:\n\n{rag_results[0]}")
            if len(rag_results) > 1 and 'harvest' in rag_results[1].lower():
                response_parts.append(f"\n\nMore harvesting tips:\n{rag_results[1]}")
        else:
            response_parts.append("Harvesting best practices:\n\n• Harvest at peak maturity for best flavor and nutrition\n• Pick in the morning when temperatures are cool\n• Handle produce gently to avoid bruising\n• Store properly to maintain quality (cool, dry place)\n• Use sharp, clean tools for clean cuts\n• Regular harvesting encourages more production\n• Tomatoes: firm but yield slightly to pressure\n• Leafy greens: harvest when young and tender\n• Root crops: ready when roots reach desired size")
    
    else:
        # General query - use RAG results or provide general advice
        if rag_results:
            response_parts.append(f"Based on your question:\n\n{rag_results[0]}")
            if len(rag_results) > 1:
                response_parts.append(f"\n\nAdditional information:\n{rag_results[1]}")
            if len(rag_results) > 2:
                response_parts.append(f"\n\nYou might also find this helpful:\n{rag_results[2]}")
        else:
            # Try to provide helpful general advice based on keywords
            if any(word in query_lower for word in ['tomato', 'tomatoes']):
                response_parts.append("Tomato growing tips:\n\n• Need full sun (6-8 hours daily) and well-draining soil\n• Stake or cage plants for support\n• Water consistently at the base\n• Remove suckers (side shoots) for better fruit production\n• Watch for blight, especially in humid conditions\n• Harvest when firm but slightly yielding to pressure")
            elif any(word in query_lower for word in ['potato', 'potatoes']):
                response_parts.append("Potato growing tips:\n\n• Grow in loose, well-drained soil (pH 5.0-6.0)\n• Plant seed potatoes 3-4 inches deep, 12 inches apart\n• Hill soil around plants as they grow\n• Keep soil consistently moist but not waterlogged\n• Harvest when foliage dies back\n• Store in cool, dark, dry place")
            elif any(word in query_lower for word in ['pepper', 'peppers']):
                response_parts.append("Pepper growing tips:\n\n• Need warm temperatures (70-85°F) and full sun\n• Start seeds indoors 8-10 weeks before transplanting\n• Space plants 18-24 inches apart\n• Keep soil consistently moist\n• Harvest when peppers reach desired size and color\n• Peppers are ready when they're firm and fully colored")
            else:
                response_parts.append("Here's some general agricultural advice:\n\n• Practice crop rotation to maintain soil health\n• Monitor your crops regularly for issues\n• Use appropriate spacing for good air circulation\n• Maintain proper irrigation and fertilization\n• Test soil pH and nutrients regularly\n• Use disease-resistant varieties when possible\n• Consult local agricultural extension services for region-specific advice\n\nFeel free to ask about specific crops, diseases, pests, or farming practices!")
    
    # Add weather context if location available
    weather_info = None
    if user_location:
        try:
            weather_response = requests.get(
                f'http://localhost:8000/api/weather/{user_location}/',
                headers={'Authorization': f'Bearer {request.auth}'},
                timeout=5
            )
            if weather_response.status_code == 200:
                weather_data = weather_response.json()
                weather_info = {
                    'temp': weather_data.get('temperature'),
                    'desc': weather_data.get('description'),
                    'advice': weather_data.get('advice')
                }
        except:
            pass
    
    # Combine response parts
    response_text = "\n".join(response_parts)
    
    # Add weather context at the end if available
    if weather_info:
        response_text += f"\n\n--- Weather Context for {user_location} ---\n"
        response_text += f"Current conditions: {weather_info['temp']}°C, {weather_info['desc']}\n"
        response_text += f"Weather advice: {weather_info['advice']}"
    
    # Add helpful closing (only for technical queries, not conversational)
    if not any(word in query_lower for word in ['thank', 'thanks', 'hello', 'hi', 'hey', 'bye', 'goodbye']):
        response_text += "\n\n💡 Tip: For more specific advice, you can mention your crop type, location, or upload images for disease detection!"
    
    return Response({
        'message': user_message,
        'response': response_text,
        'timestamp': datetime.now().isoformat()
    }, status=status.HTTP_200_OK)




