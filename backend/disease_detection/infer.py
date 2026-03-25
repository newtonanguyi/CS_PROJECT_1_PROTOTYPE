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
        # Thresholds to avoid wrong diagnosis on leaves the model was NOT trained on
        # (e.g. banana, cassava, coffee). Model only knows: Tomato, Potato, Pepper Bell.
        # - unknown_conf_threshold: only trust a diagnosis when top probability is above this
        # - margin_threshold: top-1 must be clearly ahead of top-2 (no ambiguous guess)
        # - max_entropy: if probability is spread across many classes (high entropy), treat as
        #   out-of-domain / unsupported crop even if top-1 looks high
        # Calibrated gating for real-world photos:
        # - keep unsupported-crop protection
        # - reduce over-rejection on valid external leaf photos
        self.unknown_conf_threshold = 0.40  # Lowered heavily for real-world backgrounds
        self.margin_threshold = 0.01        # Less strict on margin
        self.max_entropy = 2.75             # Higher entropy tolerance for noisy images
        self.use_tta = True  # lightweight test-time augmentation for robustness
        
        # Load label map
        with open(self.label_map_path, 'r') as f:
            self.label_map = json.load(f)
        
        # Reverse label map for class name lookup
        self.idx_to_class = {int(k): v for k, v in self.label_map.items()}
        
        # Initialize ONNX runtime session
        self.session = ort.InferenceSession(str(self.model_path))
        
        # Image preprocessing that handles diverse aspect ratios from user cameras
        # First resize the shortest edge to 256, then center crop to 224x224
        # to ensure the leaf isn't distorted (squished) by non-square camera resolutions.
        self.transform = transforms.Compose([
            transforms.Resize(256),
            transforms.CenterCrop(224),
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
        # Preprocess image with optional lightweight TTA (original + horizontal flip)
        input_name = self.session.get_inputs()[0].name
        img = Image.open(image_path).convert('RGB')
        tta_images = [img]
        if self.use_tta:
            tta_images.append(img.transpose(Image.FLIP_LEFT_RIGHT))

        logits = []
        for im in tta_images:
            img_tensor = self.transform(im)
            img_array = img_tensor.unsqueeze(0).numpy()
            outputs = self.session.run(None, {input_name: img_array})
            logits.append(outputs[0][0])

        predictions = np.mean(np.stack(logits, axis=0), axis=0)
        probabilities = np.exp(predictions) / np.sum(np.exp(predictions))  # Softmax

        # Get top prediction
        top_idx = int(np.argmax(probabilities))
        top_class = self.idx_to_class[top_idx]
        confidence = float(probabilities[top_idx])

        # Second-best and entropy (for out-of-domain / wrong-crop detection)
        sorted_indices = np.argsort(probabilities)[::-1]
        top1_prob = float(probabilities[sorted_indices[0]])
        top2_prob = float(probabilities[sorted_indices[1]]) if len(sorted_indices) > 1 else 0.0
        margin = top1_prob - top2_prob

        # Softmax entropy: high = probability spread across classes = uncertain or wrong crop
        eps = 1e-12
        entropy = -float(np.sum(probabilities * np.log(probabilities + eps)))
        above_entropy_limit = entropy > self.max_entropy

        # Treat as unknown when: low confidence, ambiguous (small margin), or high entropy
        # (high entropy catches leaves from crops the model wasn't trained on)
        is_unknown = (
            confidence < self.unknown_conf_threshold
            or margin < self.margin_threshold
            or above_entropy_limit
        )

        # Human-facing class name: if unknown, be explicit instead of forcing a label
        if is_unknown:
            predicted_class = "Unknown or unsupported leaf"
        else:
            predicted_class = top_class

        # Get top 3 predictions
        top_3_indices = np.argsort(probabilities)[-3:][::-1]
        top_3_predictions = [
            {
                'class': self.idx_to_class[idx],
                'confidence': float(probabilities[idx])
            }
            for idx in top_3_indices
        ]

        # Return full class probabilities to enable crop-conditioned fallback in API layer.
        class_probabilities = {
            self.idx_to_class[i]: float(probabilities[i])
            for i in range(len(probabilities))
        }

        return {
            'predicted_class': predicted_class,
            'confidence': confidence,
            'top_3': top_3_predictions,
            'is_unknown': is_unknown,
            'raw_predicted_class': top_class,
            'margin': margin,
            'entropy': entropy,
            'class_probabilities': class_probabilities,
        }
