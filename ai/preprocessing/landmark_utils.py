import numpy as np


def normalize_landmarks(landmarks):
    """
    Normalize 1-hand (21 landmarks) or 2-hand (42 landmarks) MediaPipe inputs.

    Input:
        landmarks -> array/list of shape (21, 2), (21, 3), (42, 2), or list of hands [hand1, hand2]

    Output:
        flattened 84-feature normalized vector:
        [Hand1_normalized (42), Hand2_normalized (42)]
    """
    if isinstance(landmarks, (list, tuple)) and len(landmarks) > 0 and isinstance(landmarks[0], (list, tuple, np.ndarray)):
        # Check if list of hand arrays [[pt1...pt21], [pt1...pt21]]
        if len(landmarks) == 2 and len(landmarks[0]) == 21:
            h1 = np.asarray(landmarks[0], dtype=np.float32)[:, :2]
            h2 = np.asarray(landmarks[1], dtype=np.float32)[:, :2]
        elif len(landmarks) == 1 and len(landmarks[0]) == 21:
            h1 = np.asarray(landmarks[0], dtype=np.float32)[:, :2]
            h2 = None
        else:
            arr = np.asarray(landmarks, dtype=np.float32)
            if arr.ndim == 2:
                if arr.shape[0] == 21:
                    h1 = arr[:, :2]
                    h2 = None
                elif arr.shape[0] == 42:
                    h1 = arr[:21, :2]
                    h2 = arr[21:, :2]
                else:
                    raise ValueError(f"Expected 21 or 42 landmarks, got shape {arr.shape}")
            else:
                arr = arr.reshape(-1, 2)
                h1 = arr[:21]
                h2 = arr[21:] if arr.shape[0] >= 42 else None
    else:
        arr = np.asarray(landmarks, dtype=np.float32)
        if arr.shape == (21, 2) or arr.shape == (21, 3):
            h1 = arr[:, :2]
            h2 = None
        elif arr.shape == (42, 2) or arr.shape == (42, 3):
            h1 = arr[:21, :2]
            h2 = arr[21:, :2]
        elif arr.size == 42:
            h1 = arr.reshape(21, 2)
            h2 = None
        elif arr.size == 84:
            h1 = arr[:42].reshape(21, 2)
            h2 = arr[42:].reshape(21, 2)
        else:
            raise ValueError(f"Unsupported landmark shape: {arr.shape}")

    # Normalize Hand 1 relative to Wrist 1
    w1 = h1[0].copy()
    h1_moved = h1 - w1
    dists1 = np.sqrt(h1_moved[:, 0]**2 + h1_moved[:, 1]**2)
    scale1 = np.max(dists1)
    if scale1 > 0:
        h1_norm = h1_moved / scale1
    else:
        h1_norm = h1_moved

    # Normalize Hand 2 relative to Wrist 1 (to preserve inter-hand distance & posture)
    if h2 is not None and np.any(h2):
        h2_moved = h2 - w1
        if scale1 > 0:
            h2_norm = h2_moved / scale1
        else:
            dists2 = np.sqrt(h2_moved[:, 0]**2 + h2_moved[:, 1]**2)
            scale2 = np.max(dists2)
            h2_norm = h2_moved / scale2 if scale2 > 0 else h2_moved
    else:
        h2_norm = np.zeros((21, 2), dtype=np.float32)

    return np.hstack([h1_norm.flatten(), h2_norm.flatten()])