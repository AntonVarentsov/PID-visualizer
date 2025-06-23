import React, { useRef, useState, useEffect, type ReactNode } from 'react';
import './PDFFrame.css';

interface PDFFrameProps {
  children: ReactNode;
  onZoomChange?: (zoom: number) => void;
  onPanChange?: (panX: number, panY: number) => void;
  onPanningChange?: (isPanning: boolean) => void;
}

// Input mode type
type InputMode = 'mouse' | 'trackpad';

const PDFFrame: React.FC<PDFFrameProps> = ({ children, onZoomChange, onPanChange, onPanningChange }) => {
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });
  
  // Input mode state
  const [inputMode, setInputMode] = useState<InputMode>('mouse');
  
  // Touch gesture state
  const [touchState, setTouchState] = useState({
    initialDistance: 0,
    initialZoom: 1,
    lastTouchCount: 0,
    centerPoint: { x: 0, y: 0 },
    lastPanPoint: { x: 0, y: 0 },
    isTouchPanning: false
  });

  const frameRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // A4 dimensions in pixels (at 96 DPI) - horizontal orientation
  const A4_WIDTH = 1123; // 297mm at 96dpi (landscape)
  const A4_HEIGHT = 794; // 210mm at 96dpi (landscape)

  // Notify parent components about zoom and pan changes
  useEffect(() => {
    onZoomChange?.(zoom);
  }, [zoom, onZoomChange]);

  useEffect(() => {
    onPanChange?.(panX, panY);
  }, [panX, panY, onPanChange]);

  useEffect(() => {
    onPanningChange?.(isPanning);
  }, [isPanning, onPanningChange]);

  // Prevent browser zoom/pinch globally when component is mounted
  useEffect(() => {
    const preventBrowserZoom = (e: WheelEvent) => {
      // Prevent all zoom attempts when in trackpad mode or when ctrlKey is pressed
      if (e.ctrlKey || inputMode === 'trackpad') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      }
    };

    const preventTouchZoom = (e: TouchEvent) => {
      // Prevent all multi-touch browser zoom
      if (e.touches.length > 1) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      }
    };

    // Add global event listeners
    document.addEventListener('wheel', preventBrowserZoom, { passive: false, capture: true });
    document.addEventListener('touchstart', preventTouchZoom, { passive: false, capture: true });
    document.addEventListener('touchmove', preventTouchZoom, { passive: false, capture: true });
    
    // Extra protection against Ctrl+wheel specifically
    const preventCtrlWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      }
    };
    
    document.addEventListener('wheel', preventCtrlWheel, { passive: false, capture: true });

    return () => {
      document.removeEventListener('wheel', preventBrowserZoom);
      document.removeEventListener('touchstart', preventTouchZoom);
      document.removeEventListener('touchmove', preventTouchZoom);
      document.removeEventListener('wheel', preventCtrlWheel);
    };
  }, []);

  // Handle mouse wheel for zooming
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
    
    const rect = frameRef.current?.getBoundingClientRect();
    if (!rect) return;

    // In trackpad mode, handle wheel events differently
    if (inputMode === 'trackpad') {
      // Pinch detection: only ctrlKey indicates true pinch gesture
      if (e.ctrlKey) {
        // Pinch gesture - zoom
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const delta = -e.deltaY * 0.003; // Sensitivity for trackpad pinch
        const newZoom = Math.max(0.1, Math.min(5, zoom + delta));

        // Calculate zoom center relative to current pan position
        const zoomFactor = newZoom / zoom;
        
        // Adjust pan to zoom towards mouse position
        const newPanX = mouseX - (mouseX - panX) * zoomFactor;
        const newPanY = mouseY - (mouseY - panY) * zoomFactor;

        setZoom(newZoom);
        setPanX(newPanX);
        setPanY(newPanY);
      } else {
        // Two-finger scroll - pan in both directions
        const deltaX = -e.deltaX * 1.5; // Horizontal pan
        const deltaY = -e.deltaY * 1.5; // Vertical pan
        
        setPanX(prev => prev + deltaX);
        setPanY(prev => prev + deltaY);
      }
    } else {
      // Mouse mode - wheel always zooms
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const delta = -e.deltaY * 0.001;
      const newZoom = Math.max(0.1, Math.min(5, zoom + delta));

      // Calculate zoom center relative to current pan position
      const zoomFactor = newZoom / zoom;
      
      // Adjust pan to zoom towards mouse position
      const newPanX = mouseX - (mouseX - panX) * zoomFactor;
      const newPanY = mouseY - (mouseY - panY) * zoomFactor;

      setZoom(newZoom);
      setPanX(newPanX);
      setPanY(newPanY);
    }
  };

  // Handle mouse down for starting pan (right mouse button)
  const handleMouseDown = (e: React.MouseEvent) => {
    // In mouse mode, right click starts panning
    if (inputMode === 'mouse' && e.button === 2) {
      // Start panning
      setIsPanning(true);
      setLastPanPoint({ x: e.clientX, y: e.clientY });
      e.preventDefault();
    }
  };

  // Handle mouse move for panning (using document level events for better tracking)
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isPanning) {
        const deltaX = e.clientX - lastPanPoint.x;
        const deltaY = e.clientY - lastPanPoint.y;

        setPanX(prev => prev + deltaX);
        setPanY(prev => prev + deltaY);
        setLastPanPoint({ x: e.clientX, y: e.clientY });
      }
    };

    const handleMouseUp = () => {
      setIsPanning(false);
    };

    if (isPanning) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isPanning, lastPanPoint]);

  // Handle mouse move for cursor changes
  const handleMouseMove = (e: React.MouseEvent) => {
    // This handles cursor changes only
  };

  // Handle mouse up for ending pan (backup)
  const handleMouseUp = () => {
    setIsPanning(false);
  };

  // Prevent context menu on right click
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  // Helper function to calculate distance between two touch points
  const getTouchDistance = (touch1: React.Touch, touch2: React.Touch) => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Helper function to get center point between two touches
  const getTouchCenter = (touch1: React.Touch, touch2: React.Touch) => {
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2
    };
  };

  // Handle touch start
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    
    const touches = Array.from(e.touches);
    const rect = frameRef.current?.getBoundingClientRect();
    if (!rect) return;

    if (touches.length === 2) {
      // Two finger touch - prepare for pinch zoom or pan
      const distance = getTouchDistance(touches[0], touches[1]);
      const center = getTouchCenter(touches[0], touches[1]);
      
      setTouchState({
        initialDistance: distance,
        initialZoom: zoom,
        lastTouchCount: 2,
        centerPoint: {
          x: center.x - rect.left,
          y: center.y - rect.top
        },
        lastPanPoint: center,
        isTouchPanning: false
      });
    } else if (touches.length === 1) {
      // Single touch - not used for panning (leave for rectangle selection)
      setTouchState(prev => ({
        ...prev,
        lastTouchCount: 1,
        isTouchPanning: false
      }));
    }
  };

  // Handle touch move
  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    
    const touches = Array.from(e.touches);
    const rect = frameRef.current?.getBoundingClientRect();
    if (!rect) return;

    if (touches.length === 2 && touchState.lastTouchCount === 2) {
      const currentDistance = getTouchDistance(touches[0], touches[1]);
      const currentCenter = getTouchCenter(touches[0], touches[1]);
      
      // Calculate zoom based on pinch distance
      if (touchState.initialDistance > 0) {
        const scale = currentDistance / touchState.initialDistance;
        const newZoom = Math.max(0.1, Math.min(5, touchState.initialZoom * scale));
        
        // Calculate pan for zoom centering
        const zoomFactor = newZoom / zoom;
        const centerX = touchState.centerPoint.x;
        const centerY = touchState.centerPoint.y;
        
        const newPanX = centerX - (centerX - panX) * zoomFactor;
        const newPanY = centerY - (centerY - panY) * zoomFactor;
        
        setZoom(newZoom);
        setPanX(newPanX);
        setPanY(newPanY);
      }
      
      // Handle two-finger panning (only after initial pinch is processed)
      if (!touchState.isTouchPanning && Math.abs(currentCenter.x - touchState.lastPanPoint.x) > 5) {
        setTouchState(prev => ({ ...prev, isTouchPanning: true }));
      }
      
      if (touchState.isTouchPanning) {
        const deltaX = currentCenter.x - touchState.lastPanPoint.x;
        const deltaY = currentCenter.y - touchState.lastPanPoint.y;
        
        setPanX(prev => prev + deltaX);
        setPanY(prev => prev + deltaY);
      }
      
      setTouchState(prev => ({
        ...prev,
        lastPanPoint: currentCenter
      }));
    }
  };

  // Handle touch end
  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    
    const remainingTouches = e.touches.length;
    
    if (remainingTouches === 0) {
      // All touches ended
      setTouchState(prev => ({
        ...prev,
        lastTouchCount: 0,
        isTouchPanning: false
      }));
    } else if (remainingTouches === 1 && touchState.lastTouchCount === 2) {
      // Went from two fingers to one - reset touch state
      setTouchState(prev => ({
        ...prev,
        lastTouchCount: 1,
        isTouchPanning: false,
        initialDistance: 0
      }));
    }
  };

  // Handle zoom buttons
  const zoomIn = () => {
    setZoom(prev => Math.min(5, prev + 0.1));
  };

  const zoomOut = () => {
    setZoom(prev => Math.max(0.1, prev - 0.1));
  };

  const resetZoom = () => {
    setZoom(1);
    setPanX(0);
    setPanY(0);
  };

  // Apply transform styles
  const contentStyle = {
    transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
    transformOrigin: '0 0',
  };

  return (
    <div className="pdf-frame-container">
      {/* Controls */}
      <div className="pdf-frame-controls">
        {/* Input mode toggle */}
        <div className="input-mode-toggle">
          <label>
            <input
              type="radio"
              name="inputMode"
              value="mouse"
              checked={inputMode === 'mouse'}
              onChange={(e) => setInputMode(e.target.value as InputMode)}
            />
            🖱️ Мышь
          </label>
          <label>
            <input
              type="radio"
              name="inputMode"
              value="trackpad"
              checked={inputMode === 'trackpad'}
              onChange={(e) => setInputMode(e.target.value as InputMode)}
            />
            👆 Тачпад
          </label>
        </div>
        
        {/* Zoom controls */}
        <div className="zoom-controls">
          <button onClick={zoomOut} title="Уменьшить">-</button>
          <span className="zoom-indicator">{Math.round(zoom * 100)}%</span>
          <button onClick={zoomIn} title="Увеличить">+</button>
          <button onClick={resetZoom} title="Сбросить масштаб">⌂</button>
        </div>
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
          ref={contentRef}
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