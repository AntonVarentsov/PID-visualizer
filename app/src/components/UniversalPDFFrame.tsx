import React, { useEffect, useRef, useState, type ReactNode } from 'react';
import { fabric } from 'fabric';
import { usePdfPanZoom } from '../hooks/usePdfPanZoom';
import ZoomControls from './ZoomControls';
import InputModeToggle from './InputModeToggle';
import type { 
  OverlayItem, 
  DisplayMode, 
  OverlayEventHandlers, 
  RenderConfig 
} from '../types/overlay';
import {
  DISPLAY_MODE_REGISTRY,
  DEFAULT_RENDER_CONFIG,
  filterByPage,
  getGroupItems,
  assignCorrosionLoopColors,
  calculateAdjustedCoordinates,
  getRenderColors
} from '../utils/overlayUtils';
import './PDFFrame.css';

interface UniversalPDFFrameProps {
  /** Current display mode */
  mode: DisplayMode;
  
  /** Overlay data to display */
  overlayData: OverlayItem[];
  
  /** Rendering configuration */
  renderConfig?: Partial<RenderConfig>;
  
  /** Event handlers */
  eventHandlers?: OverlayEventHandlers;
  
  /** PDF page number */
  pageNumber?: number;
  
  /** Whether to enable pan/zoom controls */
  enableControls?: boolean;
  
  /** Child components (PDF content) */
  children?: ReactNode;
  
  /** PDF scale for quality */
  pdfScale?: number;
  
  /** Callbacks for external state management */
  onZoomChange?: (zoom: number) => void;
  onPanChange?: (panX: number, panY: number) => void;
  onPanningChange?: (isPanning: boolean) => void;
}

