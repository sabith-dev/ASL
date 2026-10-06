from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json
import threading
import time
from collections import deque

# In-memory conversation log (single process, dev phase).
_MESSAGES = deque(maxlen=200)
_LOCK = threading.Lock()


def list_view(request):
    with _LOCK:
        return JsonResponse({'conversation': list(_MESSAGES)})


@csrf_exempt
def push_view(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'POST required'}, status=405)
    try:
        body = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)

    role = body.get('role', 'speaker')
    text = str(body.get('text', '')).strip()
    gloss = body.get('gloss', [])
    if not text:
        return JsonResponse({'error': 'Text is required'}, status=400)

    entry = {
        'id': int(time.time() * 1000),
        'role': role if role in ('speaker', 'signer') else 'speaker',
        'text': text,
        'gloss': gloss,
        'time': time.strftime('%H:%M'),
    }
    with _LOCK:
        _MESSAGES.append(entry)
    return JsonResponse(entry, status=201)


@csrf_exempt
def clear_view(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'POST required'}, status=405)
    with _LOCK:
        _MESSAGES.clear()
    return JsonResponse({'status': 'ok', 'cleared': True})