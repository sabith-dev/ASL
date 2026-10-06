from django.urls import path

from . import views

urlpatterns = [
    path('predict/', views.predict_view, name='predict'),
    path('translate/', views.translate_view, name='translate'),
    path('info/', views.info_view, name='info'),
    path('words/', views.words_view, name='words'),
    path('train/', views.train_view, name='train'),
    path('train/model/', views.train_model_view, name='train-model'),
]