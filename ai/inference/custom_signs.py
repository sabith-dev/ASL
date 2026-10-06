"""
Live custom-sign recognition against models/custom_signs.pkl.

The model is loaded lazily and cached with its file mtime so a freshly
retrained model is picked up without a server restart.
"""
import os
import threading

import joblib

from ai._paths import MODEL_DIR
from ai.landmarks.sequence_features import DEFAULT_RESAMPLE, sequence_feature

CUSTOM_MODEL_PATH = os.path.join(MODEL_DIR, 'custom_signs.pkl')

MIN_FRAMES = 24          # need ~0.8s of frames before attempting a match
CONFIDENCE_THRESHOLD = 0.45
GAP_THRESHOLD = 0.15     # best score must beat the runner-up by this much

_cache = {'mtime': None, 'model': None}
_lock = threading.Lock()


def get_custom_model():
    if not os.path.exists(CUSTOM_MODEL_PATH):
        return None
    mtime = os.path.getmtime(CUSTOM_MODEL_PATH)
    with _lock:
        if _cache['model'] is not None and _cache['mtime'] == mtime:
            return _cache['model']
        try:
            _cache['model'] = joblib.load(CUSTOM_MODEL_PATH)
            _cache['mtime'] = mtime
        except Exception as exc:
            print(f'Warning: failed to load custom-sign model: {exc}')
            _cache['model'] = None
            _cache['mtime'] = None
    return _cache['model']


def clear_cache():
    with _lock:
        _cache['model'] = None
        _cache['mtime'] = None


def custom_model_info():
    """Summary of the trained model (if any), as a JSON-friendly dict."""
    model = get_custom_model()
    if not model:
        return {'trained': False, 'classes': [], 'samples_per_class': {}, 'num_classes': 0}
    info = dict(model.get('report', {}))
    info['trained'] = True
    return info


def classify_custom_sequence(frames):
    """
    frames: list of dicts {h: hand21|None, pose: pose33|None}

    Returns {label, confidence, gap} or None when no trained model / the
    window is too short / the match is not confident enough.
    """
    model = get_custom_model()
    if not model:
        return None
    if not frames or len(frames) < MIN_FRAMES:
        return None

    try:
        feat = sequence_feature(frames).reshape(1, -1)
        clf = model['model']
        proba = clf.predict_proba(feat)[0]
        classes = model['classes']
    except Exception:
        return None

    order = proba.argsort()[::-1]
    best_idx = int(order[0])
    conf = float(proba[best_idx])
    gap = float(proba[best_idx] - proba[order[1]]) if len(proba) > 1 else 1.0

    if conf < CONFIDENCE_THRESHOLD or gap < GAP_THRESHOLD:
        return None

    return {
        'label': str(classes[best_idx]),
        'confidence': round(min(conf * 100, 100), 2),
        'gap': round(gap, 3),
    }


def min_frames():
    return MIN_FRAMES