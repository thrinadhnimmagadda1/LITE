from django.urls import path
from . import views

app_name = 'api'  # Add app namespace

urlpatterns = [
    # API endpoints with trailing slashes
    path('search-terms/', views.SearchTermsAPIView.as_view(), name='search-terms'),
    path('search-terms/clear/', views.SearchTermsAPIView.as_view(action='clear'), name='clear-search-terms'),
    path('papers/', views.PapersAPIView.as_view(), name='papers'),
    
    # Redirect URLs without trailing slashes to URLs with trailing slashes
    path('search-terms', views.SearchTermsAPIView.as_view(), name='search-terms-no-slash'),
    path('search-terms/clear', views.SearchTermsAPIView.as_view(action='clear'), name='clear-search-terms-no-slash'),
    path('papers', views.PapersAPIView.as_view(), name='papers-no-slash'),
]
