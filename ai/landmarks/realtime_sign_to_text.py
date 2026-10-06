import cv2
import mediapipe as mp
import joblib
import numpy as np
import time
from collections import deque
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

import os
import sys
_PKG_ROOT = os.path.dirname(os.path.abspath(__file__))            # ai/landmarks
_AI_ROOT = os.path.dirname(_PKG_ROOT)                             # ai/
_PROJ_ROOT = os.path.dirname(_AI_ROOT)                            # repo root
for _p in (_AI_ROOT, _PROJ_ROOT):
    if _p not in sys.path:
        sys.path.insert(0, _p)

from ai._paths import ASL_MODELS_PATH as MODEL_PATH, HAND_LANDMARKER_PATH as HAND_MODEL_PATH
from ai.inference.asl_engine import normalize_landmarks

# ===================== CONFIG =====================
# (MODEL_PATH / HAND_MODEL_PATH resolve from the repository root via _paths)
SMOOTHING_WINDOW = 11          # was 7 or 9
CONFIDENCE_THRESHOLD = 65.0    # lower it (was 70-75)
STABLE_COUNT = 5               # was 6
HOLD_TIME = 0.25               # was 0.30-0.35
RELEASE_FRAMES = 6

# ===================== LOAD =====================
print("Loading models...")
models = joblib.load(MODEL_PATH)
clf = models["svm"]          # or "svm"
label_encoder = models["label_encoder"]
print("Classes:", list(label_encoder.classes_))

base_options = python.BaseOptions(model_asset_path=HAND_MODEL_PATH)
options = vision.HandLandmarkerOptions(
    base_options=base_options,
    running_mode=vision.RunningMode.VIDEO,
    num_hands=1,
    min_hand_detection_confidence=0.6,
    min_hand_presence_confidence=0.6,
    min_tracking_confidence=0.6
)
detector = vision.HandLandmarker.create_from_options(options)

def put_text(frame, text, pos, size=0.7, color=(255,255,255), thickness=2):
    cv2.putText(frame, text, pos, cv2.FONT_HERSHEY_SIMPLEX,
                size, color, thickness, cv2.LINE_AA)

# ===================== STATE =====================
prediction_buffer = deque(maxlen=SMOOTHING_WINDOW)
text_buffer = ""
current_prediction = "-"
current_confidence = 0.0
stable_prediction = "-"
stable_since = None
committed_sign = None
hand_missing_frames = 0
last_timestamp = 0

cap = cv2.VideoCapture(0)
if not cap.isOpened():
    raise SystemExit("Cannot open webcam")

print("Sign → Text ready | Q=quit  C=clear  B=backspace  S=space")

while True:
    success, frame = cap.read()
    if not success:
        break

    frame = cv2.flip(frame, 1)
    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)

    timestamp = int(time.time() * 1000)
    if timestamp <= last_timestamp:
        timestamp = last_timestamp + 1
    last_timestamp = timestamp

    result = detector.detect_for_video(mp_image, timestamp)

    if result.hand_landmarks:
        hand_missing_frames = 0
        hand = result.hand_landmarks[0]

        landmarks = np.array([[p.x, p.y] for p in hand], dtype=np.float32)
        features = normalize_landmarks(landmarks).reshape(1, -1)

        pred = clf.predict(features)
        predicted_label = label_encoder.inverse_transform(pred)[0]
        confidence = float(np.max(clf.predict_proba(features)) * 100)

        current_prediction = predicted_label
        current_confidence = confidence

        if confidence >= CONFIDENCE_THRESHOLD:
            prediction_buffer.append(predicted_label)
        else:
            prediction_buffer.clear()
            stable_prediction = "-"
            stable_since = None

        if len(prediction_buffer) >= STABLE_COUNT:
            recent = list(prediction_buffer)[-STABLE_COUNT:]
            if len(set(recent)) == 1:
                new_stable = recent[0]
                if new_stable != stable_prediction:
                    stable_prediction = new_stable
                    stable_since = time.time()

                if stable_since is not None:
                    held = time.time() - stable_since
                    if held >= HOLD_TIME and committed_sign != stable_prediction:
                        if stable_prediction == "space":
                            if text_buffer and not text_buffer.endswith(" "):
                                text_buffer += " "
                        else:
                            text_buffer += stable_prediction
                        committed_sign = stable_prediction
                        stable_since = None
                        prediction_buffer.clear()

        # Draw landmarks
        h, w, _ = frame.shape
        for p in hand:
            x, y = int(p.x * w), int(p.y * h)
            cv2.circle(frame, (x, y), 5, (0, 255, 0), -1)

    else:
        hand_missing_frames += 1
        current_prediction = "-"
        current_confidence = 0.0
        prediction_buffer.clear()
        stable_prediction = "-"
        stable_since = None
        if hand_missing_frames >= RELEASE_FRAMES:
            committed_sign = None

    # ========== UI ==========
    h, w, _ = frame.shape
    put_text(frame, "ASL  →  TEXT", (20, 40), 1.0, (0,255,0), 3)
    put_text(frame, f"Current : {current_prediction}", (20, 80))
    put_text(frame, f"Conf    : {current_confidence:.1f}%", (20, 115))
    put_text(frame, f"Stable  : {stable_prediction}", (20, 150))
    put_text(frame, f"Committed: {committed_sign or '-'}", (20, 185))

    # Caption box
    box_top = h - 140
    cv2.rectangle(frame, (10, box_top), (w-10, h-10), (0,0,0), -1)
    put_text(frame, "CAPTION", (25, box_top + 35), 0.7, (0,255,255))
    display = text_buffer[-48:] if len(text_buffer) > 48 else text_buffer
    put_text(frame, display, (25, box_top + 90), 1.1, (255,255,255), 2)

    status = "HAND DETECTED" if result.hand_landmarks else "SHOW YOUR HAND"
    color = (0,255,0) if result.hand_landmarks else (0,0,255)
    put_text(frame, status, (w-290, 40), 0.65, color)

    put_text(frame, "Q Quit | C Clear | B Backspace | S Space",
             (20, h-155), 0.5, (180,180,180), 1)

    cv2.imshow("ASL → Text", frame)

    key = cv2.waitKey(1) & 0xFF
    if key == ord("q"):
        break
    elif key == ord("c"):
        text_buffer = ""
    elif key == ord("b") and text_buffer:
        text_buffer = text_buffer[:-1]
    elif key == ord("s"):
        if text_buffer and not text_buffer.endswith(" "):
            text_buffer += " "

cap.release()
cv2.destroyAllWindows()
detector.close()
print("Final caption:", text_buffer)