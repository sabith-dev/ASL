import os
import threading
import joblib
import numpy as np
from ai.preprocessing.landmark_utils import normalize_landmarks
from ai.inference.custom_signs import classify_custom_sequence

CUSTOM_DETECT_KEY = 'custom_sign'

# The retrained base model votes across svm + random_forest + logistic_regression;
# see models/letters_training_report.json. Older pickles only carry the three
# singles, so the fallbacks keep an old model file loadable.
DEFAULT_MODEL = 'ensemble'
MODEL_FALLBACKS = ('ensemble', 'svm', 'random_forest', 'logistic_regression')

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MODEL_PATH = os.path.join(PROJECT_ROOT, 'models', 'asl_models.pkl')
MOTION_MODEL_PATH = os.path.join(PROJECT_ROOT, 'models', 'asl_motion_models.pkl')

_models = None
_motion_models = None
_lock = threading.Lock()


class ASLModelError(Exception):
    pass


def load_models():
    global _models, _motion_models
    if _models is not None:
        return _models
    with _lock:
        if _models is None:
            if not os.path.exists(MODEL_PATH):
                raise ASLModelError(f'Model file not found: {MODEL_PATH}')
            _models = joblib.load(MODEL_PATH)
        if _motion_models is None and os.path.exists(MOTION_MODEL_PATH):
            try:
                _motion_models = joblib.load(MOTION_MODEL_PATH)
            except Exception as e:
                print(f"Warning: Failed to load motion models: {e}")
    return _models


def get_models():
    if _models is None:
        load_models()
    return _models


def get_motion_models():
    if _motion_models is None and os.path.exists(MOTION_MODEL_PATH):
        load_models()
    return _motion_models


def calibrate_scores(raw_scores, temperature=0.08):
    """
    Temperature softmax scaling to produce calibrated, crisp confidence scores.
    """
    eps = 1e-12
    raw_scores = np.clip(raw_scores, eps, 1.0 - eps)
    logits = np.log(raw_scores) / temperature
    exp_logits = np.exp(logits - np.max(logits))
    calibrated = exp_logits / np.sum(exp_logits)
    return calibrated


def _frame_wrist(frame):
    """
    Extract the wrist (landmark 0) from a single-frame landmark input.
    Handles frames given as: a hand of 21 points, [hand] wrapper, or [hand1, hand2].
    """
    arr = np.asarray(frame, dtype=np.float32)
    if arr.ndim == 3:
        arr = arr[0]
    if arr.ndim == 1:
        arr = arr.reshape(-1, 2)
    if arr.ndim == 2:
        if arr.shape[0] < 21 and arr.shape[1] >= 21:
            arr = arr.T
        arr = arr[:21]
    return arr[0]


def _frame_hand(frame):
    """
    Pull the primary hand from a frame, whether the frame is a legacy array
    ([hand1], [hand1, hand2], 21 pts, ...) or a new dict {h, p}.
    Returns a (21, 2) float32 array or None.
    """
    if isinstance(frame, dict):
        hand = frame.get('h')
        if hand is None:
            hands = frame.get('hands')
            if isinstance(hands, (list, tuple)) and hands:
                hand = hands[0]
        if hand is None:
            return None
        arr = np.asarray(hand, dtype=np.float32)
        if arr.ndim == 1:
            arr = arr.reshape(-1, 2)
        if arr.ndim == 2:
            arr = arr[:, :2]
        if arr.shape[0] < 21:
            arr = np.vstack([arr, np.zeros((21 - arr.shape[0], 2), dtype=np.float32)])
        return arr[:21]
    try:
        arr = np.asarray(frame, dtype=np.float32)
    except Exception:
        return None
    if arr.ndim == 3:
        arr = arr[0]
    if arr.ndim == 1:
        arr = arr.reshape(-1, 2)
    if arr.ndim == 2:
        if arr.shape[0] == 42:
            arr = arr[:21]
        elif arr.shape[0] < 21 and arr.shape[1] >= 21:
            arr = arr.T
        arr = arr[:21]
    return arr


