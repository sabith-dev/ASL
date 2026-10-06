"""
Retrain the live ASL recogniser from the landmark dataset.

Run from anywhere inside the repo::

    python -m ai.training.train

Design notes
------------
* The dataset is a 95 class mix: 27 fingerspelling classes (A-Z + SPACE) with
  ~500 unique source images each, plus 68 word classes that own only 1-8
  samples. Fitting one model over all 95 let those 1-8 sample classes win ties,
  which is what made live reading emit words like CHANGE or CAN instead of
  letters. The base model is therefore letters first, and a word class only
  earns a place in it with MIN_EXTRA_SAMPLES unique images.
* Words the user actually wants are trained through the custom sign model
  (dataset/signs -> ai.training.custom_signs), which is applied as a confident
  override on top of this base model at inference time. Adding a word there
  never requires retraining this file.
* Accuracy on clean dataset images says little about webcam reading, so every
  candidate is also scored on rotated and noised copies of the held out test
  set. That is the number that matters for a hand moving in a real room.
* Landmark normalisation is wrist-relative and scale-normalised but NOT
  rotation-normalised, so camera roll is the augmentation that buys the most
  robustness here.
"""
import json
import os
import sys
import time

import joblib
import numpy as np
import pandas as pd

import matplotlib

matplotlib.use('Agg')
import matplotlib.pyplot as plt

from sklearn.ensemble import RandomForestClassifier, VotingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import ConfusionMatrixDisplay, accuracy_score, confusion_matrix
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.svm import SVC

_PKG_ROOT = os.path.dirname(os.path.abspath(__file__))
_AI_ROOT = os.path.dirname(_PKG_ROOT)
_PROJ_ROOT = os.path.dirname(_AI_ROOT)
for _p in (_AI_ROOT, _PROJ_ROOT):
    if _p not in sys.path:
        sys.path.insert(0, _p)

from ai._paths import (
    ASL_MODELS_PATH,
    DATASET_CSV,
    ENCODER_PATH,
    MODEL_DIR,
    PROCESSED_DATA_PATH,
)
from ai.preprocessing.landmark_utils import normalize_landmarks

# ============================================================
# CONFIGURATION
# ============================================================

RANDOM_STATE = 42
TEST_SIZE = 0.2

LETTER_CLASSES = list("ABCDEFGHIJKLMNOPQRSTUVWXYZ")
SPACE_CLASS = "SPACE"
MIN_CLASS_SAMPLES = 2
MIN_EXTRA_SAMPLES = 30

AUGMENT_REPEATS = 1
TRAIN_ROTATION_DEG = 25.0
TRAIN_NOISE_SIGMA = 0.008
TEST_ROTATION_DEG = 15.0
TEST_NOISE_SIGMA = 0.012

SVM_GRID = [
    {'C': c, 'gamma': g}
    for c in (5.0, 10.0, 50.0, 100.0)
    for g in ('scale', 0.01, 0.03)
]
RF_GRID = [{'n_estimators': n} for n in (300, 600)]
LR_GRID = [{'C': c} for c in (1.0, 10.0, 100.0)]

MODEL_KEYS = ('svm', 'random_forest', 'logistic_regression', 'ensemble')


# ============================================================
# 1. DATA
# ============================================================

def feature_columns(df):
    max_pts = 42 if 'x21' in df.columns else 21
    cols = []
    for i in range(max_pts):
        cols.append(f"x{i}")
        cols.append(f"y{i}")
    return cols


def load_dataset():
    print("=" * 70)
    print("ASL RECOGNISER RETRAIN")
    print("=" * 70)
    print(f"\nLoading dataset: {DATASET_CSV}")

    df = pd.read_csv(DATASET_CSV)
    cols = feature_columns(df)
    for col in cols:
        if col not in df.columns:
            df[col] = 0.0

    X_raw = df[cols].fillna(0.0).to_numpy(dtype=np.float32)
    y = np.array([str(v).strip().upper() for v in df["folder"]])

    n_pts = len(cols) // 2
    X_pts = X_raw.reshape(-1, n_pts, 2)

    usable = np.abs(X_raw).sum(axis=1) > 0
    dropped_blank = int((~usable).sum())
    X_pts, y = X_pts[usable], y[usable]

    print(f"Samples            : {len(y)} (dropped {dropped_blank} blank rows)")
    print(f"Landmarks per hand : {n_pts} ({len(cols)} features)")
    return X_pts, y, dropped_blank


