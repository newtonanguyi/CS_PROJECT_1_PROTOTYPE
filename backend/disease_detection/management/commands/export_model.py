"""
Django management command to export trained model to ONNX.
Usage: python manage.py export_model
"""
from django.core.management.base import BaseCommand
from django.conf import settings
import torch
from pathlib import Path
from disease_detection.train import create_model
from disease_detection.preprocess import get_class_folders, create_label_map


class Command(BaseCommand):
    help = 'Export trained model to ONNX format and generate label map'

    def handle(self, *args, **options):
        device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        model_path = settings.MODELS_DIR / 'disease_detector.pth'
        onnx_path = settings.MODELS_DIR / 'disease_detector.onnx'
        label_map_path = settings.MODELS_DIR / 'label_map.json'
        
        # Check if model exists
        if not model_path.exists():
            self.stdout.write(self.style.ERROR(f'Model file not found at {model_path}'))
            self.stdout.write(self.style.WARNING('Please train the model first.'))
            return
        
        # Get number of classes from dataset
        self.stdout.write('Getting class information from dataset...')
        class_folders = get_class_folders(settings.DATASET_DIR)
        num_classes = len(class_folders)
        self.stdout.write(self.style.SUCCESS(f'Found {num_classes} classes'))
        
        # Create label map
        self.stdout.write('Creating label map...')
        label_map = create_label_map(settings.DATASET_DIR, label_map_path)
        self.stdout.write(self.style.SUCCESS(f'Label map saved to {label_map_path}'))
        
        # Load the trained model
        self.stdout.write(f'Loading model from {model_path}...')
        model = create_model(num_classes)
        model.load_state_dict(torch.load(model_path, map_location=device))
        model.eval()
        self.stdout.write(self.style.SUCCESS('Model loaded successfully'))
        
        # Export to ONNX
        self.stdout.write('Exporting model to ONNX...')
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
            self.stdout.write(self.style.SUCCESS(f'✓ Model exported to ONNX: {onnx_path}'))
            self.stdout.write(self.style.SUCCESS(f'✓ Label map saved to: {label_map_path}'))
            self.stdout.write(self.style.SUCCESS('\nModel export completed successfully!'))
            self.stdout.write(f'\nFiles created:')
            self.stdout.write(f'  - {onnx_path}')
            self.stdout.write(f'  - {label_map_path}')
            self.stdout.write(f'  - {settings.MODELS_DIR / "disease_treatments.json"} (already exists)')
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error exporting to ONNX: {e}'))
            import traceback
            traceback.print_exc()


