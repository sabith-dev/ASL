import cv2
import mediapipe as mp

from mediapipe.tasks import python
from mediapipe.tasks.python import vision

import os
import sys
_AI_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # ai/
if _AI_ROOT not in sys.path:
    sys.path.insert(0, _AI_ROOT)

from ai._paths import HAND_LANDMARKER_PATH

# ============================================================
# CONFIGURATION
# ============================================================

MODEL_PATH = HAND_LANDMARKER_PATH


# ============================================================
# CHECK MODEL FILE
# ============================================================

import os

if not os.path.exists(MODEL_PATH):
    print("=" * 60)
    print("ERROR")
    print("=" * 60)
    print()
    print("MediaPipe hand landmark model was not found.")
    print()
    print("Expected:")
    print(MODEL_PATH)
    print()
    print("We need to download the MediaPipe hand_landmarker.task")
    print("model before running this test.")
    exit()


# ============================================================
# CREATE MEDIAPIPE HAND LANDMARKER
# ============================================================

base_options = python.BaseOptions(
    model_asset_path=MODEL_PATH
)

options = vision.HandLandmarkerOptions(
    base_options=base_options,
    running_mode=vision.RunningMode.VIDEO,
    num_hands=1,
    min_hand_detection_confidence=0.5,
    min_hand_presence_confidence=0.5,
    min_tracking_confidence=0.5
)

detector = vision.HandLandmarker.create_from_options(
    options
)


# ============================================================
# OPEN WEBCAM
# ============================================================

cap = cv2.VideoCapture(0)

if not cap.isOpened():
    print("ERROR: Could not open webcam.")
    detector.close()
    exit()


print("=" * 60)
print("MEDIAPIPE HAND LANDMARK TEST")
print("=" * 60)
print()
print("Webcam started.")
print("Show your hand to the camera.")
print("Press Q to quit.")
print()


frame_timestamp = 0


# ============================================================
# WEBCAM LOOP
# ============================================================

while True:

    success, frame = cap.read()

    if not success:
        print("ERROR: Could not read webcam frame.")
        break

    # --------------------------------------------------------
    # Mirror the webcam
    # --------------------------------------------------------

    frame = cv2.flip(frame, 1)

    # --------------------------------------------------------
    # Convert BGR → RGB
    # --------------------------------------------------------

    rgb_frame = cv2.cvtColor(
        frame,
        cv2.COLOR_BGR2RGB
    )

    # --------------------------------------------------------
    # Convert OpenCV image to MediaPipe image
    # --------------------------------------------------------

    mp_image = mp.Image(
        image_format=mp.ImageFormat.SRGB,
        data=rgb_frame
    )

    # --------------------------------------------------------
    # Detect hand landmarks
    # --------------------------------------------------------

    frame_timestamp += 33

    result = detector.detect_for_video(
        mp_image,
        frame_timestamp
    )

    # --------------------------------------------------------
    # Check whether a hand was detected
    # --------------------------------------------------------

    if result.hand_landmarks:

        hand = result.hand_landmarks[0]

        # ----------------------------------------------------
        # Extract 21 X/Y landmarks
        # ----------------------------------------------------

        landmarks = []

        for landmark in hand:

            x = landmark.x
            y = landmark.y

            landmarks.append([x, y])

        # ----------------------------------------------------
        # Draw landmarks
        # ----------------------------------------------------

        h, w, _ = frame.shape

        for landmark in hand:

            x = int(landmark.x * w)
            y = int(landmark.y * h)

            cv2.circle(
                frame,
                (x, y),
                5,
                (0, 255, 0),
                -1
            )

        # ----------------------------------------------------
        # Draw connections
        # ----------------------------------------------------

        connections = [
            (0, 1),
            (1, 2),
            (2, 3),
            (3, 4),

            (0, 5),
            (5, 6),
            (6, 7),
            (7, 8),

            (0, 9),
            (9, 10),
            (10, 11),
            (11, 12),

            (0, 13),
            (13, 14),
            (14, 15),
            (15, 16),

            (0, 17),
            (17, 18),
            (18, 19),
            (19, 20),

            (5, 9),
            (9, 13),
            (13, 17),
        ]

        for start, end in connections:

            x1 = int(hand[start].x * w)
            y1 = int(hand[start].y * h)

            x2 = int(hand[end].x * w)
            y2 = int(hand[end].y * h)

            cv2.line(
                frame,
                (x1, y1),
                (x2, y2),
                (0, 255, 0),
                2
            )

        # ----------------------------------------------------
        # Display information
        # ----------------------------------------------------

        cv2.putText(
            frame,
            "HAND DETECTED",
            (20, 40),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.8,
            (0, 255, 0),
            2
        )

        cv2.putText(
            frame,
            "21 LANDMARKS",
            (20, 75),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.7,
            (0, 255, 0),
            2
        )

        print(
            "Landmarks:",
            len(landmarks),
            "Shape:",
            (len(landmarks), len(landmarks[0]))
        )

    else:

        cv2.putText(
            frame,
            "NO HAND DETECTED",
            (20, 40),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.8,
            (0, 0, 255),
            2
        )

    # --------------------------------------------------------
    # Show webcam
    # --------------------------------------------------------

    cv2.imshow(
        "ASL - MediaPipe Hand Detection",
        frame
    )

    # --------------------------------------------------------
    # Quit
    # --------------------------------------------------------

    key = cv2.waitKey(1) & 0xFF

    if key == ord("q"):
        break


# ============================================================
# CLEANUP
# ============================================================

cap.release()
cv2.destroyAllWindows()
detector.close()

print()
print("Webcam closed.")