def select_classes(y):
    counts = pd.Series(y).value_counts()

    letters = [c for c in LETTER_CLASSES if c in counts.index and counts[c] >= MIN_CLASS_SAMPLES]
    space = SPACE_CLASS if SPACE_CLASS in counts.index and counts[SPACE_CLASS] >= MIN_CLASS_SAMPLES else None

    base = set(letters)
    if space:
        base.add(space)

    extra = sorted(
        c for c in counts.index
        if c not in base and counts[c] >= MIN_EXTRA_SAMPLES
    )
    dropped = {
        c: int(counts[c])
        for c in counts.index
        if c not in base and c not in extra
    }
    return letters, space, extra, dropped, counts


def apply_selection(X_pts, y, letters, space, extra):
    keep = set(letters) | set(extra)
    if space:
        keep.add(space)
    mask = np.isin(y, list(keep))
    X_pts, y = X_pts[mask], y[mask]

    flat = X_pts.reshape(len(X_pts), -1)
    seen = set()
    idx = []
    for i in range(len(y)):
        key = (y[i], flat[i].tobytes())
        if key in seen:
            continue
        seen.add(key)
        idx.append(i)
    idx = np.array(idx, dtype=np.int64)
    return X_pts[idx], y[idx], len(y) - len(idx)


# ============================================================
# 2. FEATURES
# ============================================================

def to_features(points):
    return np.vstack([normalize_landmarks(p.reshape(-1)) for p in points]).astype(np.float32)


def perturb(points, rng, max_rot_deg, noise_sigma, scale_range=0.08, shift_range=0.05):
    out = np.empty(points.shape, dtype=np.float32)
    for i in range(points.shape[0]):
        p = points[i]
        ang = np.deg2rad(rng.uniform(-max_rot_deg, max_rot_deg))
        cos, sin = np.cos(ang), np.sin(ang)
        rot = np.array([[cos, -sin], [sin, cos]], dtype=np.float32)
        span = float(np.max(np.ptp(p, axis=0)))
        shift = rng.uniform(-shift_range, shift_range, size=2) * max(span, 1e-3)
        q = (p - p[0]) @ rot.T
        q = q * rng.uniform(1.0 - scale_range, 1.0 + scale_range) + p[0] + shift
        out[i] = q + rng.normal(0.0, noise_sigma, size=q.shape)
    return out


def build_train_matrix(X_pts, y_enc, repeats, seed):
    blocks_X = [to_features(X_pts)]
    blocks_y = [y_enc]
    for r in range(repeats):
        rng = np.random.default_rng(seed + 1000 * (r + 1))
        blocks_X.append(to_features(perturb(X_pts, rng, TRAIN_ROTATION_DEG, TRAIN_NOISE_SIGMA)))
        blocks_y.append(y_enc)
        print(f"  augmentation pass {r + 1}/{repeats} built")
    return np.vstack(blocks_X), np.concatenate(blocks_y)


# ============================================================
# 3. TUNING
# ============================================================

def tune(make_model, grid, X, y, label):
    print("\n" + "=" * 70)
    print(f"TUNING: {label}")
    print("=" * 70)
    best_params, best_acc = None, -1.0
    for params in grid:
        model = make_model(**params)
        model.fit(X, y)
        acc = accuracy_score(y, model.predict(X))
        flag = ""
        if acc > best_acc:
            best_acc, best_params, flag = acc, params, "  <-- best"
        print(f"  {params} -> {acc * 100:.2f}%{flag}")
    print(f"Best {label}: {best_params} ({best_acc * 100:.2f}%)")
    return best_params, best_acc


# ============================================================
# 4. MAIN
# ============================================================

