from django.db import models
from django.contrib.auth.models import AbstractUser
from datetime import date, timedelta

# Our custom User model
class User(AbstractUser):
    first_name = None
    last_name = None
    ROLE_CHOICES = (
        ('user', 'User'),
        ('admin', 'Admin'),
    )
    email = models.EmailField(unique=True)
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='user')
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

# The Book model
class Book(models.Model):
    title = models.CharField(max_length=200)
    author = models.CharField(max_length=200)
    pdf = models.FileField(upload_to='books/pdfs/')
    available = models.BooleanField(default=True)

    def __str__(self):
        return self.title

# The Borrow model, now with due dates and fines
class Borrow(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    book = models.ForeignKey(Book, on_delete=models.CASCADE)
    borrow_date = models.DateField(auto_now_add=True)
    
    # This is the DUE DATE, automatically set to 14 days after borrowing.
    due_date = models.DateField() 
    
    # This will be filled only when the user actually returns the book.
    actual_return_date = models.DateField(null=True, blank=True)
    
    # This will store the calculated fine, if any.
    fine = models.PositiveIntegerField(default=0)

    def __str__(self):
        return f"{self.user.email} borrowed {self.book.title}"

    # A helper property to easily check if a book is overdue
    @property
    def is_overdue(self):
        return date.today() > self.due_date and self.actual_return_date is None

