import { useState, useEffect, useRef } from 'react';

// Input mode type
export type InputMode = 'mouse' | 'trackpad';

interface TouchState {
  initialDistance: number;
  initialZoom: number;
  lastTouchCount: number;
  centerPoint: { x: number; y: number };
  lastPanPoint: { x: number; y: number };
  isTouchPanning: boolean;
}

interface UsePdfPanZoomProps {
  onZoomChange?: (zoom: number) => void;
  onPanChange?: (panX: number, panY: number) => void;
  onPanningChange?: (isPanning: boolean) => void;
}

export const usePdfPanZoom = ({
  onZoomChange,
  onPanChange,
  onPanningChange,
}: UsePdfPanZoomProps = {}) => {
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });
  const [inputMode, setInputMode] = useState<InputMode>('mouse');
  
  // Touch gesture state
  const [touchState, setTouchState] = useState<TouchState>({
    initialDistance: 0,
    initialZoom: 1,
    lastTouchCount: 0,
    centerPoint: { x: 0, y: 0 },
    lastPanPoint: { x: 0, y: 0 },
    isTouchPanning: false
  });

  const frameRef = useRef<HTMLDivElement>(null);

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
      if (e.ctrlKey) {
        e.preventDefault();
      }
    };

    document.addEventListener('wheel', preventBrowserZoom, { passive: false });

    return () => {
      document.removeEventListener('wheel', preventBrowserZoom);
    };
  }, []);

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

  // Reset state when switching input modes
  useEffect(() => {
    // Clear all active states when switching modes
    setIsPanning(false);
    setLastPanPoint({ x: 0, y: 0 });
    setTouchState({
      initialDistance: 0,
      initialZoom: zoom, // Keep current zoom
      lastTouchCount: 0,
      centerPoint: { x: 0, y: 0 },
      lastPanPoint: { x: 0, y: 0 },
      isTouchPanning: false
    });

    // Apply touch-action to body in trackpad mode
    if (inputMode === 'trackpad') {
      document.body.style.touchAction = 'manipulation';
    } else {
      document.body.style.touchAction = '';
    }

    return () => {
      document.body.style.touchAction = '';
    };
  }, [inputMode, zoom]);

  // Utility functions for touch handling
  const getTouchDistance = (touch1: React.Touch, touch2: React.Touch) => {
    const deltaX = touch1.clientX - touch2.clientX;
    const deltaY = touch1.clientY - touch2.clientY;
    return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  };

  const getTouchCenter = (touch1: React.Touch, touch2: React.Touch) => {
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2,
    };
  };

  // Handle mouse wheel for zooming
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    
    const rect = frameRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Mouse mode: always zoom
    if (inputMode === 'mouse') {
      const delta = -e.deltaY * 0.001; // Уменьшили скорость в 2 раза
      const newZoom = Math.max(0.5, Math.min(2.0, zoom + delta)); // Пределы 50%-200%

      const zoomFactor = newZoom / zoom;
      const newPanX = mouseX - (mouseX - panX) * zoomFactor;
      const newPanY = mouseY - (mouseY - panY) * zoomFactor;

      setZoom(newZoom);
      setPanX(newPanX);
      setPanY(newPanY);
    }
    // Trackpad mode: pinch gesture (Ctrl+wheel) = zoom, other = pan
    else if (inputMode === 'trackpad') {
      if (e.ctrlKey) {
        // Pinch gesture - zoom
        const delta = -e.deltaY * 0.0015; // Уменьшили скорость в 2 раза
        const newZoom = Math.max(0.5, Math.min(2.0, zoom + delta)); // Пределы 50%-200%

        const zoomFactor = newZoom / zoom;
        const newPanX = mouseX - (mouseX - panX) * zoomFactor;
        const newPanY = mouseY - (mouseY - panY) * zoomFactor;

        setZoom(newZoom);
        setPanX(newPanX);
        setPanY(newPanY);
      } else {
        // Two-finger scroll - pan
        const deltaX = -e.deltaX * 1.5;
        const deltaY = -e.deltaY * 1.5;
        
        setPanX(prev => prev + deltaX);
        setPanY(prev => prev + deltaY);
      }
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

  // Handle mouse move for cursor changes
  const handleMouseMove = (_e: React.MouseEvent) => {
    // Cursor changes handled by parent component
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent context menu when right-clicking for pan
  };

  // Handle touch start
  const handleTouchStart = (e: React.TouchEvent) => {
    // Only handle touch events in trackpad mode
    if (inputMode !== 'trackpad') return;
    
    const touches = Array.from(e.touches);
    const rect = frameRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    // Prevent default for multi-touch gestures
    if (touches.length >= 2) {
      e.preventDefault();
    }

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
    // Only handle touch events in trackpad mode
    if (inputMode !== 'trackpad') return;
    
    const touches = Array.from(e.touches);
    const rect = frameRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    // Prevent default for multi-touch gestures that we're handling
    if (touches.length >= 2) {
      e.preventDefault();
    }

    if (touches.length === 2 && touchState.lastTouchCount === 2) {
      const currentDistance = getTouchDistance(touches[0], touches[1]);
      const currentCenter = getTouchCenter(touches[0], touches[1]);
      
      // Calculate zoom based on pinch distance
      if (touchState.initialDistance > 0) {
        const scale = currentDistance / touchState.initialDistance;
        const newZoom = Math.max(0.5, Math.min(2.0, touchState.initialZoom * scale)); // Пределы 50%-200%
        
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
      
      // Handle two-finger panning - check movement in both X and Y
      const centerMovement = Math.sqrt(
        Math.pow(currentCenter.x - touchState.lastPanPoint.x, 2) + 
        Math.pow(currentCenter.y - touchState.lastPanPoint.y, 2)
      );
      
      if (!touchState.isTouchPanning && centerMovement > 5) {
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
    // Only handle touch events in trackpad mode
    if (inputMode !== 'trackpad') return;
    
    const remainingTouches = e.touches.length;
    
    // Prevent default if we were handling multi-touch
    if (touchState.lastTouchCount >= 2) {
      e.preventDefault();
    }
    
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
    setZoom(prev => Math.min(2.0, prev + 0.1)); // Максимум 200%
  };

  const zoomOut = () => {
    setZoom(prev => Math.max(0.5, prev - 0.1)); // Минимум 50%
  };

  const resetZoom = () => {
    setZoom(1);
    setPanX(0);
    setPanY(0);
  };

  return {
    // State
    zoom,
    panX,
    panY,
    isPanning,
    inputMode,
    setInputMode,
    
    // Refs
    frameRef,
    
    // Event handlers
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleContextMenu,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    
    // Controls
    zoomIn,
    zoomOut,
    resetZoom,
    
    // Transform style
    contentStyle: {
      transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
      transformOrigin: '0 0',
    },
  };
}; 