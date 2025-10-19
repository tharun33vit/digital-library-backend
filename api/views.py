from rest_framework import viewsets, permissions, status, serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import User, Book, Borrow
from .serializers import UserSerializer, BookSerializer, BorrowSerializer, MyTokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView
from datetime import date, timedelta

# Custom permission for admin-only actions
class IsAdminOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        # Only allow POST, PUT, DELETE etc. if the user is an admin
        return request.user and request.user.role == 'admin'

# View for handling email-based login
class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer

# ViewSet for Users
class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAdminOrReadOnly]

# ViewSet for Books
class BookViewSet(viewsets.ModelViewSet):
    queryset = Book.objects.all()
    serializer_class = BookSerializer
    permission_classes = [IsAdminOrReadOnly]

# ViewSet for Borrows (with all the new logic)
class BorrowViewSet(viewsets.ModelViewSet):
    queryset = Borrow.objects.all()
    serializer_class = BorrowSerializer
    permission_classes = [permissions.IsAuthenticated]

    # Ensure regular users can only see their own borrow records
    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return Borrow.objects.all()
        return Borrow.objects.filter(user=user)

    # --- CUSTOM LOGIC FOR BORROWING A BOOK ---
    def perform_create(self, serializer):
        book_id = self.request.data.get('book')
        try:
            book = Book.objects.get(id=book_id)
        except Book.DoesNotExist:
            raise serializers.ValidationError({'detail': 'Book not found.'})

        if not book.available:
            raise serializers.ValidationError({'detail': 'This book is not available.'})

        # Set the due date to 14 days from now
        due_date = date.today() + timedelta(days=14)
        
        # Mark the book as unavailable
        book.available = False
        book.save()
        
        # Save the borrow record with the user, book, and due date
        serializer.save(user=self.request.user, book=book, due_date=due_date)

    # --- CUSTOM ACTION FOR RETURNING A BOOK ---
    @action(detail=True, methods=['post'])
    def return_book(self, request, pk=None):
        try:
            borrow_instance = self.get_object()
        except Borrow.DoesNotExist:
            return Response({'detail': 'Borrow record not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Check if the book has already been returned
        if borrow_instance.actual_return_date:
            return Response({'detail': 'This book has already been returned.'}, status=status.HTTP_400_BAD_REQUEST)

        # Set the return date to today
        borrow_instance.actual_return_date = date.today()
        
        # Calculate fine if overdue
        if borrow_instance.actual_return_date > borrow_instance.due_date:
            days_overdue = (borrow_instance.actual_return_date - borrow_instance.due_date).days
            borrow_instance.fine = days_overdue * 5  # 5 rupees per day
        
        # Mark the book as available again
        book = borrow_instance.book
        book.available = True
        book.save()

        borrow_instance.save()
        serializer = self.get_serializer(borrow_instance)
        return Response(serializer.data, status=status.HTTP_200_OK)

