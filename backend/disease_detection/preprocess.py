import os
import shutil
from pathlib import Path
from PIL import Image
import numpy as np
from sklearn.model_selection import train_test_split
import json


def resize_image(image_path, target_size=(224, 224)):
    """Resize image to target size."""
    img = Image.open(image_path)
    img = img.convert('RGB')
    img = img.resize(target_size, Image.Resampling.LANCZOS)
    return img


def normalize_image(img_array):
    """Normalize image array to [0, 1]."""
    return img_array.astype(np.float32) / 255.0


def get_class_folders(dataset_dir):
    """Get all class folders from dataset directory."""
    dataset_path = Path(dataset_dir)
    if not dataset_path.exists():
        raise ValueError(f"Dataset directory not found: {dataset_dir}")
    
    class_folders = [d for d in dataset_path.iterdir() if d.is_dir()]
    return sorted(class_folders)


def create_label_map(dataset_dir, output_path):
    """Create label map from dataset structure."""
    class_folders = get_class_folders(dataset_dir)
    label_map = {}
    
    for idx, folder in enumerate(class_folders):
        class_name = folder.name
        label_map[idx] = class_name
    
    with open(output_path, 'w') as f:
        json.dump(label_map, f, indent=2)
    
    return label_map


def split_dataset(dataset_dir, train_ratio=0.7, val_ratio=0.15, test_ratio=0.15):
    """Split dataset into train, validation, and test sets."""
    class_folders = get_class_folders(dataset_dir)
    
    train_data = []
    val_data = []
    test_data = []
    
    for class_idx, folder in enumerate(class_folders):
        image_files = list(folder.glob('*.JPG')) + list(folder.glob('*.jpg')) + list(folder.glob('*.png'))
        
        # Split images for this class
        train, temp = train_test_split(image_files, test_size=(1 - train_ratio), random_state=42)
        val, test = train_test_split(temp, test_size=(test_ratio / (val_ratio + test_ratio)), random_state=42)
        
        train_data.extend([(str(img), class_idx) for img in train])
        val_data.extend([(str(img), class_idx) for img in val])
        test_data.extend([(str(img), class_idx) for img in test])
    
    return train_data, val_data, test_data


def prepare_dataset_info(dataset_dir, output_dir):
    """Prepare dataset information and label map."""
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    
    label_map = create_label_map(dataset_dir, output_path / 'label_map.json')
    
    train_data, val_data, test_data = split_dataset(dataset_dir)
    
    dataset_info = {
        'num_classes': len(label_map),
        'train_samples': len(train_data),
        'val_samples': len(val_data),
        'test_samples': len(test_data),
        'classes': {v: k for k, v in label_map.items()}
    }
    
    with open(output_path / 'dataset_info.json', 'w') as f:
        json.dump(dataset_info, f, indent=2)
    
    return dataset_info, label_map
