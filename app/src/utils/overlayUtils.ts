import type { 
  OverlayItem, 
  DisplayMode, 
  DisplayModeConfig, 
  RenderConfig,
  OverlayCoordinates 
} from '../types/overlay';

/**
 * Default render configuration
 */
export const DEFAULT_RENDER_CONFIG: RenderConfig = {
  scale: 2,
  zoom: 1,
  strokeWidth: 1.5,
  fillOpacity: 0.15,
  strokeOpacity: 1,
  selectedStrokeWidth: 2,
  hoveredStrokeWidth: 2,
};

/**
 * Configuration for different display modes
 */
export const DISPLAY_MODE_CONFIGS: Record<DisplayMode, DisplayModeConfig> = {
  line_numbers: {
    mode: 'line_numbers',
    title: 'Line Numbers',
    description: 'Display piping line numbers',
    defaultColor: '#007bff',
    showGrouping: false,
    enableSelection: true,
    enableHover: true,
  },
  ocr_results: {
    mode: 'ocr_results',
    title: 'OCR Results',
    description: 'Display raw OCR text recognition results',
    defaultColor: '#28a745',
    showGrouping: false,
    enableSelection: true,
    enableHover: true,
  },
  corrosion_loops: {
    mode: 'corrosion_loops',
    title: 'Corrosion Loops',
    description: 'Display grouped corrosion loops with color coding',
    defaultColor: '#dc3545',
    showGrouping: true,
    enableSelection: true,
    enableHover: true,
  },
  equipment: {
    mode: 'equipment',
    title: 'Equipment',
    description: 'Display equipment items',
    defaultColor: '#ffc107',
    showGrouping: false,
    enableSelection: true,
    enableHover: true,
  },
  clean: {
    mode: 'clean',
    title: 'Clean PDF',
    description: 'Display PDF without any overlays',
    defaultColor: '',
    showGrouping: false,
    enableSelection: false,
    enableHover: false,
  },
};

/**
 * Legacy annotation interface (for backward compatibility)
 */
interface LegacyAnnotation {
  id: number;
  page: number;
  text: string;
  x_coord: number;
  y_coord: number;
  width: number;
  height: number;
}

/**
 * Convert legacy annotation data to OverlayItem format
 */
export function convertLegacyAnnotation(
  annotation: LegacyAnnotation,
  type: 'line' | 'ocr_text' = 'line'
): OverlayItem {
  return {
    id: annotation.id.toString(),
    name: annotation.text,
    coordinates: {
      x: annotation.x_coord,
      y: annotation.y_coord,
      width: annotation.width,
      height: annotation.height,
    },
    type,
    page: annotation.page,
    metadata: {
      originalId: annotation.id,
    },
  };
}

/**
 * Convert array of legacy annotations to OverlayItems
 */
export function convertLegacyAnnotations(
  annotations: LegacyAnnotation[],
  type: 'line' | 'ocr_text' = 'line'
): OverlayItem[] {
  return annotations.map(ann => convertLegacyAnnotation(ann, type));
}

/**
 * Generate colors for corrosion loops grouping
 */
export function generateLoopColors(groupCount: number): string[] {
  const colors = [
    '#FF6B6B', // Red
    '#4ECDC4', // Turquoise
    '#45B7D1', // Blue
    '#96CEB4', // Green
    '#FECA57', // Yellow
    '#FF9FF3', // Pink
    '#54A0FF', // Light Blue
    '#5F27CD', // Purple
    '#00D2D3', // Cyan
    '#FF9F43', // Orange
  ];
  
  // If we need more colors than predefined, generate them
  if (groupCount > colors.length) {
    for (let i = colors.length; i < groupCount; i++) {
      const hue = (i * 137.508) % 360; // Golden angle for better distribution
      colors.push(`hsl(${hue}, 70%, 60%)`);
    }
  }
  
  return colors.slice(0, groupCount);
}

/**
 * Group overlay items by groupId and assign colors for corrosion loops
 */
export function assignCorrosionLoopColors(items: OverlayItem[]): OverlayItem[] {
  // Get unique group IDs
  const groupIds = [...new Set(items.map(item => item.groupId).filter(Boolean))];
  const colors = generateLoopColors(groupIds.length);
  
  // Create color mapping
  const colorMap = new Map<string, string>();
  groupIds.forEach((groupId, index) => {
    if (groupId) {
      colorMap.set(groupId, colors[index]);
    }
  });
  
  // Assign colors to items
  return items.map(item => ({
    ...item,
    color: item.groupId ? colorMap.get(item.groupId) : item.color,
  }));
}

/**
 * Filter overlay items by page number
 */
export function filterByPage(items: OverlayItem[], pageNumber: number): OverlayItem[] {
  return items.filter(item => !item.page || item.page === pageNumber);
}

/**
 * Get items belonging to the same group
 */
export function getGroupItems(items: OverlayItem[], groupId: string): OverlayItem[] {
  return items.filter(item => item.groupId === groupId);
}

/**
 * Calculate adjusted coordinates based on scale and zoom
 */
export function calculateAdjustedCoordinates(
  coordinates: OverlayCoordinates,
  scale: number,
  zoom: number,
  padding: number = 0
): OverlayCoordinates {
  return {
    x: (coordinates.x / scale) * zoom - padding,
    y: (coordinates.y / scale) * zoom - padding,
    width: (coordinates.width / scale) * zoom + (padding * 2),
    height: (coordinates.height / scale) * zoom + (padding * 2),
  };
}

/**
 * Get render colors for different item states
 */
export function getRenderColors(
  item: OverlayItem,
  config: DisplayModeConfig,
  isSelected: boolean = false,
  isHovered: boolean = false
): { fill: string; stroke: string } {
  const baseColor = item.color || config.defaultColor;
  
  if (isSelected) {
    return {
      fill: 'rgba(255, 0, 0, 0.3)',
      stroke: 'red',
    };
  }
  
  if (isHovered) {
    return {
      fill: 'rgba(255, 255, 0, 0.5)',
      stroke: 'yellow',
    };
  }
  
  // Convert color to rgba format for fill
  const fillColor = baseColor.startsWith('#') 
    ? hexToRgba(baseColor, 0.15)
    : baseColor.includes('rgba') 
      ? baseColor 
      : `rgba(0, 123, 255, 0.15)`;
  
  return {
    fill: fillColor,
    stroke: baseColor,
  };
}

/**
 * Convert hex color to rgba
 */
function hexToRgba(hex: string, alpha: number): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return `rgba(0, 123, 255, ${alpha})`;
  
  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);
  
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
} 