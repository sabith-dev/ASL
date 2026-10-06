"""
Shared filesystem anchors for the AI pipeline.

Scripts in ``ai/`` may be run from any working directory, so every path
is resolved from the repository root.
"""
import os

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

COMBINED_DATASET_CSV = os.path.join(PROJECT_ROOT, 'dataset', 'combined_hand_keypoints.csv')
DEFAULT_DATASET_CSV = os.path.join(PROJECT_ROOT, 'dataset', 'hand_keypoints.csv')
DATASET_CSV = COMBINED_DATASET_CSV if os.path.exists(COMBINED_DATASET_CSV) else DEFAULT_DATASET_CSV
IMAGE_ROOT = os.path.join(PROJECT_ROOT, 'dataset', 'Signclusive_Mediapipe')

MODEL_DIR = os.path.join(PROJECT_ROOT, 'models')
ASL_MODELS_PATH = os.path.join(MODEL_DIR, 'asl_models.pkl')
PROCESSED_DATA_PATH = os.path.join(MODEL_DIR, 'processed_data.pkl')
ENCODER_PATH = os.path.join(MODEL_DIR, 'label_encoder.pkl')
HAND_LANDMARKER_PATH = os.path.join(MODEL_DIR, 'hand_landmarker.task')

MOTION_DATASET_CSV = os.path.join(PROJECT_ROOT, 'dataset', 'motion_hand_sequences.csv')
MOTION_MODELS_PATH = os.path.join(MODEL_DIR, 'asl_motion_models.pkl')
PROCESSED_MOTION_DATA_PATH = os.path.join(MODEL_DIR, 'processed_motion_data.pkl')
MOTION_ENCODER_PATH = os.path.join(MODEL_DIR, 'motion_label_encoder.pkl')

OUTPUT_DIR = os.path.join(PROJECT_ROOT, 'ai', 'outputs')