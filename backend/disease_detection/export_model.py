"""
Script to export trained model to ONNX and generate label map.
Run this after training is complete.
"""
import os
import sys
from pathlib import Path

# Add backend directory to Python path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
import django
django.setup()

from django.conf import settings
import torch
from disease_detection.train import create_model
from disease_detection.preprocess import get_class_folders, create_label_map

def export_model_to_onnx():
    """Export the trained model to ONNX format and create label map."""
    
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    model_path = settings.MODELS_DIR / 'disease_detector.pth'
    onnx_path = settings.MODELS_DIR / 'disease_detector.onnx'
    label_map_path = settings.MODELS_DIR / 'label_map.json'
    
    # Check if model exists
    if not model_path.exists():
        print(f"Error: Model file not found at {model_path}")
        print("Please train the model first.")
        return
    
    # Get number of classes from dataset
    print("Getting class information from dataset...")
    class_folders = get_class_folders(settings.DATASET_DIR)
    num_classes = len(class_folders)
    print(f"Found {num_classes} classes")
    
    # Create label map
    print("Creating label map...")
    label_map = create_label_map(settings.DATASET_DIR, label_map_path)
    print(f"Label map saved to {label_map_path}")
    
    # Load the trained model
    print(f"Loading model from {model_path}...")
    model = create_model(num_classes)
    model.load_state_dict(torch.load(model_path, map_location=device))
    model.eval()
    print("Model loaded successfully")
    
    # Export to ONNX
    print("Exporting model to ONNX...")
    dummy_input = torch.randn(1, 3, 224, 224).to(device)
    
    try:
        torch.onnx.export(
            model,
            dummy_input,
            onnx_path,
            input_names=['input'],
            output_names=['output'],
            dynamic_axes={'input': {0: 'batch_size'}, 'output': {0: 'batch_size'}},
            opset_version=11,
            export_params=True,
            do_constant_folding=True,
        )
        print(f"✓ Model exported to ONNX: {onnx_path}")
        print(f"✓ Label map saved to: {label_map_path}")
        print("\nModel export completed successfully!")
        print(f"\nFiles created:")
        print(f"  - {onnx_path}")
        print(f"  - {label_map_path}")
        print(f"  - {settings.MODELS_DIR / 'disease_treatments.json'} (already exists)")
        
    except Exception as e:
        print(f"Error exporting to ONNX: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    export_model_to_onnx()





