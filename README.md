# PID Visualizer

This project consists of a FastAPI backend and a React frontend. Follow the steps below to set up the development environment.

## Installation

1. **Create and activate a virtual environment**
   ```bash
   python -m venv venv && source venv/bin/activate
   ```
2. **Install Python dependencies**
   ```bash
   pip install -r backend/requirements.txt
   ```
3. **Install frontend dependencies**
   ```bash
   cd app && npm install
   ```
   (If you already ran `npm install` before, you can skip this step.)

## Running the application

1. **Start the backend**
   ```bash
   uvicorn backend.main:app --reload
   ```
2. **Start the frontend**
   ```bash
   npm run dev
   ```
   from the `app` directory.

## Environment configuration

Copy the example environment file and adjust the values as needed:
```bash
cp .env.example .env
```

## File watcher

The repository includes a helper script that monitors the `data` directory and sends new files to the backend. Launch it with:
```bash
node file-watcher/index.js
```
