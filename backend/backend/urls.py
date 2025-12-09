"""
URL configuration for backend project.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('users.urls')),
    path('api/disease/', include('disease_detection.urls')),
    path('api/advisory/', include('advisory.urls')),
    path('api/weather/', include('weather.urls')),
    path('api/market/', include('market.urls')),
    path('api/rag/', include('rag.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
