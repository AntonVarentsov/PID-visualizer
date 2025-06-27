import React, { useState, type ReactNode } from 'react';
import './PDFFrame.css';
import usePdfPanZoom, { InputMode } from '../hooks/usePdfPanZoom';
import ZoomControls from './ZoomControls';
import InputModeToggle from './InputModeToggle';

interface PDFFrameProps {
  children: ReactNode;
  onZoomChange?: (zoom: number) => void;
  onPanChange?: (panX: number, panY: number) => void;
  onPanningChange?: (isPanning: boolean) => void;
}

const A4_WIDTH = 1123;
const A4_HEIGHT = 794;

const PDFFrame: React.FC<PDFFrameProps> = ({
  children,
  onZoomChange,
  onPanChange,
  onPanningChange,
}) => {
  const [inputMode, setInputMode] = useState<InputMode>('mouse');

  const {
    zoom,
    frameRef,
    contentRef,
    contentStyle,
    isPanning,
    handleWheel,
    handleMouseDown,
    handleContextMenu,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    zoomIn,
    zoomOut,
    resetZoom,
  } = usePdfPanZoom({ inputMode, onZoomChange, onPanChange, onPanningChange });

  return (
    <div className="pdf-frame-container">
      <div className="pdf-frame-controls">
        <InputModeToggle mode={inputMode} onChange={setInputMode} />
        <ZoomControls zoom={zoom} onZoomIn={zoomIn} onZoomOut={zoomOut} onReset={resetZoom} />
      </div>
      <div
        ref={frameRef}
        className={`pdf-frame ${isPanning ? 'panning' : ''}`}
        style={{ width: A4_WIDTH, height: A4_HEIGHT }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onContextMenu={handleContextMenu}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div ref={contentRef} className="pdf-frame-content" style={contentStyle}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default PDFFrame;
