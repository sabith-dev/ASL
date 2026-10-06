"""
Train a recognizer for the custom signs collected in dataset/signs/.

Pipeline:
    - load every recorded sample (label -> [frames])
    - build fixed-length sequence features (see ai.landmarks.sequence_features)
    - fit a RandomForest classifier over the samples
    - evaluate with leave-one-out / stratified k-fold
    - dump to models/custom_signs.pkl with the metadata the live engine needs

Run from anywhere inside the repo::

    python -m ai.training.custom_signs
"""
import json
import os
import time

import joblib
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import LeaveOneOut, StratifiedKFold

from ai._paths import MODEL_DIR
from ai.datasets.custom_signs import class_dir, list_classes
from ai.landmarks.sequence_features import DEFAULT_RESAMPLE, sequence_feature

CUSTOM_MODEL_PATH = os.path.join(MODEL_DIR, 'custom_signs.pkl')

MIN_FRAMES = 8            # a frame list shorter than this is a broken capture
MIN_CLASSES = 2           # at least two signs are required to discriminate
RESAMPLE = DEFAULT_RESAMPLE


def iter_samples():
    """Yield (label, frames) for every recorded sample."""
    for cls in list_classes():
        for name in cls['samples']:
            path = os.path.join(class_dir(cls['label']), name)
            try:
                with open(path, 'r', encoding='utf-8') as fh:
                    data = json.load(fh)
            except (OSError, json.JSONDecodeError):
                continue
            frames = data.get('frames') or []
            if len(frames) < MIN_FRAMES:
                continue
            yield data.get('label') or cls['label'], frames


def build_xy():
    rows = []
    for label, frames in iter_samples():
        try:
            vec = sequence_feature([{'hands': f.get('hands'), 'pose': f.get('pose')} for f in frames])
        except Exception:
            continue
        rows.append((label, vec))
    if not rows:
        raise ValueError('No usable samples found in dataset/signs/. Record some first.')
    labels = [r[0] for r in rows]
    X = np.vstack([r[1] for r in rows]).astype(np.float32)
    y = np.array(labels)
    return X, y


def _cv_accuracy(clf, X, y):
    import warnings
    from sklearn.metrics import accuracy_score

    total = len(y)
    if total <= 24:
        splits = LeaveOneOut()
    else:
        splits = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    scores = []
    with warnings.catch_warnings():
        warnings.simplefilter('ignore')
        for train_idx, test_idx in splits.split(X, y):
            fit = RandomForestClassifier(n_estimators=200, max_depth=None,
                                         random_state=42, class_weight='balanced_subsample')
            fit.fit(X[train_idx], y[train_idx])
            scores.append(accuracy_score(y[test_idx], fit.predict(X[test_idx])))
    return float(np.mean(scores)) if scores else None


def train_custom_signs():
    """Train + persist the custom-sign model. Returns a report dict."""
    X, y = build_xy()

    classes_abs = sorted(set(y))
    if len(classes_abs) < MIN_CLASSES:
        raise ValueError(
            f'Need at least {MIN_CLASSES} different signs to train a recognizer '
            f'(found {len(classes_abs)}). Record a second sign first.'
        )

    clf = RandomForestClassifier(
        n_estimators=300,
        max_depth=None,
        min_samples_split=2,
        min_samples_leaf=1,
        random_state=42,
        class_weight='balanced_subsample',
        n_jobs=-1,
    )
    clf.fit(X, y)

    overall = _cv_accuracy(clf, X, y)

    label_set = sorted({str(c) for c in set(y)})
    classes = np.array(label_set)
    samples_per_class = {c: int(np.sum(y == c)) for c in label_set}

    report = {
        'trained': True,
        'trained_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
        'num_classes': len(label_set),
        'total_samples': int(len(y)),
        'classes': label_set,
        'samples_per_class': samples_per_class,
        'overall_accuracy': round(overall * 100, 2) if overall is not None else None,
        'feature_dim': int(sequence_feature([{'h': None, 'pose': None}] * 2).size),
        'resample_length': RESAMPLE,
    }

    payload = {
        'model': clf,
        'classes': classes,
        'samples_per_class': samples_per_class,
        'report': report,
    }
    os.makedirs(MODEL_DIR, exist_ok=True)
    joblib.dump(payload, CUSTOM_MODEL_PATH)

    return report


def model_exists():
    return os.path.exists(CUSTOM_MODEL_PATH)


if __name__ == '__main__':
    try:
        rep = train_custom_signs()
        print('Saved model ->', CUSTOM_MODEL_PATH)
        for key, val in rep.items():
            print(f'  {key}: {val}')
    except ValueError as exc:
        print(f'Cannot train: {exc}')
        raise SystemExit(1)