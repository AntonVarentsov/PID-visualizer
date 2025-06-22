import { useState, useRef, useEffect } from 'react';
import { pdfjs, Document, Page } from 'react-pdf';
import { fabric } from 'fabric';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import './App.css';

import testPdf from '../../data/test_pid.pdf';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface LineNumber {
  id: number;
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
  const [lineNumbers, setLineNumbers] = useState<LineNumber[]>([]);
  const [highlightedId, setHighlightedId] = useState<number | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mainContainerRef = useRef<HTMLDivElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);

  useEffect(() => {
    const initializeCanvasAndLoadData = async () => {
      // 1. Initialize Canvas
      if (!canvasRef.current || fabricCanvasRef.current) return;
      const canvas = new fabric.Canvas(canvasRef.current);
      fabricCanvasRef.current = canvas;

      // 2. Fetch and Draw Annotations
      try {
        const response = await fetch('http://localhost:8000/doc/1');
        if (!response.ok) {
          throw new Error(`Network response was not ok: ${response.statusText}`);
        }
        const data = await response.json();

        if (data.line_numbers) {
          setLineNumbers(data.line_numbers); // Save to state
          data.line_numbers.forEach((line: LineNumber) => {
            const rect = new fabric.Rect({
              left: line.x_coord,
              top: line.y_coord,
              width: line.width,
              height: line.height,
              fill: 'rgba(0, 0, 255, 0.3)',
              stroke: 'blue',
              strokeWidth: 1,
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

    // Since onPageRenderSuccess can be called multiple times, we use a timeout
    // to ensure we only initialize once after the layout is stable.
    const initTimeout = setTimeout(initializeCanvasAndLoadData, 100);


    return () => {
      clearTimeout(initTimeout);
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose();
        fabricCanvasRef.current = null;
      }
    };
  }, []); // Run this effect only once

  // Handle Highlighting
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    canvas.getObjects().forEach(obj => {
      if (obj instanceof fabric.Rect && obj.data) {
        if (obj.data.id === highlightedId) {
          obj.set({
            stroke: 'red',
            strokeWidth: 3
          });
        } else {
          obj.set({
            stroke: 'blue',
            strokeWidth: 1
          });
        }
      }
    });

    canvas.renderAll();
  }, [highlightedId]);

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
          fill: 'rgba(255,0,0,0.5)',
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
                devicePixelRatio={3}
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
              {lineNumbers.map(line => (
                <li 
                  key={line.id}
                  onMouseEnter={() => setHighlightedId(line.id)}
                  onMouseLeave={() => setHighlightedId(null)}
                  className={highlightedId === line.id ? 'highlighted' : ''}
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
