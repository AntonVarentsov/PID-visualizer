import React from 'react';

interface Props {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}

const ZoomControls: React.FC<Props> = ({ zoom, onZoomIn, onZoomOut, onReset }) => (
  <div className="zoom-controls">
    <button onClick={onZoomOut} title="Уменьшить">-</button>
    <span className="zoom-indicator">{Math.round(zoom * 100)}%</span>
    <button onClick={onZoomIn} title="Увеличить">+</button>
    <button onClick={onReset} title="Сбросить масштаб">⌂</button>
  </div>
);

export default ZoomControls;
