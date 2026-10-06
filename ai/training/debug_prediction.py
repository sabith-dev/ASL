import cv2
import mediapipe as mp
import joblib
import numpy as np
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

import os
import sys
_PKG_ROOT = os.path.dirname(os.path.abspath(__file__))      # ai/training
_AI_ROOT = os.path.dirname(_PKG_ROOT)                       # ai/
_PROJ_ROOT = os.path.dirname(_AI_ROOT)                      # repo root
for _p in (_AI_ROOT, _PROJ_ROOT):
    if _p not in sys.path:
        sys.path.insert(0, _p)

from ai._paths import ASL_MODELS_PATH as MODEL_PATH, HAND_LANDMARKER_PATH as HAND_MODEL_PATH
from ai.inference.asl_engine import normalize_landmarks

print("Loading models...")
models = joblib.load(MODEL_PATH)
clf = models["svm"]                    # try svm first
label_encoder = models["label_encoder"]
print("Classes:", list(label_encoder.classes_))

base_options = python.BaseOptions(model_asset_path=HAND_MODEL_PATH)
options = vision.HandLandmarkerOptions(
    base_options=base_options,
    running_mode=vision.RunningMode.IMAGE,   # IMAGE mode for debug
    num_hands=1,
    min_hand_detection_confidence=0.5,
    min_hand_presence_confidence=0.5,
    min_tracking_confidence=0.5
)
detector = vision.HandLandmarker.create_from_options(options)

cap = cv2.VideoCapture(0)

print("\nShow a clear sign and press SPACE to capture & predict")
print("Press Q to quit\n")

while True:
    ret, frame = cap.read()
    if not ret:
        break

    frame = cv2.flip(frame, 1)
    display = frame.copy()

    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)

    result = detector.detect(mp_image)

    if result.hand_landmarks:
        hand = result.hand_landmarks[0]
        h, w, _ = frame.shape

        # Draw landmarks
        for lm in hand:
            x, y = int(lm.x * w), int(lm.y * h)
            cv2.circle(display, (x, y), 5, (0, 255, 0), -1)

        cv2.putText(display, "HAND DETECTED - Press SPACE", (20, 40),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)
    else:
        cv2.putText(display, "NO HAND - Show your hand", (20, 40),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)

    cv2.imshow("Debug ASL", display)

    key = cv2.waitKey(1) & 0xFF

    if key == ord('q'):
        break

    if key == ord(' ') and result.hand_landmarks:
        # ============ PREDICT ============
        landmarks = np.array([[p.x, p.y] for p in result.hand_landmarks[0]], dtype=np.float32)
        print("\nRaw landmarks shape:", landmarks.shape)
        print("First 3 points:", landmarks[:3])

        features = normalize_landmarks(landmarks)
        print("Normalized features shape:", features.shape)
        print("Normalized (first 6 values):", features[:6])

        features = features.reshape(1, -1)

        # Use Random Forest (has predict_proba) or handle SVM safely
        clf_rf = models["random_forest"]
        clf_svm = models["svm"]

        # ----- Random Forest (recommended for now) -----
        pred_rf = clf_rf.predict(features)
        proba_rf = clf_rf.predict_proba(features)[0]
        label_rf = label_encoder.inverse_transform(pred_rf)[0]
        conf_rf = np.max(proba_rf) * 100

        top3_idx = np.argsort(proba_rf)[::-1][:3]

        print("\n===== RANDOM FOREST =====")
        print(f"Predicted : {label_rf}  ({conf_rf:.1f}%)")
        print("Top 3:")
        for idx in top3_idx:
            print(f"  {label_encoder.classes_[idx]:6} → {proba_rf[idx]*100:.1f}%")

        # ----- SVM (only class prediction) -----
        pred_svm = clf_svm.predict(features)
        label_svm = label_encoder.inverse_transform(pred_svm)[0]
        print("\n===== SVM =====")
        print(f"Predicted : {label_svm}")
        print("======================\n")

cap.release()
cv2.destroyAllWindows()
detector.close()