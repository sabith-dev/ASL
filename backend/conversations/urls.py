from django.urls import path

from . import views

urlpatterns = [
    path('', views.list_view, name='conversation-list'),
    path('push/', views.push_view, name='conversation-push'),
    path('clear/', views.clear_view, name='conversation-clear'),
]