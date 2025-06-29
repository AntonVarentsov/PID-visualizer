/**
 * Coordinates for overlay item positioning
 */
export interface OverlayCoordinates {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Display modes for the PDF frame
 */
export type DisplayMode = 
  | 'line_numbers'
  | 'ocr_results' 
  | 'corrosion_loops'
  | 'equipment'
  | 'clean';

/**
 * Types of overlay items
 */
export type OverlayItemType = 
  | 'line'
  | 'ocr_text'
  | 'equipment'
  | 'corrosion_loop';

/**
 * Universal overlay item structure for all types of PDF annotations
 */
export interface OverlayItem {
  /** Unique identifier for the item */
  id: string;
  
  /** Display name/text of the item */
  name: string;
  
  /** Position and size coordinates */
  coordinates: OverlayCoordinates;
  
  /** Type of overlay item */
  type?: OverlayItemType;
  
  /** Group ID for grouping related items (e.g., corrosion loops) */
  groupId?: string;
  
  /** Color for visualization (hex, rgba, or named colors) */
  color?: string;
  
  /** Page number (for multi-page PDFs) */
  page?: number;
  
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Configuration for display modes
 */
export interface DisplayModeConfig {
  mode: DisplayMode;
  title: string;
  description: string;
  defaultColor: string;
  showGrouping: boolean;
  enableSelection: boolean;
  enableHover: boolean;
}

/**
 * Rendering configuration for overlay items
 */
export interface RenderConfig {
  scale: number;
  zoom: number;
  strokeWidth: number;
  fillOpacity: number;
  strokeOpacity: number;
  selectedStrokeWidth: number;
  hoveredStrokeWidth: number;
}

/**
 * Event handlers for overlay interactions
 */
export interface OverlayEventHandlers {
  onItemClick?: (item: OverlayItem) => void;
  onItemHover?: (item: OverlayItem | null) => void;
  onGroupClick?: (groupId: string, items: OverlayItem[]) => void;
  onGroupHover?: (groupId: string, items: OverlayItem[]) => void;
}

/**
 * Props for the universal PDF frame component
 */
export interface UniversalPDFFrameProps {
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
  
  /** Custom styling */
  className?: string;
  
  /** Child components (PDF content) */
  children?: React.ReactNode;
} 