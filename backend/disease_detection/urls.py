from django.urls import path
from .views import detect_disease, train_model

urlpatterns = [
    path('detect/', detect_disease, name='detect_disease'),
    path('train/', train_model, name='train_model'),
]
