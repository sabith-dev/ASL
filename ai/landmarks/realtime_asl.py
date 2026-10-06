import cv2
import mediapipe as mp
import joblib
import numpy as np
import time
from collections import deque

from mediapipe.tasks import python
from mediapipe.tasks.python import vision


from _paths import ASL_MODELS_PATH, HAND_LANDMARKER_PATH

# ============================================================
# CONFIGURATION
# ============================================================

MODEL_PATH = ASL_MODELS_PATH
HAND_MODEL_PATH = HAND_LANDMARKER_PATH

# Number of predictions used for smoothing
SMOOTHING_WINDOW = 7

# Minimum confidence
CONFIDENCE_THRESHOLD = 70.0

# Number of identical predictions needed
STABLE_COUNT = 5

# How long a sign must remain stable before committing
HOLD_TIME = 0.30

# Number of frames with no hand required to unlock
RELEASE_FRAMES = 6


# ============================================================
# LOAD MODEL
# ============================================================

print("=" * 60)
print("ASL -> TEXT - VERSION 3")
print("=" * 60)

print("\nLoading ASL models...")

models = joblib.load(MODEL_PATH)

random_forest = models["random_forest"]
label_encoder = models["label_encoder"]

print("Models loaded.")

print("\nAvailable classes:")

for label in label_encoder.classes_:
    print(" -", label)


# ============================================================
# MEDIAPIPE
# ============================================================

