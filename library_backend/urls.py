from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

# Import our custom view for getting the token (which handles email login)
from api.views import MyTokenObtainPairView
# Import the default view for refreshing an existing token
from rest_framework_simplejwt.views import TokenRefreshView


urlpatterns = [
    # 1. The URL for the Django admin site
    path('admin/', admin.site.urls),

    # 2. Authentication Token URLs
    # This URL uses our custom view to handle the initial email/password login
    path('api/token/', MyTokenObtainPairView.as_view(), name='token_obtain_pair'),
    # This URL uses the default view to get a new access token using a refresh token
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # 3. All other API URLs (for users, books, borrows)
    # This line tells Django to look in the `api/urls.py` file for any URL
    # that starts with 'api/' (except for the token URLs above)
    path('api/', include('api.urls')),
]

# This is a helper configuration that tells Django how to serve user-uploaded
# files (like book PDFs) when you are in development mode (DEBUG = True).
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

