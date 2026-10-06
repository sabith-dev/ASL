from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json


def profile_view(request):
    return JsonResponse({
        'service': 'SignBridge AI',
        'endpoint': 'accounts',
        'message': 'Account profiles are part of the roadmap. '
                   'In this phase the system runs without login.',
    })


@csrf_exempt
def register_view(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'POST required'}, status=405)
    return JsonResponse({
        'status': 'ok',
        'message': 'Registration endpoint reserved for a future '
                   'accounts release. Helpful today? No — start signing!',
    })