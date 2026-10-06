"""
Feature extraction shared by custom-sign training and live inference.

A recorded custom sign is a short sequence of per-frame landmarks where each
frame bundles at least the primary hand (21 pts) and ideally the full-body
pose (33 pts). This module turns such a sequence into a fixed-length vector:

    1. Per frame, build a scale/translation-invariant 58-dim vector:
           Hand 1  42  -> wrist-relative, normalized by hand size     (x, y)
           Upper   16  -> shoulders/elbows/wrists/hips, normalized by
                          shoulder width, hips-relative              (x, y)
    2. Resample the frame sequence to ``L`` frames and flatten -> ``L*58``.

Both the training script and the runtime classifier must use the exact same
extractor, so it lives here as the single source of truth.
"""
import numpy as np

# MediaPipe PoseLandmarker joint indices for the upper-body skeleton.
POSE_UPPER = [11, 12, 13, 14, 15, 16, 23, 24]

DEFAULT_RESAMPLE = 32


def _as_points(value, cols):
    """
    Coerce any point list into an (n, cols) float32 array. Points may be dicts
    ({x, y, z, visibility}) or numeric iterables — both forms occur in stored
    recordings and live frames.
    """
    rows = []
    if not value:
        return np.zeros((0, cols), dtype=np.float32)
    for p in value:
        if isinstance(p, dict):
            row = [p.get('x', 0), p.get('y', 0), p.get('z', 0), p.get('visibility', 0)]
        elif isinstance(p, (list, tuple, np.ndarray)) and len(p):
            row = list(p)
            while len(row) < 4:
                row.append(0.0)
        else:
            row = [0.0, 0.0, 0.0, 0.0]
        rows.append([float(v) for v in row[:4]])
    arr = np.asarray(rows, dtype=np.float32)
    if arr.shape[1] < cols:
        pad = np.zeros((arr.shape[0], cols - arr.shape[1]), dtype=np.float32)
        arr = np.hstack([arr, pad])
    return arr[:, :cols]


def per_frame_vector(hand, pose):
    """
    hand: 21 pts or None
    pose: 33 pts or None  (image-normalized coordinates)

    Returns a flat 58-dim float32 vector.
    """
    # --- Hand 1: wrist-relative, hand-size scale ---------------------------
    h = np.zeros((21, 2), dtype=np.float32)
    if hand is not None:
        arr = _as_points(hand, 2)
        if arr.shape[0] < 21:
            pad = np.zeros((21 - arr.shape[0], 2), dtype=np.float32)
            arr = np.vstack([arr, pad])
        arr = arr[:21]
        wrist = arr[0]
        moved = arr - wrist
        scale = float(np.max(np.sqrt(np.sum(moved ** 2, axis=1)))) if len(arr) else 0.0
        h = (moved / scale) if scale > 1e-6 else moved

    # --- Pose: shoulder-mid origin, shoulder-width scale --------------------
    p = np.zeros((8, 2), dtype=np.float32)
    if pose is not None:
        arr = _as_points(pose, 4)
        if arr.shape[0] < 33:
            pad = np.zeros((33 - arr.shape[0], 4), dtype=np.float32)
            arr = np.vstack([arr, pad])
        pts = arr[:33, :2]
        joints = pts[POSE_UPPER].copy()

        # Neutralize low-visibility joints (hidden behind body) by snapping
        # them to the shoulder midpoint so they do not distort the shape.
        vis = arr[:33, 3]
        low = vis[POSE_UPPER] < 0.15
        mid = (pts[11] + pts[12]) / 2
        joints[low] = mid

        left_shoulder = joints[0]
        right_shoulder = joints[1]
        origin = (left_shoulder + right_shoulder) / 2
        scale = float(np.linalg.norm(left_shoulder - right_shoulder))
        p = (joints - origin) / scale if scale > 1e-6 else joints - origin

    return np.hstack([h.flatten(), p.flatten()]).astype(np.float32)


def resample_vectors(vectors, length=DEFAULT_RESAMPLE):
    """
    Resample a list of per-frame 58-dim vectors to ``length`` rows (linear
    index picking). Returns (n, 58) float32 array.
    """
    arr = np.asarray(vectors, dtype=np.float32)
    if arr.ndim != 2 or len(arr) == 0:
        return np.zeros((length, arr.shape[1]) if arr.ndim == 2 else (length, 0),
                        dtype=np.float32)
    n = len(arr)
    if n == length:
        return arr
    indices = np.linspace(0, n - 1, length).astype(np.int64)
    return arr[indices]


def _is_point(p):
    """True when ``p`` looks like a single landmark: dict or scalar tuple."""
    if isinstance(p, dict):
        return True
    if isinstance(p, (list, tuple, np.ndarray)) and len(p):
        return not isinstance(p[0], (list, tuple, dict, np.ndarray))
    return False


def _pick_primary(value):
    """
    Return the point list (21-pt hand / 33-pt pose) from a frame value.

    ``value`` may be a direct point list ([[x,y], ...] or [{x,y,z}, ...]) or a
    batch of them ([[hand1...], [hand2...]]); in the batch case the first
    (primary) is used. Points may be numeric lists or dicts.
    """
    if not isinstance(value, (list, tuple)) or not value:
        return None
    first = value[0]
    if _is_point(first):
        return value
    return value[0]


def parse_frame(frame):
    """Split any supported frame shape into (hand21, pose33) point lists."""
    if not isinstance(frame, dict):
        return _pick_primary(frame), None
    hand = frame.get('h')
    if hand is None:
        hand = _pick_primary(frame.get('hands'))
    pose = frame.get('p')
    if pose is None:
        pose = _pick_primary(frame.get('pose'))
    return hand, pose


def sequence_feature(frames, resample_length=DEFAULT_RESAMPLE):
    """
    frames: list of dicts ({h/p} direct point lists or {hands/pose} batches)
    or legacy list-of-hand-arrays.

    Returns a flat (resample_length * 58,) float32 vector.
    """
    vecs = []
    for frame in frames:
        hand, pose = parse_frame(frame)
        vecs.append(per_frame_vector(hand, pose))
    vecs = resample_vectors(vecs, resample_length)

    # Down-weight the pose channels a touch so a missing body never lets noisy
    # zeros dominate the hand motion signal.
    feats = vecs.copy()
    feats[:, 42:] = feats[:, 42:] * 0.8
    return feats.flatten().astype(np.float32)


def feature_dim(resample_length=DEFAULT_RESAMPLE):
    return resample_length * 58