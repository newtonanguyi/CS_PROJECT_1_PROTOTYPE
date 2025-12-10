from django.urls import path
from .views import ingest_documents, search_advisory, initialize_default_knowledge

urlpatterns = [
    path('ingest/', ingest_documents, name='ingest_documents'),
    path('search/', search_advisory, name='search_advisory'),
    path('initialize/', initialize_default_knowledge, name='initialize_default_knowledge'),
]







