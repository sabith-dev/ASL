import os
import sys
import pandas as pd
import numpy as np
import joblib
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split

_PKG_ROOT = os.path.dirname(os.path.abspath(__file__))   # ai/preprocessing
_AI_ROOT = os.path.dirname(_PKG_ROOT)                    # ai/
_PROJ_ROOT = os.path.dirname(_AI_ROOT)                   # repo root
for _p in (_AI_ROOT, _PROJ_ROOT):
    if _p not in sys.path:
        sys.path.insert(0, _p)

from ai._paths import DATASET_CSV, MODEL_DIR, PROCESSED_DATA_PATH, ENCODER_PATH
from ai.preprocessing.landmark_utils import normalize_landmarks


def preprocess_dataset():
    print("=" * 60)
    print("ASL TWO-HAND DATA PREPROCESSING")
    print("=" * 60)

    if not os.path.exists(DATASET_CSV):
        print(f"Dataset CSV not found at {DATASET_CSV}")
        return

    print("\nLoading dataset...")
    df = pd.read_csv(DATASET_CSV)
    print("Dataset shape:", df.shape)

    # Determine available feature columns (x0..x41, y0..y41)
    feature_columns = []
    max_pts = 42 if 'x21' in df.columns else 21
    for i in range(max_pts):
        feature_columns.append(f"x{i}")
        feature_columns.append(f"y{i}")

    print(f"Identified {len(feature_columns)} landmark coordinate features ({max_pts} keypoints)")

    # Fill missing columns/values with 0.0
    for col in feature_columns:
        if col not in df.columns:
            df[col] = 0.0

    X_raw = df[feature_columns].fillna(0.0).values.astype(np.float32)
    y_raw = df["folder"].astype(str).values

    # Clean label strings
    y_clean = np.array([lbl.strip().upper() for lbl in y_raw])

    # Filter out classes with less than 2 samples for stratified split
    class_counts = pd.Series(y_clean).value_counts()
    valid_classes = class_counts[class_counts >= 2].index
    mask = np.isin(y_clean, valid_classes)
    X_raw = X_raw[mask]
    y_clean = y_clean[mask]

    print(f"\nRetained {len(X_raw)} samples across {len(valid_classes)} classes.")

    print("Normalizing 2-hand landmarks (84 features per sample)...")
    X_normalized = []
    for sample in X_raw:
        norm_vec = normalize_landmarks(sample)
        X_normalized.append(norm_vec)

    X_normalized = np.array(X_normalized, dtype=np.float32)

    label_encoder = LabelEncoder()
    y_encoded = label_encoder.fit_transform(y_clean)

    X_train, X_test, y_train, y_test = train_test_split(
        X_normalized, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded
    )

    print("\nTraining samples:", X_train.shape)
    print("Testing samples :", X_test.shape)
    print("Total Classes   :", len(label_encoder.classes_))

    os.makedirs(MODEL_DIR, exist_ok=True)
    joblib.dump({
        "X_train": X_train,
        "X_test": X_test,
        "y_train": y_train,
        "y_test": y_test
    }, PROCESSED_DATA_PATH)

    joblib.dump(label_encoder, ENCODER_PATH)

    print(f"\nSaved processed data to {PROCESSED_DATA_PATH}")
    print(f"Saved label encoder to {ENCODER_PATH}")


if __name__ == '__main__':
    preprocess_dataset()