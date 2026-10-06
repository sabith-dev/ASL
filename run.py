#!/usr/bin/env python
"""
SignBridge AI — one-command launcher.

Starts the Django REST API (backend) and the Vite dev server (frontend)
in two child processes. Press Ctrl+C in the terminal to stop both.
"""
import os
import signal
import subprocess
import sys
import time

ROOT = os.path.dirname(os.path.abspath(__file__))
BACKEND = os.path.join(ROOT, 'backend')
FRONTEND = os.path.join(ROOT, 'frontend')

PY = os.path.join(ROOT, '.venv', 'Scripts', 'python.exe')
if not os.path.exists(PY):
    PY = sys.executable


def run():
    print('=' * 62)
    print('  SignBridge AI  — two-way sign communication bridge')
    print('=' * 62)

    env = dict(os.environ)

    backend = subprocess.Popen(
        [PY, 'manage.py', 'runserver', '127.0.0.1:8000', '--noreload'],
        cwd=BACKEND, env=env,
        stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
        text=True, bufsize=1,
    )

    frontend = subprocess.Popen(
        ['npm', 'run', 'dev'],
        cwd=FRONTEND, env=env,
        stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
        text=True, bufsize=1, shell=(os.name == 'nt'),
    )

    def printer(proc, tag):
        def _print():
            try:
                for line in proc.stdout:
                    sys.stdout.write(f'[{tag}] {line}')
            except Exception:
                pass
        return _print

    import threading
    threading.Thread(target=printer(backend, 'django'), daemon=True).start()
    threading.Thread(target=printer(frontend, 'vite  '), daemon=True).start()

    def stop(*_):
        for p in (backend, frontend):
            try: p.terminate()
            except Exception: pass
        sys.exit(0)

    signal.signal(signal.SIGINT, stop)
    signal.signal(signal.SIGTERM, stop)

    print('\n  API   →  http://127.0.0.1:8000/api/info/')
    print('  App   →  http://localhost:5173')
    print('  Stop  →  Ctrl+C\n')

    try:
        while True:
            time.sleep(1)
            if backend.poll() is not None and frontend.poll() is not None:
                break
    except KeyboardInterrupt:
        stop()


if __name__ == '__main__':
    run()