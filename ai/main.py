import os
import sys

# Make the ai/ and repo-root packages importable so the sub-commands work
# regardless of the working directory we are launched from.
_AI_ROOT = os.path.dirname(os.path.abspath(__file__))  # ai/
_PROJ_ROOT = os.path.dirname(_AI_ROOT)                 # repo root
for _p in (_AI_ROOT, _PROJ_ROOT):
    if _p not in sys.path:
        sys.path.insert(0, _p)


def main():
    print("=" * 60)
    print("   PROFESSIONAL ASL BIDIRECTIONAL SYSTEM")
    print("=" * 60)
    print("1. Sign Language  ->  Text   (webcam)")
    print("2. Speech/Text    ->  Sign   (use the web app: Speak → Sign)")
    print("3. Exit")
    print()

    choice = input("Choose (1/2/3): ").strip()

    if choice == "1":
        print("\nLaunching Sign -> Text...")
        import ai.landmarks.realtime_sign_to_text
    elif choice == "2":
        print("\nPhase 1 desktop avatar was removed — use the web app "
              "(SpeechToSign in the React frontend) instead.")
        main()
    else:
        print("Goodbye!")


if __name__ == "__main__":
    main()