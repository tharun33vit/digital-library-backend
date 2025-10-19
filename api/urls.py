from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UserViewSet, BookViewSet, BorrowViewSet

# This router automatically generates the URLs for our ViewSets
router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')
router.register(r'books', BookViewSet, basename='book')
router.register(r'borrows', BorrowViewSet, basename='borrow')

# The API URLs are now determined automatically by the router.
urlpatterns = [
    path('', include(router.urls)),
]