base_options = python.BaseOptions(
    model_asset_path=HAND_MODEL_PATH
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
# NORMALIZATION
# ============================================================

def normalize_landmarks(landmarks):

    landmarks = np.asarray(
        landmarks,
        dtype=np.float32
    ).copy()

    if landmarks.shape != (21, 2):

        raise ValueError(
            f"Expected (21, 2), got {landmarks.shape}"
        )

    # Wrist → origin
    wrist = landmarks[0].copy()

    landmarks = landmarks - wrist

    # Scale normalization
    distances = np.sqrt(
        landmarks[:, 0] ** 2 +
        landmarks[:, 1] ** 2
    )

    scale = np.max(distances)

    if scale > 0:

        landmarks = landmarks / scale

    return landmarks.flatten()


# ============================================================
# DRAW TEXT
# ============================================================

def put_text(
    frame,
    text,
    position,
    size=0.7,
    color=(255, 255, 255),
    thickness=2
):

    cv2.putText(
        frame,
        text,
        position,
        cv2.FONT_HERSHEY_SIMPLEX,
        size,
        color,
        thickness,
        cv2.LINE_AA
    )


# ============================================================
# WEBCAM
# ============================================================

cap = cv2.VideoCapture(0)

if not cap.isOpened():

    print("ERROR: Cannot open webcam.")

    detector.close()

    raise SystemExit


# ============================================================
# STATE VARIABLES
# ============================================================

prediction_buffer = deque(
    maxlen=SMOOTHING_WINDOW
)

text_buffer = ""

current_prediction = "-"
current_confidence = 0.0

stable_prediction = "-"

stable_since = None

committed_sign = None

hand_missing_frames = 0

last_timestamp = 0


# ============================================================
# MAIN LOOP
# ============================================================

while True:

    success, frame = cap.read()

    if not success:

        print("ERROR: Could not read webcam.")

        break


    # --------------------------------------------------------
    # Mirror camera
    # --------------------------------------------------------

    frame = cv2.flip(frame, 1)


    # --------------------------------------------------------
    # RGB
    # --------------------------------------------------------

    rgb = cv2.cvtColor(
        frame,
        cv2.COLOR_BGR2RGB
    )


    mp_image = mp.Image(
        image_format=mp.ImageFormat.SRGB,
        data=rgb
    )


    # --------------------------------------------------------
    # Timestamp
    # --------------------------------------------------------

    timestamp = int(
        time.time() * 1000
    )

    if timestamp <= last_timestamp:

        timestamp = last_timestamp + 1

    last_timestamp = timestamp


    # --------------------------------------------------------
    # Detect
    # --------------------------------------------------------

    result = detector.detect_for_video(
        mp_image,
        timestamp
    )


    # ========================================================
    # HAND DETECTED
    # ========================================================

    if result.hand_landmarks:

        hand_missing_frames = 0

        hand = result.hand_landmarks[0]


        # ----------------------------------------------------
        # Extract 21 x/y points
        # ----------------------------------------------------

        landmarks = np.array(
            [
                [point.x, point.y]
                for point in hand
            ],
            dtype=np.float32
        )


        # ----------------------------------------------------
        # Normalize
        # ----------------------------------------------------

        features = normalize_landmarks(
            landmarks
        ).reshape(1, -1)


        # ----------------------------------------------------
        # Predict
        # ----------------------------------------------------

        prediction = random_forest.predict(
            features
        )

        predicted_label = label_encoder.inverse_transform(
            prediction
        )[0]


        # ----------------------------------------------------
        # Probability
        # ----------------------------------------------------

        probabilities = random_forest.predict_proba(
            features
        )

        confidence = float(
            np.max(probabilities) * 100
        )


        current_prediction = predicted_label
        current_confidence = confidence


        # ----------------------------------------------------
        # Confidence filter
        # ----------------------------------------------------

        if confidence >= CONFIDENCE_THRESHOLD:

            prediction_buffer.append(
                predicted_label
            )

        else:

            prediction_buffer.clear()

            stable_prediction = "-"

            stable_since = None


        # ====================================================
        # STABILITY CHECK
        # ====================================================

        if len(prediction_buffer) >= STABLE_COUNT:

            recent = list(prediction_buffer)

            last_predictions = recent[
                -STABLE_COUNT:
            ]


            # All recent predictions identical
            if len(set(last_predictions)) == 1:

                new_stable_prediction = (
                    last_predictions[0]
                )


                # --------------------------------------------
                # New stable sign
                # --------------------------------------------

                if (
                    new_stable_prediction
                    != stable_prediction
                ):

                    stable_prediction = (
                        new_stable_prediction
                    )

                    stable_since = time.time()


                # --------------------------------------------
                # Existing stable sign
                # --------------------------------------------

                if stable_since is not None:

                    held_time = (
                        time.time() -
                        stable_since
                    )


                    # ----------------------------------------
                    # Commit after HOLD_TIME
                    # ----------------------------------------

                    if (
                        held_time >= HOLD_TIME
                        and
                        committed_sign
                        != stable_prediction
                    ):

                        # ====================================
                        # SPACE
                        # ====================================

                        if stable_prediction == "space":

                            if (
                                len(text_buffer) > 0
                                and
                                not text_buffer.endswith(" ")
                            ):

                                text_buffer += " "


                        # ====================================
                        # LETTER
                        # ====================================

                        else:

                            text_buffer += (
                                stable_prediction
                            )


                        # Lock this sign
                        committed_sign = (
                            stable_prediction
                        )

                        stable_since = None

                        prediction_buffer.clear()


        # ----------------------------------------------------
        # Draw landmarks
        # ----------------------------------------------------

        h, w, _ = frame.shape

        for point in hand:

            x = int(point.x * w)
            y = int(point.y * h)

            cv2.circle(
                frame,
                (x, y),
                5,
                (0, 255, 0),
                -1
            )


    # ========================================================
    # NO HAND
    # ========================================================

    else:

        hand_missing_frames += 1

        current_prediction = "-"
        current_confidence = 0.0

        prediction_buffer.clear()

        stable_prediction = "-"

        stable_since = None


        # ----------------------------------------------------
        # Unlock after hand release
        # ----------------------------------------------------

        if hand_missing_frames >= RELEASE_FRAMES:

            committed_sign = None


    # ========================================================
    # UI
    # ========================================================

    height, width, _ = frame.shape


    # --------------------------------------------------------
    # Title
    # --------------------------------------------------------

    put_text(
        frame,
        "ASL -> TEXT",
        (20, 40),
        size=1.0,
        color=(0, 255, 0),
        thickness=3
    )


    # --------------------------------------------------------
    # Current
    # --------------------------------------------------------

    put_text(
        frame,
        f"Current Sign: {current_prediction}",
        (20, 80)
    )


    # --------------------------------------------------------
    # Confidence
    # --------------------------------------------------------

    put_text(
        frame,
        f"Confidence: {current_confidence:.1f}%",
        (20, 115)
    )


    # --------------------------------------------------------
    # Stable
    # --------------------------------------------------------

    put_text(
        frame,
        f"Stable: {stable_prediction}",
        (20, 150)
    )


    # --------------------------------------------------------
    # Committed
    # --------------------------------------------------------

    committed_display = (
        committed_sign
        if committed_sign is not None
        else "-"
    )

    put_text(
        frame,
        f"Committed: {committed_display}",
        (20, 185)
    )


    # ========================================================
    # CAPTION BOX
    # ========================================================

    box_top = height - 155

    cv2.rectangle(
        frame,
        (10, box_top),
        (width - 10, height - 10),
        (0, 0, 0),
        -1
    )


    put_text(
        frame,
        "CAPTION",
        (25, box_top + 38),
        size=0.7,
        color=(0, 255, 255)
    )


    # --------------------------------------------------------
    # Caption
    # --------------------------------------------------------

    display_text = text_buffer

    if len(display_text) > 42:

        display_text = display_text[-42:]


    put_text(
        frame,
        display_text,
        (25, box_top + 92),
        size=1.0,
        color=(255, 255, 255),
        thickness=2
    )


    # ========================================================
    # STATUS
    # ========================================================

    if result.hand_landmarks:

        status = "HAND DETECTED"
        status_color = (0, 255, 0)

    else:

        status = "SHOW YOUR HAND"
        status_color = (0, 0, 255)


    put_text(
        frame,
        status,
        (width - 270, 40),
        size=0.65,
        color=status_color,
        thickness=2
    )


    # ========================================================
    # CONTROLS
    # ========================================================

    put_text(
        frame,
        "Q Quit | C Clear | B Backspace | S Space",
        (20, height - 165),
        size=0.48,
        color=(200, 200, 200),
        thickness=1
    )


    # ========================================================
    # DISPLAY
    # ========================================================

    cv2.imshow(
        "ASL -> TEXT",
        frame
    )


    # ========================================================
    # KEYBOARD
    # ========================================================

    key = cv2.waitKey(1) & 0xFF


    if key == ord("q"):

        break


    elif key == ord("c"):

        text_buffer = ""


    elif key == ord("b"):

        if len(text_buffer) > 0:

            text_buffer = text_buffer[:-1]


    elif key == ord("s"):

        if (
            len(text_buffer) > 0
            and not text_buffer.endswith(" ")
        ):

            text_buffer += " "


# ============================================================
# CLEANUP
# ============================================================

cap.release()

cv2.destroyAllWindows()

detector.close()


print("\n" + "=" * 60)
print("FINAL CAPTION")
print("=" * 60)

print(text_buffer)

print("\nASL system stopped.")