def extract_motion_features_from_sequence(raw_frames):
    if len(raw_frames) == 0:
        return None, 0.0, [0.0, 0.0], 'STATIONARY'

    NUM_SAMPLES = 10
    total_frames = len(raw_frames)
    if total_frames >= NUM_SAMPLES:
        indices = np.linspace(0, total_frames - 1, NUM_SAMPLES, dtype=int)
        sampled_frames = [raw_frames[i] for i in indices]
    else:
        sampled_frames = list(raw_frames)
        while len(sampled_frames) < NUM_SAMPLES:
            sampled_frames.append(sampled_frames[-1])

    norm_poses = []
    wrist_positions = []
    for frame in sampled_frames:
        norm_vec = normalize_landmarks(frame)
        norm_poses.append(norm_vec)
        wrist_positions.append(_frame_wrist(frame))

    norm_poses = np.array(norm_poses)
    wrist_positions = np.array(wrist_positions)

    wrist_deltas = np.diff(wrist_positions, axis=0)
    total_wrist_distance = float(np.sum(np.sqrt(np.sum(wrist_deltas**2, axis=1))))
    net_wrist_displacement = wrist_positions[-1] - wrist_positions[0]

    pose_deltas = np.diff(norm_poses, axis=0)
    mean_pose_velocity = np.mean(np.abs(pose_deltas), axis=0)

    start_pose = norm_poses[0]
    mid_pose = norm_poses[NUM_SAMPLES // 2]
    end_pose = norm_poses[-1]
    mean_pose = np.mean(norm_poses, axis=0)
    std_pose = np.std(norm_poses, axis=0)

    feature_vector = np.hstack([
        mean_pose,
        std_pose,
        start_pose,
        end_pose,
        mid_pose,
        mean_pose_velocity,
        net_wrist_displacement,
        [total_wrist_distance]
    ])

    dx, dy = net_wrist_displacement[0], net_wrist_displacement[1]
    if total_wrist_distance < 0.05 and abs(dx) < 0.03 and abs(dy) < 0.03:
        direction = 'STATIONARY'
    elif abs(dx) > abs(dy):
        direction = 'RIGHT' if dx > 0 else 'LEFT'
    else:
        direction = 'DOWN' if dy > 0 else 'UP'

    return feature_vector, total_wrist_distance, [float(dx), float(dy)], direction


def resolve_model_key(models, model_name=None):
    if model_name in models:
        return model_name
    for candidate in MODEL_FALLBACKS:
        if candidate in models:
            return candidate
    for key in models:
        if key != 'label_encoder' and hasattr(models[key], 'predict'):
            return key
    raise ASLModelError('No usable classifier found in the model file')


def predict(features, model_name=DEFAULT_MODEL):
    models = get_models()
    clf = models[resolve_model_key(models, model_name)]
    encoder = models['label_encoder']
    features = np.asarray(features, dtype=np.float32).reshape(1, -1)

    if hasattr(clf, 'predict_proba'):
        scores = clf.predict_proba(features)[0]
    else:
        distances = clf.decision_function(features)[0]
        scores = 1.0 / (1.0 + np.exp(-distances))
        scores = scores / (np.sum(scores) + 1e-9)

    calibrated_scores = calibrate_scores(scores, temperature=0.08)

    order = np.argsort(calibrated_scores)[::-1]
    top = []
    for idx in order[:5]:
        label = str(encoder.inverse_transform([idx])[0])
        conf = float(calibrated_scores[idx]) * 100
        top.append({'label': label, 'confidence': round(min(max(conf, 0), 100), 2)})

    predicted = str(encoder.inverse_transform([order[0]])[0])
    conf = float(calibrated_scores[order[0]]) * 100

    return {
        'prediction': predicted,
        'confidence': round(min(max(conf, 0), 100), 2),
        'top5': top,
    }


def predict_from_landmarks(landmarks, model_name=DEFAULT_MODEL):
    features = normalize_landmarks(landmarks)
    res = predict(features, model_name=model_name)
    res['is_motion'] = False
    res['motion_speed'] = 0.0
    res['trajectory'] = 'STATIONARY'
    return res


def predict_sequence_from_landmarks(landmark_sequence, model_name=DEFAULT_MODEL):
    if not landmark_sequence or len(landmark_sequence) == 0:
        raise ValueError("Landmark sequence cannot be empty")

    hand_frames = []
    for f in landmark_sequence:
        h = _frame_hand(f)
        if h is not None:
            hand_frames.append(h)
    if not hand_frames:
        raise ValueError("No hand landmarks found in sequence")

    motion_vec, wrist_speed, displacement, direction = extract_motion_features_from_sequence(hand_frames)

    # Live reading uses the static hand-shape model on the latest frame so the
    # letter/word classification is deterministic and stable — hand movement
    # between signs never triggers stray dynamic-word predictions.
    # Motion metadata is still returned for display only.
    res = predict_from_landmarks(hand_frames[-1], model_name=model_name)
    res['is_motion'] = False
    res['motion_speed'] = round(wrist_speed, 4)
    res['trajectory'] = direction
    res['displacement'] = [round(displacement[0], 4), round(displacement[1], 4)]

    # Custom signs: when enough frames have accumulated, check the trained
    # custom-sign model. A confident match wins over the static reading so the
    # user's own trained gestures surface in Sign-to-Text / Conversation.
    custom = classify_custom_sequence(landmark_sequence)
    if custom is not None:
        res['prediction'] = custom['label']
        res['confidence'] = max(res['confidence'], custom['confidence'])
        res[CUSTOM_DETECT_KEY] = True
        res['custom_gap'] = custom['gap']
    else:
        res[CUSTOM_DETECT_KEY] = False
    return res