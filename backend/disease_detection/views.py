import json
import os
from pathlib import Path
from django.conf import settings
from django.http import JsonResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from .infer import DiseaseDetector


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def detect_disease(request):
    """Detect plant disease from uploaded image."""
    if 'image' not in request.FILES:
        return Response({'error': 'No image provided'}, status=status.HTTP_400_BAD_REQUEST)
    
    image_file = request.FILES['image']
    
    # Save uploaded image temporarily
    file_name = default_storage.save(f'temp_{image_file.name}', ContentFile(image_file.read()))
    file_path = default_storage.path(file_name)
    
    try:
        # Load model and label map
        model_path = settings.MODELS_DIR / 'disease_detector.onnx'
        label_map_path = settings.MODELS_DIR / 'label_map.json'
        
        if not model_path.exists() or not label_map_path.exists():
            return Response({
                'error': 'Model not found. Please train the model first.'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Initialize detector
        detector = DiseaseDetector(model_path, label_map_path)
        
        # Predict
        result = detector.predict(file_path)
        
        # Load disease treatments
        treatments_path = settings.MODELS_DIR / 'disease_treatments.json'
        treatments = {}
        if treatments_path.exists():
            with open(treatments_path, 'r') as f:
                treatments = json.load(f)
        
        # Add treatment information
        predicted_class = result['predicted_class']
        treatment = treatments.get(predicted_class, {
            'general': 'Consult with agricultural experts for specific treatment recommendations.',
            'prevention': 'Maintain good crop hygiene and monitor regularly.'
        })
        
        result['treatment'] = treatment
        
        return Response(result, status=status.HTTP_200_OK)
    
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    finally:
        # Clean up temporary file
        if default_storage.exists(file_name):
            default_storage.delete(file_name)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def train_model(request):
    """Trigger model training (admin only)."""
    from django.contrib.auth import get_user_model
    User = get_user_model()
    
    if not request.user.is_staff:
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        from .train import train_model as train
        
        dataset_dir = settings.DATASET_DIR
        model_dir = settings.MODELS_DIR
        
        if not dataset_dir.exists():
            return Response({
                'error': 'Dataset directory not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Train model
        model, test_acc = train(
            str(dataset_dir),
            str(model_dir),
            epochs=request.data.get('epochs', 10),
            batch_size=request.data.get('batch_size', 32)
        )
        
        return Response({
            'message': 'Model trained successfully',
            'test_accuracy': f'{test_acc:.2f}%'
        }, status=status.HTTP_200_OK)
    
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
