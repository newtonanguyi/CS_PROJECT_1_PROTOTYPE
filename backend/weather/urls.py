# STATUS: Supplementary feature. Functional but deprioritized for current project scope.
# Planned for future work and extended deployment phase.
# SUPPLEMENTARY FEATURE - future work

from django.urls import path
from .views import get_weather

urlpatterns = [
    path('<str:location>/', get_weather, name='get_weather'),
]









