import os
import json
from pathlib import Path
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
import chromadb
from sentence_transformers import SentenceTransformer
from django.conf import settings


# Initialize ChromaDB client
chroma_client = chromadb.Client()
collection_name = "agricultural_advisory"

# Initialize sentence transformer model
try:
    embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
except:
    embedding_model = None


def get_or_create_collection():
    """Get or create ChromaDB collection."""
    try:
        collection = chroma_client.get_or_create_collection(name=collection_name)
        return collection
    except:
        return None


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def ingest_documents(request):
    """Ingest agricultural PDFs or text documents into the vector database."""
    if not embedding_model:
        return Response({
            'error': 'Embedding model not initialized'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    collection = get_or_create_collection()
    if not collection:
        return Response({
            'error': 'Failed to initialize vector database'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    # For now, accept text content directly
    # In production, you'd parse PDFs here
    text_content = request.data.get('content', '')
    document_id = request.data.get('id', f'doc_{len(collection.get()["ids"])}')
    
    if not text_content:
        return Response({
            'error': 'No content provided'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Generate embedding
        embedding = embedding_model.encode(text_content).tolist()
        
        # Add to collection
        collection.add(
            ids=[document_id],
            embeddings=[embedding],
            documents=[text_content],
            metadatas=[{'source': request.data.get('source', 'manual')}]
        )
        
        return Response({
            'message': 'Document ingested successfully',
            'id': document_id
        }, status=status.HTTP_201_CREATED)
    
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def search_advisory(request):
    """Search for agricultural advisory using RAG."""
    if not embedding_model:
        return Response({
            'error': 'Embedding model not initialized'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    collection = get_or_create_collection()
    if not collection:
        return Response({
            'error': 'Vector database not initialized'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    query = request.data.get('query', '')
    if not query:
        return Response({
            'error': 'No query provided'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Check if collection is empty, auto-initialize if needed
        existing_count = len(collection.get()['ids'])
        if existing_count == 0:
            # Auto-initialize with default knowledge
            from .views import initialize_default_knowledge
            # We'll initialize inline to avoid circular import
            default_knowledge = [
                {'id': 'crop_rotation_1', 'content': 'Crop rotation is essential for maintaining soil health. Rotate crops every season to prevent disease buildup and nutrient depletion. Common rotations include: legumes → grains → root crops.', 'source': 'agricultural_best_practices'},
                {'id': 'irrigation_1', 'content': 'Proper irrigation is crucial for crop health. Water early in the morning to reduce evaporation. Use drip irrigation for water efficiency. Avoid overwatering which can lead to root rot. Most vegetables need 1-2 inches of water per week.', 'source': 'irrigation_guide'},
                {'id': 'fertilization_1', 'content': 'Apply fertilizers based on soil test results. Use organic compost to improve soil structure. Apply nitrogen fertilizers during active growth periods. Avoid over-fertilization which can burn plants.', 'source': 'fertilization_guide'},
                {'id': 'pest_management_1', 'content': 'Integrated Pest Management (IPM) combines biological, cultural, and chemical methods. Monitor crops regularly for pests. Use beneficial insects when possible. Apply pesticides only when necessary.', 'source': 'pest_management'},
                {'id': 'soil_health_1', 'content': 'Healthy soil is the foundation of good crops. Test soil pH regularly (most crops prefer 6.0-7.0). Add organic matter through compost. Practice no-till farming to preserve soil structure.', 'source': 'soil_management'},
                {'id': 'disease_prevention_1', 'content': 'Prevent plant diseases by using disease-resistant varieties, proper spacing for air circulation, crop rotation, removing infected plant material, and avoiding overhead watering that wets leaves.', 'source': 'disease_management'},
            ]
            embeddings = embedding_model.encode([item['content'] for item in default_knowledge]).tolist()
            collection.add(
                ids=[item['id'] for item in default_knowledge],
                embeddings=embeddings,
                documents=[item['content'] for item in default_knowledge],
                metadatas=[{'source': item['source']} for item in default_knowledge]
            )
        
        # Generate query embedding
        query_embedding = embedding_model.encode(query).tolist()
        
        # Search in collection
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=min(request.data.get('top_k', 3), 5)
        )
        
        # Format results
        documents = results.get('documents', [])
        if documents and len(documents) > 0:
            retrieved_docs = documents[0]
        else:
            retrieved_docs = []
        
        return Response({
            'query': query,
            'results': retrieved_docs,
            'count': len(retrieved_docs)
        }, status=status.HTTP_200_OK)
    
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def initialize_default_knowledge(request):
    """Initialize the RAG system with default agricultural knowledge."""
    if not embedding_model:
        return Response({
            'error': 'Embedding model not initialized'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    collection = get_or_create_collection()
    if not collection:
        return Response({
            'error': 'Failed to initialize vector database'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    # Check if collection already has data
    existing_count = len(collection.get()['ids'])
    if existing_count > 0:
        return Response({
            'message': f'Knowledge base already initialized with {existing_count} documents',
            'count': existing_count
        }, status=status.HTTP_200_OK)
    
    # Default agricultural knowledge base - expanded
    default_knowledge = [
        {
            'id': 'crop_rotation_1',
            'content': 'Crop rotation is essential for maintaining soil health. Rotate crops every season to prevent disease buildup and nutrient depletion. Common rotations include: legumes → grains → root crops. For example, plant beans one season, then corn, then potatoes.',
            'source': 'agricultural_best_practices'
        },
        {
            'id': 'irrigation_1',
            'content': 'Proper irrigation is crucial for crop health. Water early in the morning to reduce evaporation. Use drip irrigation for water efficiency. Avoid overwatering which can lead to root rot. Most vegetables need 1-2 inches of water per week.',
            'source': 'irrigation_guide'
        },
        {
            'id': 'irrigation_2',
            'content': 'Signs of overwatering include yellowing leaves, wilting despite wet soil, and root rot. Signs of underwatering include dry, brittle leaves and stunted growth. Check soil moisture by inserting your finger 2-3 inches into the soil.',
            'source': 'irrigation_guide'
        },
        {
            'id': 'fertilization_1',
            'content': 'Apply fertilizers based on soil test results. Use organic compost to improve soil structure. Apply nitrogen fertilizers during active growth periods. Avoid over-fertilization which can burn plants. Common NPK ratios: 10-10-10 for general use, 5-10-10 for root crops.',
            'source': 'fertilization_guide'
        },
        {
            'id': 'fertilization_2',
            'content': 'Organic fertilizers like compost, manure, and bone meal release nutrients slowly. Chemical fertilizers work faster but can burn plants if overused. Always follow package instructions and water after applying fertilizers.',
            'source': 'fertilization_guide'
        },
        {
            'id': 'pest_management_1',
            'content': 'Integrated Pest Management (IPM) combines biological, cultural, and chemical methods. Monitor crops regularly for pests. Use beneficial insects when possible. Apply pesticides only when necessary and follow label instructions. Neem oil is an effective organic pesticide.',
            'source': 'pest_management'
        },
        {
            'id': 'pest_management_2',
            'content': 'Common garden pests include aphids, spider mites, whiteflies, and caterpillars. Natural predators like ladybugs and lacewings can help control pests. Remove heavily infested leaves. Use insecticidal soap for soft-bodied insects.',
            'source': 'pest_management'
        },
        {
            'id': 'soil_health_1',
            'content': 'Healthy soil is the foundation of good crops. Test soil pH regularly (most crops prefer 6.0-7.0). Add organic matter through compost. Practice no-till farming to preserve soil structure. Well-draining soil prevents root diseases.',
            'source': 'soil_management'
        },
        {
            'id': 'soil_health_2',
            'content': 'Improve clay soil by adding sand and organic matter. Improve sandy soil by adding compost and clay. Soil should be loose and crumbly, not compacted. Mulching helps retain moisture and suppress weeds.',
            'source': 'soil_management'
        },
        {
            'id': 'seasonal_planting_1',
            'content': 'Plant crops according to their season. Cool-season crops (lettuce, broccoli, carrots, spinach) grow best in spring and fall when temperatures are 60-70°F. Warm-season crops (tomatoes, peppers, corn, beans) need summer heat above 70°F. Check local planting calendars for your region.',
            'source': 'seasonal_guide'
        },
        {
            'id': 'seasonal_planting_2',
            'content': 'Start seeds indoors 6-8 weeks before last frost for warm-season crops. Harden off seedlings by gradually exposing them to outdoor conditions. Plant after danger of frost has passed. Use row covers to protect early plantings.',
            'source': 'seasonal_guide'
        },
        {
            'id': 'disease_prevention_1',
            'content': 'Prevent plant diseases by using disease-resistant varieties, proper spacing for air circulation, crop rotation, removing infected plant material, and avoiding overhead watering that wets leaves. Water at the base of plants.',
            'source': 'disease_management'
        },
        {
            'id': 'disease_prevention_2',
            'content': 'Common plant diseases include blight, powdery mildew, rust, and leaf spot. Early detection is key. Remove and destroy infected plant parts immediately. Use fungicides preventatively for susceptible crops. Copper-based fungicides are effective for many fungal diseases.',
            'source': 'disease_management'
        },
        {
            'id': 'harvesting_1',
            'content': 'Harvest crops at their peak maturity. Most vegetables are best harvested in the morning when temperatures are cool. Handle produce gently to avoid bruising. Store properly to maintain quality. Tomatoes should be firm but yield slightly to pressure.',
            'source': 'harvesting_guide'
        },
        {
            'id': 'harvesting_2',
            'content': 'Leafy greens should be harvested when leaves are young and tender. Root crops are ready when roots reach desired size. Fruits like tomatoes and peppers should be fully colored. Regular harvesting encourages more production.',
            'source': 'harvesting_guide'
        },
        {
            'id': 'tomato_care_1',
            'content': 'Tomatoes need full sun (6-8 hours daily), well-draining soil, and consistent watering. Stake or cage plants for support. Remove suckers (side shoots) for better fruit production. Watch for signs of blight, especially in humid conditions.',
            'source': 'crop_specific'
        },
        {
            'id': 'potato_care_1',
            'content': 'Potatoes grow best in loose, well-drained soil with pH 5.0-6.0. Plant seed potatoes 3-4 inches deep, 12 inches apart. Hill soil around plants as they grow. Harvest when foliage dies back. Store in cool, dark, dry place.',
            'source': 'crop_specific'
        },
        {
            'id': 'pepper_care_1',
            'content': 'Peppers need warm temperatures (70-85°F), full sun, and consistent moisture. Start seeds indoors 8-10 weeks before transplanting. Space plants 18-24 inches apart. Harvest when peppers reach desired size and color.',
            'source': 'crop_specific'
        },
        {
            'id': 'composting_1',
            'content': 'Composting improves soil fertility and structure. Use a mix of green materials (kitchen scraps, grass clippings) and brown materials (leaves, straw). Turn compost regularly to aerate. Finished compost should be dark, crumbly, and earthy-smelling.',
            'source': 'soil_management'
        },
        {
            'id': 'spacing_1',
            'content': 'Proper plant spacing prevents disease spread and competition. Tomatoes need 24-36 inches between plants. Peppers need 18-24 inches. Leafy greens can be closer at 6-12 inches. Check seed packets for specific spacing requirements.',
            'source': 'planting_guide'
        }
    ]
    
    try:
        # Generate embeddings in batches to avoid memory issues
        batch_size = 10
        all_ids = []
        all_embeddings = []
        all_documents = []
        all_metadatas = []
        
        for i in range(0, len(default_knowledge), batch_size):
            batch = default_knowledge[i:i+batch_size]
            batch_embeddings = embedding_model.encode([item['content'] for item in batch]).tolist()
            
            all_ids.extend([item['id'] for item in batch])
            all_embeddings.extend(batch_embeddings)
            all_documents.extend([item['content'] for item in batch])
            all_metadatas.extend([{'source': item['source']} for item in batch])
        
        collection.add(
            ids=all_ids,
            embeddings=all_embeddings,
            documents=all_documents,
            metadatas=all_metadatas
        )
        
        return Response({
            'message': f'Initialized {len(default_knowledge)} knowledge documents',
            'count': len(default_knowledge)
        }, status=status.HTTP_201_CREATED)
    
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)







