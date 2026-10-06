# SignBridge AI

AI-powered bidirectional American Sign Language communication system for real-time speech-to-sign and sign-to-text translation.

SignBridge AI is a full-stack web application that enables:
- Speech → Sign: convert spoken English into ASL-style gloss and sign sequence output
- Sign → Text: recognize hand gestures from a webcam and convert them into live text captions
- Conversation mode: combine both experiences side by side in a shared transcript view
- Learn ASL: browse ASL reference cards and handshape examples
- Train custom signs: collect real user-specific sign samples and train a custom recognizer

---

## Overview

SignBridge AI bridges communication between hearing and deaf users by combining:
- React + Vite frontend for interactive browser experience
- Django REST API backend for model serving and data endpoints
- MediaPipe hand tracking for live landmark extraction
- scikit-learn models for sign classification
- ASL gloss conversion logic for English-to-ASL reordering

The system supports both directions:
- A hearing user can speak and see an ASL-informed sign sequence
- A signer can perform a sign and have it recognized as live text

---

## Key Features

### Speech to Sign
- Browser microphone input with Web Speech API
- English sentence capture
- ASL gloss conversion and grammar reordering
- Display of sign words and visual handshape references

### Sign to Text
- Webcam-based hand tracking with MediaPipe
- 21 hand landmarks normalized into a 42-feature vector
- ML prediction using SVM / Random Forest / Logistic Regression
- Stabilized prediction logic and confidence filtering
- Live caption generation for letters or signs

### Conversation Mode
- Side-by-side speech and sign interfaces
- Shared communication transcript
- Real-time bilingual interaction workflow

### Learn ASL
- A–Z ASL reference cards
- Landmark-based visual examples
- Educational sign reference for users and researchers

### Train New Signs
- Add custom sign labels
- Record sign samples in real time from webcam
- Save pose and hand landmark sequences
- Train a custom recognizer for new user-defined signs
- Use the trained model in sign recognition and conversation workflows

---

## High-Level Architecture

```text
                         ┌──────────────────────┐
                         │       Frontend       │
                         │   React + Vite       │
                         │  Speech + Camera UI  │
                         └──────────┬───────────┘
                                    │
                                    │ HTTP / REST
                                    ▼
                         ┌──────────────────────┐
                         │      Backend         │
                         │  Django + DRF        │
                         │ predict / translate  │
                         │ conversations API    │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │   Machine Learning   │
                         │  SVM / RF / LR      │
                         │  MediaPipe features │
                         └──────────────────────┘
```

---

## System Flow

### 1) Speech → Sign flow

```text
Microphone
  ↓
Web Speech API
  ↓
English sentence
  ↓
ASL gloss engine
  ↓
ASL word ordering and sign mapping
  ↓
Rendered sign sequence + sign photos
```

### 2) Sign → Text flow

```text
Webcam
  ↓
MediaPipe HandLandmarker
  ↓
21 landmarks
  ↓
Normalized 42-feature vector
  ↓
ML classifier
  ↓
Prediction + confidence
  ↓
Stability filtering
  ↓
Live text caption
```

### 3) Conversation flow

```text
Speech input ───────► ASL output
           │
           └────────────► Conversation transcript
                           │
Webcam sign input ─────► Text caption
                           │
                           └────────────► Shared conversation panel
```

---

## Repository Layout

```text
SignBridge-AI/
├── frontend/                          React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── CameraView.jsx
│   │   │   ├── SignPrediction.jsx
│   │   │   ├── CaptionBox.jsx
│   │   │   ├── SpeechInput.jsx
│   │   │   ├── ConversationPanel.jsx
│   │   │   └── layout/
│   │   ├── pages/
│   │   │   ├── Home.jsx
│   │   │   ├── SpeechToSign.jsx
│   │   │   ├── SignToText.jsx
│   │   │   ├── Conversation.jsx
│   │   │   ├── LearnASL.jsx
│   │   │   └── TrainASL.jsx
│   │   ├── hooks/
│   │   │   ├── useHandDetection.js
│   │   │   ├── useSignPredictor.js
│   │   │   ├── useSpeechRecognition.js
│   │   │   └── useTrainCapture.js
│   │   ├── services/
│   │   │   └── api.js
│   │   └── App.jsx
│   └── public/
│       ├── signs/
│       └── mediapipe assets
│
├── backend/                           Django backend
│   ├── api/
│   ├── config/
│   ├── conversations/
│   ├── translations/
│   ├── accounts/
│   └── manage.py
│
├── ai/                                ML pipeline
│   ├── datasets/
│   ├── preprocessing/
│   ├── training/
│   ├── inference/
│   ├── landmarks/
│   └── _paths.py
│
├── models/                            Trained model artifacts
├── notebooks/                         Experiment notebooks
├── dataset/                           Sign dataset and landmark CSV files
├── requirements.txt
├── run.py
├── README.md
└── .gitignore
```

---

## Main Pages

### Home
Main landing page of the app. It acts as the central navigation point and presents the project’s communication modes:
- Speech to Sign
- Sign to Text
- Conversation
- Learn ASL
- Train New Signs

### SpeechToSign
This page performs speech recognition and converts text into ASL-style input.

Typical flow:
1. User speaks into the microphone
2. Browser converts audio to text
3. The text is reordered into ASL grammar
4. Output is shown as gloss words and sign cards

