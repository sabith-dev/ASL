import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from ai.inference.asl_engine import (
    ASLModelError,
    get_models,
    predict,
    predict_from_landmarks,
    predict_sequence_from_landmarks,
)
from translations.gloss import GLOSS_HINTS, build_sign_sequence, to_asl_gloss

from ai.datasets.custom_signs import (
    delete_label,
    list_classes,
    normalize_label,
    sum_samples,
    total_summary,
)
from ai.inference.custom_signs import clear_cache, custom_model_info
from ai.training.custom_signs import train_custom_signs


@csrf_exempt
def predict_view(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'POST required'}, status=405)
    try:
        body = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)

    model = body.get('model', 'svm')

    sequence = body.get('sequence')
    if sequence is not None:
        try:
            result = predict_sequence_from_landmarks(sequence, model_name=model)
            return JsonResponse(result)
        except Exception as exc:
            return JsonResponse({'error': str(exc)}, status=400)

    landmarks = body.get('landmarks')
    if landmarks is not None:
        try:
            if isinstance(landmarks, list) and len(landmarks) > 0 and isinstance(landmarks[0], list) and len(landmarks[0]) > 0 and isinstance(landmarks[0][0], (list, dict)):
                result = predict_sequence_from_landmarks(landmarks, model_name=model)
            else:
                result = predict_from_landmarks(landmarks, model_name=model)
            return JsonResponse(result)
        except ValueError as exc:
            return JsonResponse({'error': str(exc)}, status=400)

    features = body.get('features')
    if features is not None:
        try:
            result = predict(features, model_name=model)
            return JsonResponse(result)
        except Exception as exc:
            return JsonResponse({'error': str(exc)}, status=400)

    return JsonResponse({'error': 'Provide "sequence", "landmarks", or "features"'}, status=400)


@csrf_exempt
def translate_view(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'POST required'}, status=405)
    try:
        body = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)

    text = body.get('text', '')
    if not text.strip():
        return JsonResponse({'error': 'Text is required'}, status=400)

    gloss = to_asl_gloss(text)
    sequence = build_sign_sequence(text)

    return JsonResponse({
        'original': text,
        'gloss': gloss,
        'sequence': sequence,
    })


def info_view(request):
    try:
        models = get_models()
        model_names = [
            k for k, v in models.items()
            if k != 'label_encoder' and hasattr(v, 'predict')
        ]
        classes = list(models['label_encoder'].classes_)
        return JsonResponse({
            'models': model_names,
            'classes': classes,
            'num_classes': len(classes),
            'motion_support': True,
        })
    except ASLModelError as exc:
        return JsonResponse({'error': str(exc)}, status=500)


def words_view(request):
    return JsonResponse({'hints': GLOSS_HINTS})


@csrf_exempt
def train_view(request):
    """CRUD for custom signs captured from the camera.

    GET     /api/train/          → class list + sample counts
    POST    /api/train/          → {label, frames} saves one recording
    DELETE  /api/train/?label=X  → removes a whole class folder
    """
    if request.method == 'POST':
        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)

        label = body.get('label', '')
        frames = body.get('frames')
        try:
            label = normalize_label(label)
            result = sum_samples(label, frames)
        except ValueError as exc:
            return JsonResponse({'error': str(exc)}, status=400)
        return JsonResponse({**result, 'saved': True})

    if request.method == 'DELETE':
        label = request.GET.get('label', '')
        try:
            label = normalize_label(label)
        except ValueError as exc:
            return JsonResponse({'error': str(exc)}, status=400)
        removed = delete_label(label)
        return JsonResponse({'deleted': label, 'removed_samples': removed})

    if request.method == 'GET':
        return JsonResponse(total_summary())

    return JsonResponse({'error': 'Method not allowed'}, status=405)


@csrf_exempt
def train_model_view(request):
    """Train / inspect the custom-sign recognizer.

    GET     /api/train/model/  → trained-model summary (or {trained: False})
    POST    /api/train/model/  → retrain on dataset/signs/ samples
    """
    if request.method == 'GET':
        return JsonResponse(custom_model_info())

    if request.method == 'POST':
        try:
            report = train_custom_signs()
        except ValueError as exc:
            return JsonResponse({'error': str(exc)}, status=400)
        except Exception as exc:
            return JsonResponse({'error': f'Training failed: {exc}'}, status=500)
        # Drop any cached inference model so the fresh one is used immediately.
        clear_cache()
        return JsonResponse(report)

    return JsonResponse({'error': 'Method not allowed'}, status=405)