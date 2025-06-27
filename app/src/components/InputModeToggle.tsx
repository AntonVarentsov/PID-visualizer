import React from 'react';
import { InputMode } from '../hooks/usePdfPanZoom';

interface Props {
  mode: InputMode;
  onChange: (mode: InputMode) => void;
}

const InputModeToggle: React.FC<Props> = ({ mode, onChange }) => (
  <div className="input-mode-toggle">
    <label>
      <input
        type="radio"
        name="inputMode"
        value="mouse"
        checked={mode === 'mouse'}
        onChange={() => onChange('mouse')}
      />
      🖱️ Мышь
    </label>
    <label>
      <input
        type="radio"
        name="inputMode"
        value="trackpad"
        checked={mode === 'trackpad'}
        onChange={() => onChange('trackpad')}
      />
      👆 Тачпад
    </label>
  </div>
);

export default InputModeToggle;
