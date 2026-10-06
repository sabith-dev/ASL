from django.apps import AppConfig

class ApiConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'api'
    verbose_name = 'SignBridge AI API'

    def ready(self):
        from ai.inference.asl_engine import load_models
        load_models()
