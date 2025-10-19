from rest_framework import serializers
from .models import User, Book, Borrow
from django.contrib.auth import authenticate
from django.contrib.auth.models import update_last_login
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.settings import api_settings

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password', 'role']
        extra_kwargs = {'password': {'write_only': True}}

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            role=validated_data.get('role', 'user')
        )
        return user

class BookSerializer(serializers.ModelSerializer):
    class Meta:
        model = Book
        fields = ['id', 'title', 'author', 'pdf', 'available']


class BorrowSerializer(serializers.ModelSerializer):
    # These fields provide more readable details in the API response
    user_email = serializers.EmailField(source='user.email', read_only=True)
    book_title = serializers.CharField(source='book.title', read_only=True)
    
    # We add a new field to dynamically show the overdue status in the API
    is_overdue = serializers.BooleanField(read_only=True)

    class Meta:
        model = Borrow
        # List all the fields we want to show in the API
        fields = [
            'id', 
            'user', 
            'book', 
            'user_email', 
            'book_title', 
            'borrow_date', 
            'due_date', 
            'actual_return_date', 
            'fine',
            'is_overdue'
        ]
        # Make user and due_date read-only because they are set automatically by the backend
        read_only_fields = ['user', 'due_date']


# --- Serializer for Email Login (No changes needed here) ---
class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')
        user = authenticate(request=self.context.get('request'), email=email, password=password)
        if not user:
            raise serializers.ValidationError('No active account found with the given credentials')
        refresh = self.get_token(user)
        data = {'refresh': str(refresh), 'access': str(refresh.access_token)}
        if api_settings.UPDATE_LAST_LOGIN:
            update_last_login(None, user)
        return data

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['email'] = user.email
        token['role'] = user.role
        return token

