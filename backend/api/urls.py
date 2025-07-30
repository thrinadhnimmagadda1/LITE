from django.urls import path
from . import views

urlpatterns = [
    path('search-terms/', views.SearchTermsAPIView.as_view(), name='search-terms'),
    path('search-terms/clear/', views.SearchTermsAPIView.as_view(action='clear'), name='clear-search-terms'),
    path('papers/', views.PapersAPIView.as_view(), name='papers'),
]
