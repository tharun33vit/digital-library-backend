from django.contrib import admin
from .models import User, Book, Borrow

# Register your models here so they appear on the admin site.
admin.site.register(User)
admin.site.register(Book)
admin.site.register(Borrow)