def main():
    started = time.time()
    os.makedirs(MODEL_DIR, exist_ok=True)

    X_pts, y, blank_rows = load_dataset()
    letters, space, extra, dropped, counts = select_classes(y)

    print("\nClass selection")
    print("-" * 70)
    print(f"  letters kept        : {len(letters)} -> {''.join(letters)}")
    print(f"  space kept          : {'yes' if space else 'no'}")
    print(f"  words kept (>= {MIN_EXTRA_SAMPLES}) : {len(extra)} {extra if extra else ''}")
    print(f"  words dropped       : {len(dropped)}")
    if dropped:
        worst = sorted(dropped.items(), key=lambda kv: -kv[1])[:5]
        print(f"    largest dropped   : {worst}")

    X_pts, y, dup_rows = apply_selection(X_pts, y, letters, space, extra)
    print(f"\nDuplicate landmark rows removed: {dup_rows}")
    print(f"Training pool: {len(y)} samples across {len(set(y))} classes")

    label_encoder = LabelEncoder()
    y_enc = label_encoder.fit_transform(y)
    X = to_features(X_pts)
    print(f"Feature matrix: {X.shape}")

    indices = np.arange(len(y_enc))
    idx_train, idx_test = train_test_split(
        indices, test_size=TEST_SIZE, random_state=RANDOM_STATE, stratify=y_enc
    )
    X_train, y_train = X[idx_train], y_enc[idx_train]
    X_test, y_test = X[idx_test], y_enc[idx_test]
    print(f"Train: {X_train.shape[0]}  Test: {X_test.shape[0]}  Classes: {len(label_encoder.classes_)}")

    eval_sets = {
        'clean': X_test,
        'rotated': to_features(perturb(X_pts[idx_test], np.random.default_rng(7), TEST_ROTATION_DEG, 0.0)),
        'noised': to_features(perturb(X_pts[idx_test], np.random.default_rng(8), 0.0, TEST_NOISE_SIGMA)),
    }

    best_svm, svm_cv = tune(
        lambda **p: SVC(kernel='rbf', random_state=RANDOM_STATE, class_weight='balanced', **p),
        SVM_GRID, X_train, y_train, 'SVM',
    )
    best_rf, rf_cv = tune(
        lambda **p: RandomForestClassifier(
            random_state=RANDOM_STATE, n_jobs=-1, class_weight='balanced_subsample', **p),
        RF_GRID, X_train, y_train, 'Random Forest',
    )
    best_lr, lr_cv = tune(
        lambda **p: LogisticRegression(max_iter=3000, random_state=RANDOM_STATE, **p),
        LR_GRID, X_train, y_train, 'Logistic Regression',
    )

    print("\n" + "=" * 70)
    print("REBUILDING TRAIN MATRIX WITH AUGMENTATION")
    print("=" * 70)
    X_aug, y_aug = build_train_matrix(X_pts[idx_train], y_train, AUGMENT_REPEATS, RANDOM_STATE)
    print(f"Augmented train matrix: {X_aug.shape}")

    print("\n" + "=" * 70)
    print("FINAL FIT")
    print("=" * 70)
    svm = SVC(kernel='rbf', probability=True, random_state=RANDOM_STATE,
              class_weight='balanced', **best_svm).fit(X_aug, y_aug)
    print("  svm done")
    rf = RandomForestClassifier(random_state=RANDOM_STATE, n_jobs=-1,
                                class_weight='balanced_subsample', **best_rf).fit(X_aug, y_aug)
    print("  random forest done")
    lr = LogisticRegression(max_iter=3000, random_state=RANDOM_STATE, **best_lr).fit(X_aug, y_aug)
    print("  logistic regression done")
    ensemble = VotingClassifier(
        estimators=[
            ('svm', SVC(kernel='rbf', probability=True, random_state=RANDOM_STATE,
                        class_weight='balanced', **best_svm)),
            ('random_forest', RandomForestClassifier(random_state=RANDOM_STATE, n_jobs=-1,
                                                     class_weight='balanced_subsample', **best_rf)),
            ('logistic_regression', LogisticRegression(max_iter=3000, random_state=RANDOM_STATE, **best_lr)),
        ],
        voting='soft',
        n_jobs=-1,
    ).fit(X_aug, y_aug)
    print("  soft-vote ensemble done")

    models = {
        'svm': svm,
        'random_forest': rf,
        'logistic_regression': lr,
        'ensemble': ensemble,
    }

    print("\n" + "=" * 70)
    print("EVALUATION (clean / rotated / noised test set)")
    print("=" * 70)
    header = f"{'model':<22}" + "".join(f"{k:>10}" for k in eval_sets) + f"{'mean':>10}"
    print(header)
    rows, reports = [], {}
    for key in MODEL_KEYS:
        model = models[key]
        accs = {name: accuracy_score(y_test, model.predict(X_eval)) for name, X_eval in eval_sets.items()}
        mean_acc = float(np.mean(list(accs.values())))
        rows.append({'Model': key, **{name: accs[name] * 100 for name in eval_sets}, 'Mean': mean_acc * 100})
        reports[key] = {name: round(accs[name] * 100, 2) for name in eval_sets}
        reports[key]['mean'] = round(mean_acc * 100, 2)
        print(f"{key:<22}" + "".join(f"{accs[n] * 100:>9.2f}%" for n in eval_sets) + f"{mean_acc * 100:>9.2f}%")

    comparison = pd.DataFrame(rows).sort_values(by='Mean', ascending=False)
    print("\n" + comparison.to_string(index=False))
    comparison.to_csv(os.path.join(MODEL_DIR, 'model_comparison.csv'), index=False)

    best_key = comparison.iloc[0]['Model']
    print(f"\nBest for live reading: {best_key} ({comparison.iloc[0]['Mean']:.2f}% mean)")

    for key in MODEL_KEYS:
        model = models[key]
        cm = confusion_matrix(y_test, model.predict(X_test))
        present = np.unique(y_test)
        disp = ConfusionMatrixDisplay(
            confusion_matrix=cm,
            display_labels=label_encoder.inverse_transform(present),
        )
        fig, ax = plt.subplots(figsize=(15, 14))
        disp.plot(ax=ax, xticks_rotation=90, cmap='Blues', colorbar=False)
        ax.set_title(f"{key} - confusion matrix (clean test set)")
        fig.savefig(os.path.join(MODEL_DIR, f'{key}_confusion_matrix.png'), dpi=200, bbox_inches='tight')
        plt.close(fig)

    joblib.dump(
        {**models, 'label_encoder': label_encoder},
        ASL_MODELS_PATH,
    )
    joblib.dump(label_encoder, ENCODER_PATH)
    joblib.dump(
        {
            'X_train': X_train,
            'X_test': X_test,
            'y_train': y_train,
            'y_test': y_test,
        },
        PROCESSED_DATA_PATH,
    )

    report = {
        'trained_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
        'dataset': os.path.relpath(DATASET_CSV, _PROJ_ROOT).replace('\\', '/'),
        'classes': [str(c) for c in label_encoder.classes_],
        'samples': int(len(y)),
        'samples_per_class': {str(k): int(v) for k, v in pd.Series(y).value_counts().items()},
        'blank_rows_dropped': blank_rows,
        'duplicate_rows_dropped': dup_rows,
        'min_extra_samples': MIN_EXTRA_SAMPLES,
        'dropped_word_classes': dropped,
        'augment_repeats': AUGMENT_REPEATS,
        'train_rotation_deg': TRAIN_ROTATION_DEG,
        'train_noise_sigma': TRAIN_NOISE_SIGMA,
        'best_params': {
            'svm': best_svm,
            'random_forest': best_rf,
            'logistic_regression': best_lr,
        },
        'tuning_cv_accuracy': {
            'svm': round(svm_cv * 100, 2),
            'random_forest': round(rf_cv * 100, 2),
            'logistic_regression': round(lr_cv * 100, 2),
        },
        'test_metrics': reports,
        'best_model': best_key,
        'runtime_seconds': round(time.time() - started, 1),
    }
    report_path = os.path.join(MODEL_DIR, 'letters_training_report.json')
    with open(report_path, 'w', encoding='utf-8') as fh:
        json.dump(report, fh, indent=2)

    print("\n" + "=" * 70)
    print("DONE")
    print("=" * 70)
    print(f"Model      : {ASL_MODELS_PATH}")
    print(f"Encoder    : {ENCODER_PATH}")
    print(f"Split      : {PROCESSED_DATA_PATH}")
    print(f"Comparison : {os.path.join(MODEL_DIR, 'model_comparison.csv')}")
    print(f"Report     : {report_path}")
    print(f"Classes    : {len(label_encoder.classes_)}  Samples: {len(y)}")
    print(f"Words dropped (train them in /train): {len(dropped)}")
    print(f"Runtime    : {report['runtime_seconds']}s")
    return best_key


if __name__ == '__main__':
    main()
