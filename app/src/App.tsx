import { useState, useRef, useEffect } from 'react';
import { pdfjs, Document, Page } from 'react-pdf';
import { fabric } from 'fabric';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import './App.css';

import testPdf from '../../data/test_pid.pdf';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface Annotation {
  id: number;
  page: number;
  text: string;
  x_coord: number;
  y_coord: number;
  width: number;
  height: number;
}

function App() {
  const [numPages, setNumPages] = useState<number>();
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [highlightedId, setHighlightedId] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mainContainerRef = useRef<HTMLDivElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);

  // Effect for initializing the Fabric.js canvas
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
  }, []); // Run only once on mount

  // Effect for loading and drawing annotations
  useEffect(() => {
    const loadAndDrawAnnotations = async () => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) {
        return;
      }

      // Clear previous annotations to avoid duplicates, but keep user-drawn shapes
      canvas.getObjects().forEach(obj => {
        if (obj.data && obj.data.id) {
          canvas.remove(obj);
        }
      });

      try {
        const response = await fetch('http://localhost:8000/doc/1');
        if (!response.ok) {
          throw new Error(`Network response was not ok: ${response.statusText}`);
        }
        const data = await response.json();

        const scale = 2; // Scale adjusted based on user feedback.

        if (data.line_numbers) {
          const pageAnnotations = data.line_numbers.filter((ann: Annotation) => ann.page === pageNumber);
          setAnnotations(pageAnnotations);

          pageAnnotations.forEach((line: Annotation) => {
            const baseStrokeWidth = 1.5;
            const padding = baseStrokeWidth; // Expand outwards to prevent clipping text

            const rect = new fabric.Rect({
              left: (line.x_coord / scale) - padding,
              top: (line.y_coord / scale) - padding,
              width: (line.width / scale) + (padding * 2),
              height: (line.height / scale) + (padding * 2),
              fill: 'rgba(0, 123, 255, 0.15)', // More transparent fill
              stroke: '#007bff',               // Less vibrant blue stroke
              strokeWidth: baseStrokeWidth,    // Thinner stroke
              selectable: true,
              data: { id: line.id, text: line.text }
            });
            canvas.add(rect);
          });
          canvas.renderAll();
        }
      } catch (error) {
        console.error('Failed to fetch or draw annotations:', error);
      }
    };

    // A small delay to ensure the PDF page has rendered and sizes are known
    const timer = setTimeout(loadAndDrawAnnotations, 100);

    return () => clearTimeout(timer);
  }, [pageNumber]); // Re-run when page number changes

  // Handle Highlighting and Selection styling
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    canvas.getObjects().forEach(obj => {
      if (obj instanceof fabric.Rect && obj.data) {
        if (obj.data.id === selectedId) { // Selected style
          obj.set({
            stroke: 'red',
            strokeWidth: 2, // Thinner stroke for selected
            fill: 'rgba(255, 0, 0, 0.3)'
          });
        } else if (obj.data.id === highlightedId) { // Hover style
          obj.set({
            stroke: 'yellow',
            strokeWidth: 2, // Thinner stroke for hovered
            fill: 'rgba(255, 255, 0, 0.5)'
          });
        } else { // Default style
          obj.set({
            stroke: '#007bff',
            strokeWidth: 1.5, // Thinner stroke
            fill: 'rgba(0, 123, 255, 0.15)'
          });
        }
      }
    });

    canvas.renderAll();
  }, [highlightedId, selectedId]);

  // Handle Canvas Clicks for Selection
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const handleCanvasClick = (e: fabric.IEvent) => {
        if (e.target && e.target.data && e.target.data.id) {
            // An object with an ID was clicked
            setSelectedId(currentId => 
                currentId === e.target!.data.id ? null : e.target!.data.id
            );
        } else {
            // The background was clicked
            setSelectedId(null);
        }
    };

    canvas.on('mouse:down', handleCanvasClick);

    return () => {
        canvas.off('mouse:down', handleCanvasClick);
    };
  }, []); // Run only once

  // Handle Drawing Mode
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    if (isDrawingMode) {
      canvas.selection = false;
      let rect: fabric.Rect | null = null;
      let isDown: boolean, origX: number, origY: number;

      const mouseDownHandler = (o: fabric.IEvent) => {
        isDown = true;
        const pointer = canvas.getPointer(o.e);
        origX = pointer.x;
        origY = pointer.y;
        rect = new fabric.Rect({
          left: origX,
          top: origY,
          originX: 'left',
          originY: 'top',
          width: 0,
          height: 0,
          angle: 0,
          fill: 'rgba(0, 255, 0, 0.5)',
          transparentCorners: false,
          selectable: false, // Prevent selection while drawing
        });
        canvas.add(rect);
      };

      const mouseMoveHandler = (o: fabric.IEvent) => {
        if (!isDown || !rect) return;
        const pointer = canvas.getPointer(o.e);

        if (origX > pointer.x) {
            rect.set({ left: pointer.x });
        }
        if (origY > pointer.y) {
            rect.set({ top: pointer.y });
        }

        rect.set({ width: Math.abs(origX - pointer.x) });
        rect.set({ height: Math.abs(origY - pointer.y) });

        canvas.renderAll();
      };

      const mouseUpHandler = () => {
        isDown = false;
        if (rect) {
            rect.set({ selectable: true });
        }
        // Exit drawing mode after one shape
        setIsDrawingMode(false); 
      };

      canvas.on('mouse:down', mouseDownHandler);
      canvas.on('mouse:move', mouseMoveHandler);
      canvas.on('mouse:up', mouseUpHandler);

      // Cleanup function
      return () => {
        canvas.off('mouse:down', mouseDownHandler);
        canvas.off('mouse:move', mouseMoveHandler);
        canvas.off('mouse:up', mouseUpHandler);
        canvas.selection = true; // Re-enable selection
      };
    }
  }, [isDrawingMode]);


  function onPageRenderSuccess() {
    // Find the canvas rendered by react-pdf to get its actual dimensions
    const pdfPageCanvas = mainContainerRef.current?.querySelector('.react-pdf__Page__canvas');

    if (pdfPageCanvas && fabricCanvasRef.current && mainContainerRef.current) {
      const { width, height } = pdfPageCanvas.getBoundingClientRect();
      
      // Set the size of our fabric canvas to match the PDF page
      fabricCanvasRef.current.setWidth(width);
      fabricCanvasRef.current.setHeight(height);
      
      // Set the size of the main container so the page layout is correct
      mainContainerRef.current.style.width = `${width}px`;
      mainContainerRef.current.style.height = `${height}px`;

      fabricCanvasRef.current.renderAll(); 
    }
  }

  function onDocumentLoadSuccess({ numPages }: { numPages: number }): void {
    setNumPages(numPages);
  }

  const toggleDrawingMode = () => {
    setIsDrawingMode(!isDrawingMode);
  };

  const changePage = (offset: number) => {
    setPageNumber(prevPageNumber => prevPageNumber + offset);
  };

  const previousPage = () => {
    changePage(-1);
  };

  const nextPage = () => {
    changePage(1);
  };

  return (
    <div className="App">
      <button 
        onClick={toggleDrawingMode}
        style={{ marginBottom: '10px' }}
      >
        {isDrawingMode ? 'Cancel Drawing' : 'Draw Rectangle'}
      </button>
      
      <div style={{ display: 'flex' }}>
        <div ref={mainContainerRef} style={{ position: 'relative', margin: '0 auto' }}>
          <div style={{ position: 'absolute', top: 0, left: 0 }}>
            <Document file={testPdf} onLoadSuccess={onDocumentLoadSuccess}>
              <Page
                className="pdf-page-container"
                pageNumber={pageNumber}
                onRenderSuccess={onPageRenderSuccess}
              />
            </Document>
          </div>
          <canvas
            ref={canvasRef}
            style={{ 
              position: 'absolute', 
              top: 0, 
              left: 0
            }}
          />
        </div>

        <div className="line-numbers-list" style={{ marginLeft: '20px', width: '450px', flexShrink: 0 }}>
            <h3>Line Numbers</h3>
            <ul>
              {annotations.map(line => (
                <li 
                  key={line.id}
                  onClick={() => setSelectedId(currentId => currentId === line.id ? null : line.id)}
                  onMouseEnter={() => setHighlightedId(line.id)}
                  onMouseLeave={() => setHighlightedId(null)}
                  className={
                    (selectedId === line.id ? 'selected' : '') +
                    (highlightedId === line.id ? ' highlighted' : '')
                  }
                >
                  {line.text}
                </li>
              ))}
            </ul>
        </div>
      </div>

      <div>
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
        >
          Next
        </button>
      </div>
    </div>
  );
}

export default App;
