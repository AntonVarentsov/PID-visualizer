import React, { type ReactNode } from 'react';
import { usePdfPanZoom } from '../hooks/usePdfPanZoom';
import ZoomControls from './ZoomControls';
import InputModeToggle from './InputModeToggle';
import './PDFFrame.css';

interface PDFFrameProps {
  children: ReactNode;
  onZoomChange?: (zoom: number) => void;
  onPanChange?: (panX: number, panY: number) => void;
  onPanningChange?: (isPanning: boolean) => void;
}

const PDFFrame: React.FC<PDFFrameProps> = ({ 
  children, 
  onZoomChange, 
  onPanChange, 
  onPanningChange 
}) => {
  // A4 dimensions in pixels (at 96 DPI) - horizontal orientation
  const A4_WIDTH = 1123; // 297mm at 96dpi (landscape)
  const A4_HEIGHT = 794; // 210mm at 96dpi (landscape)

  // Use the pan/zoom hook
  const {
    zoom,
    isPanning,
    inputMode,
    setInputMode,
    frameRef,
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleContextMenu,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    zoomIn,
    zoomOut,
    resetZoom,
    contentStyle,
  } = usePdfPanZoom({
    onZoomChange,
    onPanChange,
    onPanningChange,
  });

  return (
    <div className="pdf-frame-container">
      {/* Controls */}
      <div className="pdf-frame-controls">
        {/* Input mode toggle */}
        <InputModeToggle 
          inputMode={inputMode} 
          onInputModeChange={setInputMode} 
        />
        
        {/* Zoom controls */}
        <ZoomControls 
          zoom={zoom}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onResetZoom={resetZoom}
        />
      </div>

      {/* A4 Frame */}
      <div
        ref={frameRef}
        className={`pdf-frame ${isPanning ? 'panning' : ''}`}
        style={{
          width: A4_WIDTH,
          height: A4_HEIGHT,
        }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp} // Stop panning if mouse leaves frame
        onContextMenu={handleContextMenu} // Prevent context menu
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="pdf-frame-content"
          style={contentStyle}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

export default PDFFrame; 