const UniversalPDFFrame: React.FC<UniversalPDFFrameProps> = ({
  mode,
  overlayData,
  renderConfig = {},
  eventHandlers = {},
  pageNumber = 1,
  enableControls = true,
  children,
  pdfScale = 1,
  onZoomChange,
  onPanChange,
  onPanningChange
}) => {
  // A4 dimensions in pixels (at 96 DPI) - horizontal orientation
  const A4_WIDTH = 1123;
  const A4_HEIGHT = 794;

  // State for overlay interactions
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  // Refs for canvas management
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const mainContainerRef = useRef<HTMLDivElement>(null);

  // Merge render configuration with defaults
  const finalRenderConfig: RenderConfig = {
    ...DEFAULT_RENDER_CONFIG,
    ...renderConfig
  };

  // Get display mode configuration
  const displayConfig = DISPLAY_MODE_REGISTRY.get(mode);

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

  if (!displayConfig) {
    console.warn(`No display mode registered for "${mode}"`);
    return null;
  }

  // Initialize Fabric.js canvas
  useEffect(() => {
    if (canvasRef.current && !fabricCanvasRef.current) {
      const canvas = new fabric.Canvas(canvasRef.current);
      fabricCanvasRef.current = canvas;
    }

    return () => {
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose();
        fabricCanvasRef.current = null;
      }
    };
  }, []);

  // Render overlay items based on current mode
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || mode === 'clean') {
      // Clear canvas for clean mode
      if (canvas) {
        canvas.clear();
      }
      return;
    }

    // Clear previous overlay items
    canvas.getObjects().forEach(obj => {
      if (obj.data && obj.data.isOverlay) {
        canvas.remove(obj);
      }
    });

    // Filter data by current page
    let currentPageData = filterByPage(overlayData, pageNumber);

    // Apply corrosion loop coloring if needed
    if (mode === 'corrosion_loops' && displayConfig.showGrouping) {
      currentPageData = assignCorrosionLoopColors(currentPageData);
    }

    // Render overlay items
    currentPageData.forEach((item) => {
      const adjustedCoords = calculateAdjustedCoordinates(
        item.coordinates,
        finalRenderConfig.scale,
        pdfScale,
        finalRenderConfig.strokeWidth
      );

      const colors = getRenderColors(
        item,
        displayConfig,
        selectedId === item.id || selectedGroupId === item.groupId,
        hoveredId === item.id
      );

      const rect = new fabric.Rect({
        left: adjustedCoords.x,
        top: adjustedCoords.y,
        width: adjustedCoords.width,
        height: adjustedCoords.height,
        fill: colors.fill,
        stroke: colors.stroke,
        strokeWidth: finalRenderConfig.strokeWidth,
        selectable: displayConfig.enableSelection,
        lockMovementX: true,
        lockMovementY: true,
        hasControls: false,
        data: { 
          isOverlay: true,
          overlayItem: item,
          id: item.id,
          groupId: item.groupId 
        }
      });

      canvas.add(rect);
    });

    canvas.renderAll();
  }, [overlayData, mode, pageNumber, pdfScale, selectedId, hoveredId, selectedGroupId, zoom]);

  // Handle canvas interactions
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !displayConfig.enableSelection) return;

    const handleCanvasClick = (e: fabric.IEvent) => {
      if (isPanning) return;
      
      if (e.target && e.target.data && e.target.data.isOverlay) {
        const item = e.target.data.overlayItem as OverlayItem;
        
        // Handle group selection for corrosion loops
        if (mode === 'corrosion_loops' && item.groupId) {
          const newSelectedGroupId = selectedGroupId === item.groupId ? null : item.groupId;
          setSelectedGroupId(newSelectedGroupId);
          setSelectedId(null);
          
          if (newSelectedGroupId) {
            const groupItems = getGroupItems(overlayData, newSelectedGroupId);
            eventHandlers.onGroupClick?.(newSelectedGroupId, groupItems);
          }
        } else {
          // Regular item selection
          const newSelectedId = selectedId === item.id ? null : item.id;
          setSelectedId(newSelectedId);
          setSelectedGroupId(null);
          
          if (newSelectedId) {
            eventHandlers.onItemClick?.(item);
          }
        }
      } else {
        // Background click - clear selection
        setSelectedId(null);
        setSelectedGroupId(null);
      }
    };

    const handleMouseMove = (e: fabric.IEvent) => {
      if (!displayConfig.enableHover) return;
      
      if (e.target && e.target.data && e.target.data.isOverlay) {
        const item = e.target.data.overlayItem as OverlayItem;
        canvas.defaultCursor = 'pointer';
        
        if (hoveredId !== item.id) {
          setHoveredId(item.id);
          eventHandlers.onItemHover?.(item);
          
          // Handle group hover for corrosion loops
          if (mode === 'corrosion_loops' && item.groupId) {
            const groupItems = getGroupItems(overlayData, item.groupId);
            eventHandlers.onGroupHover?.(item.groupId, groupItems);
          }
        }
      } else {
        canvas.defaultCursor = 'default';
        if (hoveredId) {
          setHoveredId(null);
          eventHandlers.onItemHover?.(null);
        }
      }
    };

    canvas.on('mouse:down', handleCanvasClick);
    canvas.on('mouse:move', handleMouseMove);

    return () => {
      canvas.off('mouse:down', handleCanvasClick);
      canvas.off('mouse:move', handleMouseMove);
    };
  }, [isPanning, selectedId, hoveredId, selectedGroupId, mode, overlayData, displayConfig, eventHandlers]);

  return (
    <div className="pdf-frame-container">
      {/* Controls */}
      {enableControls && (
        <div className="pdf-frame-controls">
          <div className="mode-indicator">
            <span className="mode-title">{displayConfig.title}</span>
            <span className="mode-description">{displayConfig.description}</span>
          </div>
          
          <InputModeToggle 
            inputMode={inputMode} 
            onInputModeChange={setInputMode} 
          />
          
          <ZoomControls 
            zoom={zoom}
            onZoomIn={zoomIn}
            onZoomOut={zoomOut}
            onResetZoom={resetZoom}
          />
        </div>
      )}

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
        onMouseLeave={handleMouseUp}
        onContextMenu={handleContextMenu}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="pdf-frame-content"
          style={contentStyle}
        >
          <div ref={mainContainerRef} style={{ position: 'relative' }}>
            {children}
            <canvas
              ref={canvasRef}
              style={{ 
                position: 'absolute', 
                top: 0, 
                left: 0
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default UniversalPDFFrame; 