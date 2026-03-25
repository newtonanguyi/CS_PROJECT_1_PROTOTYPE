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
from PIL import Image
from .infer import DiseaseDetector

# Validation limits to avoid wrong diagnosis from random/invalid images
ALLOWED_IMAGE_TYPES = {'image/jpeg', 'image/jpg', 'image/png', 'image/webp'}
MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB
MIN_IMAGE_WIDTH = 50
MIN_IMAGE_HEIGHT = 50

# When the model cannot reliably identify the leaf (wrong crop, low confidence, etc.),
# we return this error and no result - so the UI shows only the message, no diagnosis.
UNRECOGNIZED_LEAF_ERROR = (
    "This image could not be identified with high confidence. It may be a leaf from an unsupported crop, "
    "an unclear image, or a disease that is not within our training dataset. "
    "Our system currently detects specific diseases on Tomato, Potato, and Pepper Bell leaves. "
    "Please verify the photo is clear, or consult a local agricultural expert for unfamiliar diseases or other crops."
)

SUPPORTED_CROPS = {
    'tomato': ['tomato'],
    'potato': ['potato'],
    'pepper': ['pepper', 'pepper__bell', 'pepper bell', 'bell pepper'],
}


def _normalize_crop_input(raw_crop):
    if not raw_crop:
        return None
    crop = str(raw_crop).strip().lower().replace('-', ' ')
    aliases = {
        'pepper bell': 'pepper',
        'bell pepper': 'pepper',
        'pepper_bell': 'pepper',
        'pepper__bell': 'pepper',
    }
    return aliases.get(crop, crop)


def _prediction_matches_selected_crop(raw_predicted_class, selected_crop_key):
    """Ensure predicted class family matches selected crop."""
    if not raw_predicted_class or not selected_crop_key:
        return False
    cls = str(raw_predicted_class).lower()
    expected_tokens = SUPPORTED_CROPS.get(selected_crop_key, [])
    return any(token in cls for token in expected_tokens)


def _best_class_for_selected_crop(class_probabilities, selected_crop_key):
    """
    From all class probabilities, pick the highest-confidence class that belongs
    to the selected crop family.
    Returns (class_name, confidence) or (None, 0.0).
    """
    if not class_probabilities or selected_crop_key not in SUPPORTED_CROPS:
        return None, 0.0
    expected_tokens = SUPPORTED_CROPS[selected_crop_key]
    best_class = None
    best_conf = 0.0
    for class_name, conf in class_probabilities.items():
        cls = str(class_name).lower()
        if any(token in cls for token in expected_tokens):
            c = float(conf)
            if c > best_conf:
                best_conf = c
                best_class = class_name
    return best_class, best_conf


def _validate_image_upload(image_file):
    """Validate file type, size, and basic image content. Returns (None, None) if OK, else (error_message, status_code)."""
    content_type = getattr(image_file, 'content_type', '') or ''
    if content_type.lower() not in ALLOWED_IMAGE_TYPES:
        return (
            'Invalid file type. Please upload a plant leaf image in JPEG, PNG, or WebP format.',
            status.HTTP_400_BAD_REQUEST,
        )
    if image_file.size > MAX_IMAGE_SIZE_BYTES:
        return (
            'Image is too large. Please upload an image smaller than 10 MB.',
            status.HTTP_400_BAD_REQUEST,
        )
    if image_file.size < 100:
        return (
            'File is too small to be a valid image. Please upload a clear leaf photo.',
            status.HTTP_400_BAD_REQUEST,
        )
    return None, None


