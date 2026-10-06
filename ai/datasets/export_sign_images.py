"""
Export a representative Signclusive_Mediapipe photo per ASL letter into the
frontend so the web app can *display the trained data* as the sign output.

For each label we pick the medoid sample row (landmarks closest to the class
mean) and copy that exact image to frontend/public/signs/{label}.jpg.
"""
import os
import shutil
import sys

_AI_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # ai/
_PROJ_ROOT = os.path.dirname(_AI_ROOT)                                   # repo root
for _p in (_AI_ROOT, _PROJ_ROOT):
    if _p not in sys.path:
        sys.path.insert(0, _p)

import numpy as np
import pandas as pd

from ai._paths import DATASET_CSV, IMAGE_ROOT

OUT_DIR = os.path.join(_PROJ_ROOT, 'frontend', 'public', 'signs')

# Dataset is nested: dataset/Signclusive_Mediapipe/Signclusive_Mediapipe/{label}
CANDIDATE_ROOTS = [
    IMAGE_ROOT,
    os.path.join(IMAGE_ROOT, 'Signclusive_Mediapipe'),
]


def _find_image(label, filename):
    for root in CANDIDATE_ROOTS:
        candidate = os.path.join(root, str(label), str(filename))
        if os.path.exists(candidate):
            return candidate
    return None


def main():
    df = pd.read_csv(DATASET_CSV)
    xy = df.filter(regex='^x[0-9]+$|^y[0-9]+$').columns
    labels = sorted(set(df['folder']))

    os.makedirs(OUT_DIR, exist_ok=True)
    copied = 0
    for label in labels:
        rows = df[df['folder'] == label]
        coords = rows[xy].to_numpy(dtype=np.float32)
        mean = coords.mean(axis=0)
        dists = np.linalg.norm(coords - mean, axis=1)
        best = int(np.argmin(dists))
        src = _find_image(label, rows.iloc[best]['filename'])
        dst = os.path.join(OUT_DIR, f'{label}.jpg')
        if os.path.exists(src):
            shutil.copyfile(src, dst)
            copied += 1
        else:
            print(f'!! missing image: {src}')
    print(f'Copied {copied}/{len(labels)} sign images -> {OUT_DIR}')


if __name__ == '__main__':
    main()