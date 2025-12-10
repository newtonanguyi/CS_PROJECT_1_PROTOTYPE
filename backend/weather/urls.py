from django.urls import path
from .views import get_weather

urlpatterns = [
    path('<str:location>/', get_weather, name='get_weather'),
]







