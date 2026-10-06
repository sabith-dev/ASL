"""
Custom sign training-data store.

Each recording (a ``sample``) is saved as a JSON file under::

    dataset/signs/<label>/<label>_<index>.json

A sample is a short landmark sequence captured from the camera, one
dict per video frame, combining MediaPipe hand landmarks (full body
motion is covered by the pose landmarks):

    {
        "label": "HELLO",
        "recorded_at": "2026-10-01T10:00:00Z",
        "fps_hint": 30,
        "frames": [
            {
                "handedness": ["Right", "Left"],
                "hands": [[[x, y, z], ...] x N hands],   # 21 pts each
                "pose": [[x, y, z, visibility], ... 33], # full-body
                "pose_world": [[x, y, z, visibility], ... 33]
            },
            ...
        ]
    }
"""
import json
import os
import re
import time

from .._paths import PROJECT_ROOT

SIGNS_ROOT = os.path.join(PROJECT_ROOT, 'dataset', 'signs')

SAFE_LABEL = re.compile(r'^[A-Za-z0-9_ -]{1,40}$')


def normalize_label(label):
    """Upper-case, collapse whitespace, reject anything unsafe."""
    label = (label or '').strip()
    label = re.sub(r'\s+', ' ', label).upper()
    if not SAFE_LABEL.match(label):
        raise ValueError(f'Invalid label: {label!r}. Use letters, numbers, spaces or _-.')
    return label


def class_dir(label):
    return os.path.join(SIGNS_ROOT, normalize_label(label))


def _json_files(label):
    folder = class_dir(label)
    if not os.path.isdir(folder):
        return []
    files = sorted(
        f for f in os.listdir(folder)
        if f.lower().endswith('.json') and f.startswith(normalize_label(label) + '_')
    )
    return [os.path.join(folder, f) for f in files]


def sum_samples(label, frames):
    """Validate and store one recording. Returns summary dict."""
    label = normalize_label(label)
    if not isinstance(frames, list) or not frames:
        raise ValueError('frames must be a non-empty list of landmark frames')
    if len(frames) > 600:
        raise ValueError(f'Too many frames ({len(frames)}); max 600 per sample')

    folder = class_dir(label)
    os.makedirs(folder, exist_ok=True)

    count = len(_json_files(label)) + 1
    filename = f'{label}_{count:04d}.json'
    path = os.path.join(folder, filename)

    payload = {
        'label': label,
        'recorded_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
        'fps_hint': 30,
        'frames': frames,
    }
    with open(path, 'w', encoding='utf-8') as fh:
        json.dump(payload, fh, ensure_ascii=False)

    return {'label': label, 'sample_file': filename, 'count': count}


def list_classes():
    """Return per-class stats: {label, count, samples:[...]} sorted by label."""
    if not os.path.isdir(SIGNS_ROOT):
        return []
    result = []
    for entry in sorted(os.listdir(SIGNS_ROOT)):
        folder = os.path.join(SIGNS_ROOT, entry)
        if not os.path.isdir(folder):
            continue
        files = sorted(
            f for f in os.listdir(folder)
            if f.lower().endswith('.json')
        )
        if files:
            result.append({'label': entry, 'count': len(files), 'samples': files})
    return result


def class_count(label):
    return len(_json_files(label))


def delete_label(label):
    label = normalize_label(label)
    folder = class_dir(label)
    if not os.path.isdir(folder):
        return 0
    files = [os.path.join(folder, f) for f in os.listdir(folder)]
    removed = len([f for f in files if f.lower().endswith('.json')])
    for f in files:
        try:
            os.remove(f)
        except OSError:
            pass
    try:
        os.rmdir(folder)
    except OSError:
        pass
    return removed


def total_summary():
    classes = list_classes()
    return {
        'classes': classes,
        'num_classes': len(classes),
        'total_samples': sum(c['count'] for c in classes),
    }