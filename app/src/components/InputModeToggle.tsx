import React from 'react';
import type { InputMode } from '../hooks/usePdfPanZoom';

interface InputModeToggleProps {
  inputMode: InputMode;
  onInputModeChange: (mode: InputMode) => void;
}

const InputModeToggle: React.FC<InputModeToggleProps> = ({
  inputMode,
  onInputModeChange,
}) => {
  return (
    <div className="input-mode-toggle">
      <label>
        <input
          type="radio"
          name="inputMode"
          value="mouse"
          checked={inputMode === 'mouse'}
          onChange={(e) => onInputModeChange(e.target.value as InputMode)}
        />
        🖱️ Мышь
      </label>
      <label>
        <input
          type="radio"
          name="inputMode"
          value="trackpad"
          checked={inputMode === 'trackpad'}
          onChange={(e) => onInputModeChange(e.target.value as InputMode)}
        />
        👆 Тачпад
      </label>
    </div>
  );
};

export default InputModeToggle; 