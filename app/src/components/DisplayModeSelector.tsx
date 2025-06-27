import React from 'react';
import type { DisplayMode } from '../types/overlay';
import { DISPLAY_MODE_CONFIGS } from '../utils/overlayUtils';

interface DisplayModeSelectorProps {
  currentMode: DisplayMode;
  onModeChange: (mode: DisplayMode) => void;
  availableModes?: DisplayMode[];
  className?: string;
}

const DisplayModeSelector: React.FC<DisplayModeSelectorProps> = ({
  currentMode,
  onModeChange,
  availableModes = ['line_numbers', 'ocr_results', 'corrosion_loops', 'equipment', 'clean'],
  className = ''
}) => {
  return (
    <div className={`display-mode-selector ${className}`}>
      <label className="mode-selector-label">
        Режим отображения:
      </label>
      <div className="mode-options">
        {availableModes.map((mode) => {
          const config = DISPLAY_MODE_CONFIGS[mode];
          return (
            <button
              key={mode}
              className={`mode-option ${currentMode === mode ? 'active' : ''}`}
              onClick={() => onModeChange(mode)}
              title={config.description}
            >
              {config.title}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default DisplayModeSelector; 