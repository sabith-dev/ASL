import joblib
import numpy as np

import os
import sys
_AI_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # ai/
if _AI_ROOT not in sys.path:
    sys.path.insert(0, _AI_ROOT)

from ai._paths import ASL_MODELS_PATH, PROCESSED_DATA_PATH

# ============================================================
# CONFIGURATION
# ============================================================

MODEL_PATH = ASL_MODELS_PATH
DATA_PATH = PROCESSED_DATA_PATH


# ============================================================
# 1. LOAD EVERYTHING FROM ONE PKL
# ============================================================

print("=" * 70)
print("TESTING SAVED ASL MODELS")
print("=" * 70)

print("\nLoading combined model file...")

models = joblib.load(MODEL_PATH)

print("Loaded successfully.")


# ============================================================
# 2. CHECK CONTENTS
# ============================================================

print("\nContents of asl_models.pkl:")

for key in models:
    print(" -", key)


# ============================================================
# 3. GET MODELS
# ============================================================

random_forest = models["random_forest"]
logistic_regression = models["logistic_regression"]
svm = models["svm"]

label_encoder = models["label_encoder"]


print("\nNumber of classes:", len(label_encoder.classes_))

print("\nClasses:")

for index, label in enumerate(label_encoder.classes_):
    print(f"{index:2d} -> {label}")


# ============================================================
# 4. LOAD TEST DATA
# ============================================================

print("\nLoading test data...")

data = joblib.load(DATA_PATH)

X_test = data["X_test"]
y_test = data["y_test"]

print("Test data shape:", X_test.shape)


# ============================================================
# 5. TEST EACH MODEL
# ============================================================

print("\n")
print("=" * 70)
print("MODEL PREDICTION TEST")
print("=" * 70)


model_list = {
    "Random Forest": random_forest,
    "Logistic Regression": logistic_regression,
    "SVM": svm
}


for name, model in model_list.items():

    predictions = model.predict(X_test)

    accuracy = np.mean(predictions == y_test)

    print(
        f"\n{name:<22} "
        f"Accuracy: {accuracy * 100:.2f}%"
    )


# ============================================================
# 6. TEST SINGLE SAMPLE
# ============================================================

print("\n")
print("=" * 70)
print("SINGLE SAMPLE TEST")
print("=" * 70)

sample = X_test[0].reshape(1, -1)

true_label = label_encoder.inverse_transform(
    [y_test[0]]
)[0]


print("\nActual label:", true_label)


for name, model in model_list.items():

    prediction = model.predict(sample)

    predicted_label = label_encoder.inverse_transform(
        prediction
    )[0]

    print(
        f"{name:<22} -> {predicted_label}"
    )


# ============================================================
# 7. FINAL RESULT
# ============================================================

print("\n")
print("=" * 70)
print("MODEL FILE TEST COMPLETE")
print("=" * 70)

print("\nAll three models loaded successfully.")

print("\nSingle model file:")
print("models/asl_models.pkl")

print("\nAvailable models:")
print(" - Random Forest")
print(" - Logistic Regression")
print(" - SVM")