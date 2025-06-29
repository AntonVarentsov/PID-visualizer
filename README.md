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

## Extending OCR parsers

OCR parsing is pluggable. The name of the parser is configured via the
`ocr_parser` option in `backend/config.py` (or the `OCR_PARSER` environment
variable). Parsers are discovered through the `pid_visualizer.ocr_parsers`
entry point group. Packages can expose a parser like so:

```ini
[options.entry_points]
pid_visualizer.ocr_parsers =
    custom = myproject.parsers:CustomParser
```

Install the package and set `OCR_PARSER=custom` to activate it.

## Adding new services

The application is designed to be easily extensible both on the backend and the
frontend.

### Backend router auto-discovery

During startup `backend.main.create_app()` scans the `backend/routers` package
for modules that expose a `router` object. Each discovered router is included
automatically, so adding a new service only requires creating a file in that
package:

```python
# backend/routers/status.py
from fastapi import APIRouter

router = APIRouter()

@router.get("/status")
def status():
    return {"status": "ok"}
```

### Registering new frontend display modes

Overlay display modes are enumerated in `app/src/types/overlay.ts` and their
properties live in `app/src/utils/overlayUtils.ts`. To add a mode extend the
`DisplayMode` union and insert a configuration object:

```typescript
// app/src/types/overlay.ts
export type DisplayMode =
  | 'line_numbers'
  | 'ocr_results'
  | 'corrosion_loops'
  | 'equipment'
  | 'clean'
  | 'status';

// app/src/utils/overlayUtils.ts
DISPLAY_MODE_CONFIGS.status = {
  mode: 'status',
  title: 'Status',
  description: 'Show status markers',
  defaultColor: '#ff9900',
  showGrouping: false,
  enableSelection: true,
  enableHover: true,
};
```