def _validate_image_dimensions(file_path):
    """Ensure image can be opened and has minimum dimensions. Returns (None, None) if OK, else (error_message, status_code)."""
    try:
        with Image.open(file_path) as img:
            img.load()
            w, h = img.size
            if w < MIN_IMAGE_WIDTH or h < MIN_IMAGE_HEIGHT:
                return (
                    'Image resolution is too low. Please upload a clearer photo of the plant leaf (at least 50×50 pixels).',
                    status.HTTP_400_BAD_REQUEST,
                )
    except Exception:
        return (
            'Could not read image. Please upload a valid plant leaf image (JPEG, PNG, or WebP).',
            status.HTTP_400_BAD_REQUEST,
        )
    return None, None


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def disease_model_status(request):
    """
    Lightweight status endpoint to prove the system can receive real samples
    and is configured with the expected model assets.
    """
    model_path = settings.MODELS_DIR / 'disease_detector.onnx'
    label_map_path = settings.MODELS_DIR / 'label_map.json'
    treatments_path = settings.MODELS_DIR / 'disease_treatments.json'

    return Response(
        {
            'supported_crops': [
                {'key': 'tomato', 'label': 'Tomato'},
                {'key': 'potato', 'label': 'Potato'},
                {'key': 'pepper', 'label': 'Pepper Bell'},
            ],
            'accepts_uploads': True,
            'upload_constraints': {
                'allowed_content_types': sorted(list(ALLOWED_IMAGE_TYPES)),
                'max_size_bytes': MAX_IMAGE_SIZE_BYTES,
                'min_width_px': MIN_IMAGE_WIDTH,
                'min_height_px': MIN_IMAGE_HEIGHT,
            },
            'model_assets': {
                'onnx_model_present': model_path.exists(),
                'label_map_present': label_map_path.exists(),
                'treatments_present': treatments_path.exists(),
            },
        },
        status=status.HTTP_200_OK,
    )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def detect_disease(request):
    """Detect plant disease from uploaded image. Validates upload to reduce wrong diagnosis from random images."""
    if 'image' not in request.FILES:
        return Response({'error': 'No image provided'}, status=status.HTTP_400_BAD_REQUEST)

    selected_crop = _normalize_crop_input(request.data.get('crop'))
    if not selected_crop or selected_crop not in SUPPORTED_CROPS:
        return Response(
            {
                'error': 'Please select a supported crop before detection: Tomato, Potato, or Pepper Bell.'
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    image_file = request.FILES['image']
    err_msg, err_code = _validate_image_upload(image_file)
    if err_msg:
        return Response({'error': err_msg}, status=err_code)

    # Save uploaded image temporarily
    file_name = default_storage.save(f'temp_{image_file.name}', ContentFile(image_file.read()))
    file_path = default_storage.path(file_name)

    err_msg, err_code = _validate_image_dimensions(file_path)
    if err_msg:
        if default_storage.exists(file_name):
            default_storage.delete(file_name)
        return Response({'error': err_msg}, status=err_code)
    
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
        raw_predicted_class = result.get('raw_predicted_class', '')
        class_probabilities = result.get('class_probabilities', {})

        # Primary unknown gate:
        # keep strong protection, but allow a cautious result for borderline real-world images
        # when the selected crop and predicted crop family are consistent.
        if result.get('is_unknown'):
            raw_cls = result.get('raw_predicted_class', '')
            confidence = float(result.get('confidence', 0.0))
            entropy = float(result.get('entropy', 99.0))
            margin = float(result.get('margin', 0.0))
            crop_matches = _prediction_matches_selected_crop(raw_cls, selected_crop)

            allow_cautious_result = (
                crop_matches
                and confidence >= 0.35
                and entropy <= 2.80
            )

            if not allow_cautious_result:
                # Crop-conditioned fallback:
                # choose best class within selected crop family if there is enough signal.
                fallback_class, fallback_conf = _best_class_for_selected_crop(class_probabilities, selected_crop)
                if fallback_class and fallback_conf >= 0.20:
                    result['is_unknown'] = False
                    result['predicted_class'] = fallback_class
                    result['confidence'] = fallback_conf
                    result['warning'] = (
                        'Crop-conditioned fallback was used due low global confidence. '
                        'Result is likely for the selected crop but should be verified with a clearer close-up image.'
                    )
                else:
                    return Response(
                        {'error': UNRECOGNIZED_LEAF_ERROR},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

            # Convert borderline unknown into a cautious diagnosis with explicit warning.
            if result.get('is_unknown'):
                result['is_unknown'] = False
                result['predicted_class'] = raw_cls
                result['warning'] = (
                    'Low-confidence detection: this result is plausible but uncertain. '
                    'The disease may be outside our training dataset or the image might be unclear. '
                    'Use as guidance only and verify with an agricultural expert.'
                )

        # Strict crop gate: if selected crop does not match predicted class family,
        # reject and show no diagnosis.
        if not _prediction_matches_selected_crop(raw_predicted_class, selected_crop):
            # One more crop-conditioned attempt before hard reject.
            fallback_class, fallback_conf = _best_class_for_selected_crop(class_probabilities, selected_crop)
            if fallback_class and fallback_conf >= 0.25:
                result['predicted_class'] = fallback_class
                result['confidence'] = fallback_conf
                result['warning'] = (
                    'Prediction was adjusted to the selected crop family. The actual disease might be '
                    'outside the training dataset or the image was unclear. Please verify carefully.'
                )
            else:
                return Response(
                    {
                        'error': (
                            'No reliable diagnosis for the selected crop. '
                            'The uploaded leaf appears to be outside the supported disease classes '
                            'for the crop you selected. Please verify crop selection and upload a clear leaf image.'
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # Load disease treatments
        treatments_path = settings.MODELS_DIR / 'disease_treatments.json'
        treatments = {}
        if treatments_path.exists():
            with open(treatments_path, 'r') as f:
                treatments = json.load(f)

        # Add treatment information
        predicted_class = result.get('predicted_class')
        raw_predicted_class = result.get('raw_predicted_class', predicted_class)

        # Normalize class name for treatment lookup
        def normalize_class_name(class_name):
            """Normalize class name to match treatment JSON keys."""
            if not class_name:
                return None
            # Strategy: Replace double underscores with triple underscores
            # This handles cases like "Tomato__Target_Spot" -> "Tomato___Target_Spot"
            normalized = class_name.replace('__', '___')
            return normalized
        
        def find_treatment(class_name, treatments_dict):
            """Try multiple variations to find treatment."""
            if not class_name:
                return None
            
            # Try variations in order of likelihood
            variations = [
                normalize_class_name(class_name),  # Normalized version
                class_name,  # Original
                class_name.replace('_', '___'),  # All single underscores to triple
                class_name.replace('__', '___'),  # Double to triple
            ]
            
            # Also try with "Healthy" capitalization fix
            if 'healthy' in class_name.lower():
                variations.extend([
                    class_name.replace('healthy', 'Healthy').replace('__', '___'),
                    class_name.replace('healthy', 'Healthy'),
                ])
            
            for variation in variations:
                if variation and variation in treatments_dict:
                    return treatments_dict[variation]
            return None

        treatment = find_treatment(raw_predicted_class, treatments) or find_treatment(predicted_class, treatments)
        if not treatment:
            treatment = treatments.get('default', {
                'general': 'Consult with local agricultural extension services or experts for specific treatment recommendations based on your region and crop type.',
                'prevention': 'Practice good crop hygiene, proper spacing, crop rotation, and regular monitoring. Use disease-resistant varieties when available.',
                'organic': 'Use organic-approved fungicides, improve soil health with compost, practice crop rotation, and encourage beneficial insects.'
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
