from django.urls import path
from .views import get_market_prices, get_price_history, predict_price

urlpatterns = [
    path('prices/', get_market_prices, name='get_market_prices'),
    path('history/<str:crop>/', get_price_history, name='get_price_history'),
    path('predict/<str:crop>/', predict_price, name='predict_price'),
]




