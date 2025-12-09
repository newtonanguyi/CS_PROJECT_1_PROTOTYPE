import os
import json
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
from torchvision import transforms, models
from PIL import Image
from pathlib import Path
import numpy as np
from tqdm import tqdm
from .preprocess import get_class_folders, split_dataset


class PlantDiseaseDataset(Dataset):
    def __init__(self, data_list, transform=None):
        self.data_list = data_list
        self.transform = transform
    
    def __len__(self):
        return len(self.data_list)
    
    def __getitem__(self, idx):
        img_path, label = self.data_list[idx]
        img = Image.open(img_path).convert('RGB')
        
        if self.transform:
            img = self.transform(img)
        
        return img, label


def get_data_loaders(dataset_dir, batch_size=32, num_workers=0):
    """Create data loaders for train, validation, and test sets."""
    # Use num_workers=0 on Windows to avoid multiprocessing issues
    import platform
    if platform.system() == 'Windows':
        num_workers = 0
    
    train_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.RandomRotation(degrees=15),
        transforms.ColorJitter(brightness=0.2, contrast=0.2),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    
    val_test_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    
    train_data, val_data, test_data = split_dataset(dataset_dir)
    
    train_dataset = PlantDiseaseDataset(train_data, transform=train_transform)
    val_dataset = PlantDiseaseDataset(val_data, transform=val_test_transform)
    test_dataset = PlantDiseaseDataset(test_data, transform=val_test_transform)
    
    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True, num_workers=num_workers, pin_memory=True if torch.cuda.is_available() else False)
    val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False, num_workers=num_workers, pin_memory=True if torch.cuda.is_available() else False)
    test_loader = DataLoader(test_dataset, batch_size=batch_size, shuffle=False, num_workers=num_workers, pin_memory=True if torch.cuda.is_available() else False)
    
    return train_loader, val_loader, test_loader, len(get_class_folders(dataset_dir))


def create_model(num_classes):
    """Create MobileNetV2 model."""
    model = models.mobilenet_v2(pretrained=True)
    model.classifier[1] = nn.Linear(model.last_channel, num_classes)
    return model


def train_model(dataset_dir, model_dir, epochs=10, batch_size=64, learning_rate=0.001, resume_from=None):
    """Train the disease detection model.
    
    Args:
        dataset_dir: Path to dataset directory
        model_dir: Path to save models
        epochs: Number of training epochs
        batch_size: Batch size (increased default for faster training)
        learning_rate: Learning rate
        resume_from: Path to checkpoint to resume from (optional)
    """
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"Using device: {device}")
    if device.type == 'cpu':
        print("WARNING: Training on CPU will be very slow. Consider using GPU or reducing dataset size.")
    
    # Get data loaders
    train_loader, val_loader, test_loader, num_classes = get_data_loaders(dataset_dir, batch_size)
    print(f"Training samples: {len(train_loader.dataset)}, Validation: {len(val_loader.dataset)}, Test: {len(test_loader.dataset)}")
    print(f"Number of classes: {num_classes}")
    
    # Create model
    model = create_model(num_classes)
    model = model.to(device)
    
    # Loss and optimizer
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=learning_rate)
    scheduler = optim.lr_scheduler.StepLR(optimizer, step_size=5, gamma=0.1)
    
    start_epoch = 0
    best_val_acc = 0.0
    
    # Resume from checkpoint if provided
    if resume_from and Path(resume_from).exists():
        print(f"Resuming from checkpoint: {resume_from}")
        checkpoint = torch.load(resume_from, map_location=device)
        model.load_state_dict(checkpoint['model_state_dict'])
        optimizer.load_state_dict(checkpoint['optimizer_state_dict'])
        start_epoch = checkpoint['epoch']
        best_val_acc = checkpoint.get('best_val_acc', 0.0)
        print(f"Resumed from epoch {start_epoch}, best val acc: {best_val_acc:.2f}%")
    
    # Training loop
    for epoch in range(epochs):
        model.train()
        train_loss = 0.0
        train_correct = 0
        train_total = 0
        
        pbar = tqdm(train_loader, desc=f'Epoch {epoch+1}/{epochs}')
        for images, labels in pbar:
            images, labels = images.to(device), labels.to(device)
            
            optimizer.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()
            
            train_loss += loss.item()
            _, predicted = torch.max(outputs.data, 1)
            train_total += labels.size(0)
            train_correct += (predicted == labels).sum().item()
            
            pbar.set_postfix({
                'loss': f'{loss.item():.4f}',
                'acc': f'{100 * train_correct / train_total:.2f}%'
            })
        
        # Validation
        model.eval()
        val_loss = 0.0
        val_correct = 0
        val_total = 0
        
        with torch.no_grad():
            for images, labels in val_loader:
                images, labels = images.to(device), labels.to(device)
                outputs = model(images)
                loss = criterion(outputs, labels)
                
                val_loss += loss.item()
                _, predicted = torch.max(outputs.data, 1)
                val_total += labels.size(0)
                val_correct += (predicted == labels).sum().item()
        
        val_acc = 100 * val_correct / val_total
        print(f'Epoch {epoch+1}: Train Loss: {train_loss/len(train_loader):.4f}, '
              f'Train Acc: {100 * train_correct / train_total:.2f}%, '
              f'Val Loss: {val_loss/len(val_loader):.4f}, '
              f'Val Acc: {val_acc:.2f}%')
        
        # Save best model and checkpoint
        if val_acc > best_val_acc:
            best_val_acc = val_acc
            model_path = Path(model_dir) / 'disease_detector.pth'
            model_path.parent.mkdir(parents=True, exist_ok=True)
            torch.save(model.state_dict(), model_path)
            print(f'Best model saved with validation accuracy: {best_val_acc:.2f}%')
        
        # Save checkpoint every epoch (for resume capability)
        checkpoint_path = Path(model_dir) / 'checkpoint.pth'
        torch.save({
            'epoch': epoch + 1,
            'model_state_dict': model.state_dict(),
            'optimizer_state_dict': optimizer.state_dict(),
            'best_val_acc': best_val_acc,
            'val_acc': val_acc,
        }, checkpoint_path)
        
        scheduler.step()
    
    # Load best model and export to ONNX
    model.load_state_dict(torch.load(Path(model_dir) / 'disease_detector.pth'))
    model.eval()
    
    # Export to ONNX
    dummy_input = torch.randn(1, 3, 224, 224).to(device)
    onnx_path = Path(model_dir) / 'disease_detector.onnx'
    
    torch.onnx.export(
        model,
        dummy_input,
        onnx_path,
        input_names=['input'],
        output_names=['output'],
        dynamic_axes={'input': {0: 'batch_size'}, 'output': {0: 'batch_size'}},
        opset_version=11
    )
    
    print(f'Model exported to ONNX: {onnx_path}')
    
    # Test accuracy
    model.eval()
    test_correct = 0
    test_total = 0
    
    with torch.no_grad():
        for images, labels in test_loader:
            images, labels = images.to(device), labels.to(device)
            outputs = model(images)
            _, predicted = torch.max(outputs.data, 1)
            test_total += labels.size(0)
            test_correct += (predicted == labels).sum().item()
    
    test_acc = 100 * test_correct / test_total
    print(f'Test Accuracy: {test_acc:.2f}%')
    
    return model, test_acc
