from django.urls import path
from django.views.decorators.cache import cache_page
from django.views.decorators.vary import vary_on_cookie
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from rest_framework.urlpatterns import format_suffix_patterns
from rest_framework.views import APIView
from . import views
from .views import SearchTermsAPIView, ClearSearchTermsView

app_name = 'api'  # Add app namespace

# Cache settings
CACHE_TTL = 60 * 15  # 15 minutes

# Create a view for the clear endpoint
class ClearSearchTermsView(APIView):
    """View for clearing search terms."""
    @method_decorator(csrf_exempt)
    def dispatch(self, request, *args, **kwargs):
        return super().dispatch(request, *args, **kwargs)
    
    def get(self, request):
        # Delegate to SearchTermsAPIView.clear
        return SearchTermsAPIView().clear(request)

urlpatterns = [
    # API endpoints with trailing slashes
    path('search-terms/', 
         cache_page(CACHE_TTL)(views.SearchTermsAPIView.as_view()), 
         name='search-terms'),
    path('search-terms/clear/', 
         cache_page(CACHE_TTL)(views.ClearSearchTermsView.as_view()), 
         name='search-terms-clear'),
    path('papers/', 
         cache_page(CACHE_TTL)(views.PapersAPIView.as_view()), 
         name='papers'),
    
    # Redirect URLs without trailing slashes to URLs with trailing slashes
    path('search-terms', 
         cache_page(CACHE_TTL)(views.SearchTermsAPIView.as_view()), 
         name='search-terms-no-slash'),
    path('papers', 
         cache_page(CACHE_TTL)(views.PapersAPIView.as_view()), 
         name='papers-no-slash'),
]

# Add format suffixes (e.g., .json)
urlpatterns = format_suffix_patterns(urlpatterns)
