import json
import numpy as np
import onnxruntime as ort
from PIL import Image
from pathlib import Path
import torchvision.transforms as transforms


class DiseaseDetector:
    def __init__(self, model_path, label_map_path):
        self.model_path = Path(model_path)
        self.label_map_path = Path(label_map_path)
        
        # Load label map
        with open(self.label_map_path, 'r') as f:
            self.label_map = json.load(f)
        
        # Reverse label map for class name lookup
        self.idx_to_class = {int(k): v for k, v in self.label_map.items()}
        
        # Initialize ONNX runtime session
        self.session = ort.InferenceSession(str(self.model_path))
        
        # Image preprocessing
        self.transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])
    
    def preprocess_image(self, image_path):
        """Preprocess image for inference."""
        img = Image.open(image_path).convert('RGB')
        img_tensor = self.transform(img)
        img_array = img_tensor.unsqueeze(0).numpy()
        return img_array
    
    def predict(self, image_path):
        """Predict disease from image."""
        # Preprocess image
        img_array = self.preprocess_image(image_path)
        
        # Run inference
        input_name = self.session.get_inputs()[0].name
        outputs = self.session.run(None, {input_name: img_array})
        
        # Get predictions
        predictions = outputs[0][0]
        probabilities = np.exp(predictions) / np.sum(np.exp(predictions))  # Softmax
        
        # Get top prediction
        top_idx = np.argmax(probabilities)
        top_class = self.idx_to_class[top_idx]
        confidence = float(probabilities[top_idx])
        
        # Get top 3 predictions
        top_3_indices = np.argsort(probabilities)[-3:][::-1]
        top_3_predictions = [
            {
                'class': self.idx_to_class[idx],
                'confidence': float(probabilities[idx])
            }
            for idx in top_3_indices
        ]
        
        return {
            'predicted_class': top_class,
            'confidence': confidence,
            'top_3': top_3_predictions
        }
