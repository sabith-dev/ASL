from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path


def health(request):
    return JsonResponse({'status': 'ok', 'service': 'SignBridge AI API'})


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('api.urls')),
    path('api/accounts/', include('accounts.urls')),
    path('api/conversations/', include('conversations.urls')),
    path('', health),
]