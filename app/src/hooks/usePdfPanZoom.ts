import { useState, useRef, useEffect } from 'react';

export type InputMode = 'mouse' | 'trackpad';

interface Options {
  inputMode: InputMode;
  onZoomChange?: (zoom: number) => void;
  onPanChange?: (x: number, y: number) => void;
  onPanningChange?: (isPanning: boolean) => void;
}

export default function usePdfPanZoom({
  inputMode,
  onZoomChange,
  onPanChange,
  onPanningChange,
}: Options) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);

  const frameRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const lastPanPoint = useRef({ x: 0, y: 0 });

  // notify parent components
  useEffect(() => onZoomChange?.(zoom), [zoom, onZoomChange]);
  useEffect(() => onPanChange?.(pan.x, pan.y), [pan, onPanChange]);
  useEffect(() => onPanningChange?.(isPanning), [isPanning, onPanningChange]);

  // prevent browser zooming
  useEffect(() => {
    const prevent = (e: WheelEvent) => {
      if (e.ctrlKey || inputMode === 'trackpad') {
        e.preventDefault();
      }
    };
    const preventTouch = (e: TouchEvent) => {
      if (e.touches.length > 1) e.preventDefault();
    };
    document.addEventListener('wheel', prevent, { passive: false, capture: true });
    document.addEventListener('touchstart', preventTouch, { passive: false, capture: true });
    document.addEventListener('touchmove', preventTouch, { passive: false, capture: true });
    return () => {
      document.removeEventListener('wheel', prevent);
      document.removeEventListener('touchstart', preventTouch);
      document.removeEventListener('touchmove', preventTouch);
    };
  }, [inputMode]);

  const zoomBy = (delta: number, cx: number, cy: number) => {
    setZoom(prev => {
      const newZoom = Math.max(0.1, Math.min(5, prev + delta));
      const factor = newZoom / prev;
      setPan(p => ({ x: cx - (cx - p.x) * factor, y: cy - (cy - p.y) * factor }));
      return newZoom;
    });
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const rect = frameRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (inputMode === 'trackpad') {
      if (e.ctrlKey) {
        zoomBy(-e.deltaY * 0.003, x, y);
      } else {
        setPan(p => ({ x: p.x - e.deltaX * 1.5, y: p.y - e.deltaY * 1.5 }));
      }
    } else {
      zoomBy(-e.deltaY * 0.001, x, y);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (inputMode === 'mouse' && e.button === 2) {
      e.preventDefault();
      setIsPanning(true);
      lastPanPoint.current = { x: e.clientX, y: e.clientY };
    }
  };

  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (isPanning) {
        const dx = e.clientX - lastPanPoint.current.x;
        const dy = e.clientY - lastPanPoint.current.y;
        lastPanPoint.current = { x: e.clientX, y: e.clientY };
        setPan(p => ({ x: p.x + dx, y: p.y + dy }));
      }
    };
    const up = () => setIsPanning(false);
    if (isPanning) {
      document.addEventListener('mousemove', move);
      document.addEventListener('mouseup', up);
    }
    return () => {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
    };
  }, [isPanning]);

  const handleContextMenu = (e: React.MouseEvent) => {
    if (inputMode === 'mouse') e.preventDefault();
  };

  // touch gestures
  const touchState = useRef({
    initialDistance: 0,
    initialZoom: 1,
    center: { x: 0, y: 0 },
    lastPan: { x: 0, y: 0 },
    panning: false,
  });

  const dist = (t1: React.Touch, t2: React.Touch) =>
    Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
  const center = (t1: React.Touch, t2: React.Touch) => ({
    x: (t1.clientX + t2.clientX) / 2,
    y: (t1.clientY + t2.clientY) / 2,
  });

  const handleTouchStart = (e: React.TouchEvent) => {
    const touches = e.touches;
    const rect = frameRef.current?.getBoundingClientRect();
    if (!rect) return;
    if (touches.length === 2) {
      touchState.current.initialDistance = dist(touches[0], touches[1]);
      touchState.current.initialZoom = zoom;
      const c = center(touches[0], touches[1]);
      touchState.current.center = { x: c.x - rect.left, y: c.y - rect.top };
      touchState.current.lastPan = c;
      touchState.current.panning = false;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touches = e.touches;
    const rect = frameRef.current?.getBoundingClientRect();
    if (!rect || touches.length !== 2) return;
    const c = center(touches[0], touches[1]);
    const distance = dist(touches[0], touches[1]);

    const newZoom = Math.max(
      0.1,
      Math.min(5, (distance / touchState.current.initialDistance) * touchState.current.initialZoom),
    );
    const factor = newZoom / zoom;
    zoomBy(newZoom - zoom, touchState.current.center.x, touchState.current.center.y);

    const dx = c.x - touchState.current.lastPan.x;
    const dy = c.y - touchState.current.lastPan.y;
    if (touchState.current.panning) {
      setPan(p => ({ x: p.x + dx, y: p.y + dy }));
    } else if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      touchState.current.panning = true;
    }
    touchState.current.lastPan = c;
  };

  const handleTouchEnd = () => {
    touchState.current.panning = false;
  };

  const contentStyle = {
    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
    transformOrigin: '0 0',
  } as React.CSSProperties;

  return {
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
    zoomIn: () => zoomBy(0.1, 0, 0),
    zoomOut: () => zoomBy(-0.1, 0, 0),
    resetZoom: () => {
      setZoom(1);
      setPan({ x: 0, y: 0 });
    },
  };
}
