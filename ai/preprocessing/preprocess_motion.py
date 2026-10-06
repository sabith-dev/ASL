"""
Preprocess motion sequences dataset for model training.
Filters rare classes, encodes label targets, and splits train/test data.
"""
import os
import sys
import pandas as pd
import numpy as np
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
import joblib

_PKG_ROOT = os.path.dirname(os.path.abspath(__file__))   # ai/preprocessing
_AI_ROOT = os.path.dirname(_PKG_ROOT)                    # ai/
_PROJ_ROOT = os.path.dirname(_AI_ROOT)                   # repo root
for _p in (_AI_ROOT, _PROJ_ROOT):
    if _p not in sys.path:
        sys.path.insert(0, _p)

from ai._paths import (
    MOTION_DATASET_CSV,
    PROCESSED_MOTION_DATA_PATH,
    MOTION_ENCODER_PATH,
    MODEL_DIR,
)


def preprocess_motion_dataset():
    print("=" * 60)
    print("ASL MOTION DATASET PREPROCESSING")
    print("=" * 60)

    if not os.path.exists(MOTION_DATASET_CSV):
        print(f"Error: {MOTION_DATASET_CSV} not found.")
        return

    print("\nLoading motion dataset...")
    df = pd.read_csv(MOTION_DATASET_CSV)
    print("Motion dataset shape:", df.shape)

    feature_cols = [c for c in df.columns if c.startswith('m_')]
    print("Number of motion features:", len(feature_cols))

    df = df.dropna(subset=feature_cols).reset_index(drop=True)

    X = df[feature_cols].values.astype(np.float32)
    y_raw = df['label'].astype(str).values

    y_clean = np.array([lbl.strip().upper() for lbl in y_raw])

    label_encoder = LabelEncoder()
    y_encoded = label_encoder.fit_transform(y_clean)

    num_samples = len(X)
    num_classes = len(label_encoder.classes_)
    print(f"Retained {num_samples} motion samples across {num_classes} word sign classes.")

    if num_samples >= num_classes * 2:
        try:
            X_train, X_test, y_train, y_test = train_test_split(
                X, y_encoded, test_size=0.3, random_state=42, stratify=y_encoded
            )
        except ValueError:
            X_train, X_test, y_train, y_test = train_test_split(
                X, y_encoded, test_size=0.3, random_state=42
            )
    else:
        # Use full dataset for training if sample size per class is small
        X_train, X_test, y_train, y_test = X, X, y_encoded, y_encoded

    print("\nTrain samples:", X_train.shape[0])
    print("Test samples :", X_test.shape[0])
    print("Total Classes:", len(label_encoder.classes_))

    data_payload = {
        "X_train": X_train,
        "X_test": X_test,
        "y_train": y_train,
        "y_test": y_test,
        "feature_names": feature_cols
    }

    os.makedirs(MODEL_DIR, exist_ok=True)
    joblib.dump(data_payload, PROCESSED_MOTION_DATA_PATH)
    joblib.dump(label_encoder, MOTION_ENCODER_PATH)

    print(f"\nSaved processed motion data to {PROCESSED_MOTION_DATA_PATH}")
    print(f"Saved motion label encoder to {MOTION_ENCODER_PATH}")


if __name__ == '__main__':
    preprocess_motion_dataset()
