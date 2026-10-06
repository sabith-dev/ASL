import joblib
import numpy as np
import pandas as pd

import os
import sys
_AI_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # ai/
if _AI_ROOT not in sys.path:
    sys.path.insert(0, _AI_ROOT)

from ai._paths import ASL_MODELS_PATH, PROCESSED_DATA_PATH, ENCODER_PATH
from ai.inference.asl_engine import normalize_landmarks

# Load processed training data
data = joblib.load(PROCESSED_DATA_PATH)
label_encoder = joblib.load(ENCODER_PATH)

X_train = data["X_train"]
y_train = data["y_train"]

# Find some real "A" examples from training
a_indices = np.where(y_train == label_encoder.transform(["A"])[0])[0]

print("Number of 'A' samples in training:", len(a_indices))
print("\nFirst 3 training samples of letter A (normalized):")
for i, idx in enumerate(a_indices[:3]):
    sample = X_train[idx]
    print(f"\nA sample {i+1}:")
    print(sample[:12])   # first 6 landmarks (x,y)