### SignToText
This page captures a webcam feed and recognizes sign gestures.

Typical flow:
1. MediaPipe extracts landmark data
2. Landmarks are normalized into a feature vector
3. ML model predicts the corresponding label
4. Prediction is stabilized and displayed as live caption text

### Conversation
This page merges both communication paths into a unified conversation experience.

Features:
- speech input on one side
- sign recognition on the other
- transcript display shared between both sides

### LearnASL
This page acts as a digital ASL learning aid.

Features:
- letter-by-letter reference
- visual sign examples
- dataset-derived handshapes
- educational guidance for sign recognition

### TrainASL
This page lets users collect new custom sign data and train a custom recognition model.

This includes:
- label creation
- webcam sampling
- storing landmark sequences
- model training from newly collected data

---

## Train New Signs

The Train New Signs page is a custom data collection studio that allows the system to learn new, user-defined gestures.

This feature is important because it enables adaptation beyond the default dataset and supports domain-specific sign vocabulary.

### Workflow

1. Type a sign label, such as:
   - HELLO
   - THANKS
   - YES
   - NAME
2. Add the label to the collection list
3. Press Record
4. Perform the sign in front of the camera
5. The system captures:
   - hand landmarks
   - pose landmarks
   - frame-by-frame gesture sequences
6. Save the sample for the specific sign label
7. Repeat for additional signs
8. Click Train to build a custom model

### What gets stored
Captured samples include:
- hand landmark positions
- body pose landmarks
- synchronized sequences of frames
- sign-specific dataset entries under the corresponding label

### Why this matters
This allows:
- user-specific vocabulary support
- custom classroom or community signs
- speaker-specific adaptation
- quick extension of the recognition model without redesigning the full pipeline

### Training flow
After enough samples are collected:
1. Backend loads recorded sign data
2. Training pipeline fits a custom model
3. The trained model becomes available in:
   - Sign-to-Text
   - Conversation mode
4. New custom signs can then be recognized in real time

### Training controls
- Label input field
- Add label button
- Clear labels option
- Record / Stop button
- Duration selector (seconds)
- Auto-repeat toggle
- Model training button

### Data collection details
- Captures:
  - hand landmarks
  - body pose / motion landmarks
  - full-frame sequence information
- Saves into dataset directories
- Trains from the custom sign dataset when the user triggers training

---

## API Endpoints

The backend exposes a set of REST APIs.

```text
POST /api/predict/
  Body: {"features": [42 floats]} or {"landmarks": [[x,y] × 21]}
  Returns: prediction, confidence, top5

POST /api/translate/
  Body: {"text": "hello how are you"}
  Returns: original, gloss, sequence

GET /api/info/
  Returns: available models and classes

GET /api/words/
  Returns: ASL gloss vocabulary

GET /api/conversations/
  Returns: conversation log

POST /api/conversations/push/
  Body: {"role", "text", "gloss"}
  Saves a new conversation entry

GET /api/accounts/
  Returns: account namespace metadata
```

---

## Machine Learning Pipeline

### Training data
The dataset used is based on the Signclusive_Mediapipe dataset and includes:
- hand landmark images
- 21-landmark keypoint data
- label metadata for A–Z and space

### Models used
- SVM
- Random Forest
- Logistic Regression

### Typical training process
```bash
python ai/preprocessing/preprocess.py
python ai/training/train.py
python ai/training/test_models.py
```

### Outputs
- trained model files
- label encoders
- confusion matrices
- accuracy comparison reports

---

## Quick Start

### 1. Create a virtual environment
```bash
python -m venv .venv
.venv\Scripts\activate
```

### 2. Install Python dependencies
```bash
pip install -r requirements.txt
```

### 3. Install frontend dependencies
```bash
cd frontend
npm install
cd ..
```

### 4. Start the application
```bash
python run.py
```

This starts:
- Django backend at http://127.0.0.1:8000
- Vite frontend at http://localhost:5173

### 5. Run separately if needed
```bash
python backend/manage.py runserver 127.0.0.1:8000
cd frontend && npm run dev
```

---

## Tech Stack

### Frontend
- React 18
- Vite 5
- Tailwind CSS
- Framer Motion
- Lucide icons
- MediaPipe Tasks Vision

### Backend
- Django 6
- Django REST Framework
- django-cors-headers

### Machine Learning
- scikit-learn
- joblib
- NumPy
- pandas

### Media and Vision
- MediaPipe Hands
- OpenCV

---

## Notes

- Speech recognition uses the browser’s native Web Speech API.
- Hand recognition runs on the client side, reducing server load and improving responsiveness.
- The ASL gloss engine follows a controlled vocabulary and grammar reordering flow rather than raw full-sentence translation.
- Custom signs are trained using user-collected landmark data and can be integrated into live recognition workflows.
- Dataset photos are used to render visual examples in the frontend and align UI outputs with trained model classes.

---

## Summary

SignBridge AI is a full-stack ASL communication system that combines:
- real-time speech-to-sign conversion
- webcam sign detection and captioning
- ASL learning tools
- custom sign training support
- a modern web interface for communication and education

It is designed to support both practical communication and machine-learning-driven ASL recognition in a single end-to-end application.
