from django.urls import path
from .views import detect_disease, train_model, disease_model_status

urlpatterns = [
    path('detect/', detect_disease, name='detect_disease'),
    path('train/', train_model, name='train_model'),
    path('status/', disease_model_status, name='disease_model_status'),
]
