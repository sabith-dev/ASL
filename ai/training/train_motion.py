"""
Train motion trajectory classifiers for dynamic ASL word sign recognition.
"""
import os
import sys
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.svm import SVC
from sklearn.metrics import accuracy_score, classification_report

_PKG_ROOT = os.path.dirname(os.path.abspath(__file__))   # ai/training
_AI_ROOT = os.path.dirname(_PKG_ROOT)                    # ai/
_PROJ_ROOT = os.path.dirname(_AI_ROOT)                   # repo root
for _p in (_AI_ROOT, _PROJ_ROOT):
    if _p not in sys.path:
        sys.path.insert(0, _p)

from ai._paths import (
    PROCESSED_MOTION_DATA_PATH,
    MOTION_ENCODER_PATH,
    MOTION_MODELS_PATH,
)


def train_motion_models():
    print("=" * 70)
    print("TRAINING DYNAMIC ASL HAND MOTION CLASSIFIERS")
    print("=" * 70)

    if not os.path.exists(PROCESSED_MOTION_DATA_PATH) or not os.path.exists(MOTION_ENCODER_PATH):
        print("Processed motion data files not found.")
        return

    data = joblib.load(PROCESSED_MOTION_DATA_PATH)
    label_encoder = joblib.load(MOTION_ENCODER_PATH)

    X_train = data["X_train"]
    X_test = data["X_test"]
    y_train = data["y_train"]
    y_test = data["y_test"]

    print(f"\nTrain set: {X_train.shape[0]} samples, Test set: {X_test.shape[0]} samples")
    print(f"Number of classes: {len(label_encoder.classes_)}")

    models = {
        "svm": SVC(kernel="rbf", C=10, gamma="scale", probability=True, class_weight="balanced", random_state=42),
        "random_forest": RandomForestClassifier(n_estimators=300, random_state=42, n_jobs=-1, class_weight="balanced"),
        "logistic_regression": LogisticRegression(max_iter=2000, random_state=42, class_weight="balanced")
    }

    trained_models = {}
    best_acc = 0.0
    best_model_name = ""

    for name, clf in models.items():
        print(f"\nTraining {name.upper()}...", flush=True)
        clf.fit(X_train, y_train)
        preds = clf.predict(X_test)
        acc = accuracy_score(y_test, preds)
        print(f"{name.upper()} Test Accuracy: {acc * 100:.2f}%")
        trained_models[name] = clf
        if acc > best_acc:
            best_acc = acc
            best_model_name = name

    trained_models["label_encoder"] = label_encoder
    joblib.dump(trained_models, MOTION_MODELS_PATH)
    print(f"\nSaved trained motion models to {MOTION_MODELS_PATH}")
    print(f"Best Motion Model: {best_model_name.upper()} with {best_acc * 100:.2f}% accuracy")


if __name__ == '__main__':
    train_motion_models()
