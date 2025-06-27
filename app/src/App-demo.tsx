import { useState, useEffect } from 'react';
import { pdfjs, Document, Page } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import './App.css';

import UniversalPDFFrame from './components/UniversalPDFFrame';
import DisplayModeSelector from './components/DisplayModeSelector';
import type { OverlayItem, DisplayMode, OverlayEventHandlers } from './types/overlay';
import { convertLegacyAnnotations } from './utils/overlayUtils';

import testPdf from '../../data/test_pid.pdf';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// Legacy annotation interface for backward compatibility (kept for future API integration)
// interface LegacyAnnotation {
//   id: number;
//   page: number;
//   text: string;
//   x_coord: number;
//   y_coord: number;
//   width: number;
//   height: number;
// }

function App() {
  const [numPages, setNumPages] = useState<number>();
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [displayMode, setDisplayMode] = useState<DisplayMode>('line_numbers');
  const [overlayData, setOverlayData] = useState<OverlayItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<OverlayItem | null>(null);
  const [hoveredItem, setHoveredItem] = useState<OverlayItem | null>(null);
  const [pdfScale, setPdfScale] = useState<number>(1);
  const [currentZoom, setCurrentZoom] = useState<number>(1);

  // Demo data - создаем тестовые данные для разных режимов
  const createDemoData = (): Record<DisplayMode, OverlayItem[]> => {
    // Базовые данные для line_numbers (используем реальные данные если доступны)
    const baseLineNumbers: OverlayItem[] = [
      {
        id: '1',
        name: 'LINE-001',
        coordinates: { x: 100, y: 100, width: 80, height: 20 },
        type: 'line',
        page: 1,
      },
      {
        id: '2', 
        name: 'LINE-002',
        coordinates: { x: 200, y: 150, width: 80, height: 20 },
        type: 'line',
        page: 1,
      },
      {
        id: '3',
        name: 'LINE-003', 
        coordinates: { x: 300, y: 200, width: 80, height: 20 },
        type: 'line',
        page: 1,
      }
    ];

    // OCR Results (зеленые)
    const ocrResults: OverlayItem[] = baseLineNumbers.map(item => ({
      ...item,
      id: `ocr_${item.id}`,
      name: `OCR: ${item.name}`,
      type: 'ocr_text' as const,
      color: '#28a745'
    }));

    // Corrosion Loops (группы с разными цветами)
    const corrosionLoops: OverlayItem[] = [
      {
        ...baseLineNumbers[0],
        id: 'loop_1_1',
        name: 'LOOP-A-001',
        groupId: 'loop_a',
        type: 'corrosion_loop',
        color: '#FF6B6B'
      },
      {
        ...baseLineNumbers[1], 
        id: 'loop_1_2',
        name: 'LOOP-A-002',
        groupId: 'loop_a',
        type: 'corrosion_loop',
        color: '#FF6B6B'
      },
      {
        ...baseLineNumbers[2],
        id: 'loop_2_1', 
        name: 'LOOP-B-001',
        groupId: 'loop_b',
        type: 'corrosion_loop',
        color: '#4ECDC4'
      }
    ];

    // Equipment (желтые)
    const equipment: OverlayItem[] = [
      {
        id: 'eq_1',
        name: 'PUMP-001',
        coordinates: { x: 150, y: 300, width: 60, height: 40 },
        type: 'equipment',
        page: 1,
        color: '#ffc107'
      },
      {
        id: 'eq_2', 
        name: 'VALVE-001',
        coordinates: { x: 250, y: 350, width: 40, height: 30 },
        type: 'equipment',
        page: 1,
        color: '#ffc107'
      }
    ];

    return {
      line_numbers: baseLineNumbers,
      ocr_results: ocrResults,
      corrosion_loops: corrosionLoops,
      equipment: equipment,
      clean: []
    };
  };

  const demoData = createDemoData();

  // Load real data from API when available
  useEffect(() => {
    const loadAnnotations = async () => {
      try {
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
        const response = await fetch(`${apiBaseUrl}/doc/1`);
        if (!response.ok) {
          console.warn('API not available, using demo data');
          setOverlayData(demoData[displayMode]);
          return;
        }
        
        const data = await response.json();
        if (data.line_numbers) {
          const convertedData = convertLegacyAnnotations(data.line_numbers, 'line');
          // Обновляем только line_numbers данные, остальные остаются демо
          const updatedDemoData = { ...demoData };
          updatedDemoData.line_numbers = convertedData;
          setOverlayData(updatedDemoData[displayMode]);
        } else {
          setOverlayData(demoData[displayMode]);
        }
      } catch (error) {
        console.error('Failed to fetch annotations:', error);
        setOverlayData(demoData[displayMode]);
      }
    };

    loadAnnotations();
  }, [pageNumber, displayMode]);

  // Update PDF scale based on zoom level
  useEffect(() => {
    const newPdfScale = Math.min(Math.max(currentZoom, 1), 3);
    setPdfScale(newPdfScale);
  }, [currentZoom]);

  // Event handlers for overlay interactions
  const eventHandlers: OverlayEventHandlers = {
    onItemClick: (item: OverlayItem) => {
      console.log('Item clicked:', item);
      setSelectedItem(selectedItem?.id === item.id ? null : item);
    },
    onItemHover: (item: OverlayItem | null) => {
      setHoveredItem(item);
    },
    onGroupClick: (groupId: string, items: OverlayItem[]) => {
      console.log('Group clicked:', groupId, items);
    },
    onGroupHover: (groupId: string, items: OverlayItem[]) => {
      console.log('Group hovered:', groupId, items);
    }
  };

  // PDF document handlers
  function onDocumentLoadSuccess({ numPages }: { numPages: number }): void {
    setNumPages(numPages);
  }

  const changePage = (offset: number) => {
    setPageNumber(prevPageNumber => prevPageNumber + offset);
  };

  const previousPage = () => changePage(-1);
  const nextPage = () => changePage(1);

  return (
    <div className="App" style={{ textAlign: 'left' }}>
      {/* Mode selector */}
      <div style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>
        <DisplayModeSelector
          currentMode={displayMode}
          onModeChange={setDisplayMode}
        />
      </div>

      <div style={{ display: 'flex' }}>
        {/* Universal PDF Frame */}
        <UniversalPDFFrame
          mode={displayMode}
          overlayData={overlayData}
          pageNumber={pageNumber}
          pdfScale={pdfScale}
          eventHandlers={eventHandlers}
          onZoomChange={setCurrentZoom}
        >
          <div style={{ position: 'absolute', top: 0, left: 0 }}>
            <Document file={testPdf} onLoadSuccess={onDocumentLoadSuccess}>
              <Page
                className="pdf-page-container"
                pageNumber={pageNumber}
                scale={pdfScale}
              />
            </Document>
          </div>
        </UniversalPDFFrame>

        {/* Item list sidebar */}
        <div className="item-list" style={{ marginLeft: '20px', width: '450px', flexShrink: 0 }}>
          <h3>{displayMode === 'clean' ? 'Clean PDF Mode' : `${demoData[displayMode]?.length || 0} Items`}</h3>
          
          {displayMode !== 'clean' && (
            <div>
              <h4>Mode: {displayMode.replace('_', ' ').toUpperCase()}</h4>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {overlayData.map(item => (
                  <li 
                    key={item.id}
                    onClick={() => eventHandlers.onItemClick?.(item)}
                    onMouseEnter={() => eventHandlers.onItemHover?.(item)}
                    onMouseLeave={() => eventHandlers.onItemHover?.(null)}
                    style={{
                      padding: '8px',
                      margin: '4px 0',
                      backgroundColor: selectedItem?.id === item.id ? '#e3f2fd' : 
                                      hoveredItem?.id === item.id ? '#f5f5f5' : 'white',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      borderLeft: `4px solid ${item.color || '#007bff'}`
                    }}
                  >
                    <div style={{ fontWeight: 'bold' }}>{item.name}</div>
                    {item.groupId && (
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        Group: {item.groupId}
                      </div>
                    )}
                    <div style={{ fontSize: '11px', color: '#999' }}>
                      {item.type} • ({item.coordinates.x}, {item.coordinates.y})
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Selected item details */}
          {selectedItem && (
            <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
              <h4>Selected Item</h4>
              <p><strong>ID:</strong> {selectedItem.id}</p>
              <p><strong>Name:</strong> {selectedItem.name}</p>
              <p><strong>Type:</strong> {selectedItem.type}</p>
              {selectedItem.groupId && (
                <p><strong>Group:</strong> {selectedItem.groupId}</p>
              )}
              <p><strong>Coordinates:</strong> ({selectedItem.coordinates.x}, {selectedItem.coordinates.y})</p>
            </div>
          )}
        </div>
      </div>

      {/* Page navigation */}
      <div style={{ padding: '10px', borderTop: '1px solid #ddd' }}>
        <p>
          Page {pageNumber} of {numPages}
        </p>
        <button
          type="button"
          disabled={pageNumber <= 1}
          onClick={previousPage}
        >
          Previous
        </button>
        <button
          type="button"
          disabled={!numPages || pageNumber >= numPages}
          onClick={nextPage}
          style={{ marginLeft: '10px' }}
        >
          Next
        </button>
      </div>
    </div>
  );
}

export default App; 