from django.urls import path

from . import views

urlpatterns = [
    path('', views.profile_view),
    path('register/', views.register_view),
]