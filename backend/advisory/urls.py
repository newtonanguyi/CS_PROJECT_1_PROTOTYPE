from django.urls import path
from .views import get_ai_advisory, get_seasonal_guide, chat_advisory

urlpatterns = [
    path('comprehensive/', get_ai_advisory, name='get_ai_advisory'),
    path('seasonal/', get_seasonal_guide, name='get_seasonal_guide'),
    path('chat/', chat_advisory, name='chat_advisory'),
]







