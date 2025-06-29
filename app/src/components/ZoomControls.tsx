import React from 'react';

interface ZoomControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
}

const ZoomControls: React.FC<ZoomControlsProps> = ({
  zoom,
  onZoomIn,
  onZoomOut,
  onResetZoom,
}) => {
  return (
    <div className="zoom-controls">
      <button onClick={onZoomOut} title="Уменьшить">-</button>
      <span className="zoom-indicator">{Math.round(zoom * 100)}%</span>
      <button onClick={onZoomIn} title="Увеличить">+</button>
      <button onClick={onResetZoom} title="Сбросить масштаб">⌂</button>
    </div>
  );
};

export default ZoomControls; 