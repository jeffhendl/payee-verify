'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Loader2, ExternalLink, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function PdfPreview({ invoiceId }: { invoiceId: string }) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchUrl() {
      try {
        const res = await fetch(`/api/invoices/pdf?id=${invoiceId}`);
        if (res.ok) {
          const data = await res.json();
          setPdfUrl(data.url);
        } else {
          setError(true);
        }
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    fetchUrl();
  }, [invoiceId]);

  const handleZoomIn = () => setZoom(z => Math.min(z + 0.25, 3));
  const handleZoomOut = () => setZoom(z => Math.max(z - 0.25, 0.5));
  const handleReset = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (zoom <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  }, [zoom, pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom(z => Math.min(Math.max(z + delta, 0.5), 3));
    }
  }, []);

  return (
    <Card className="rounded-2xl border-[#E8EAEC] shadow-[0_1px_3px_rgba(0,0,0,0.04)] sticky top-24">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg tracking-[-0.01em] flex items-center gap-2">
            <FileText className="h-5 w-5 text-[#045B3F]" />
            Invoice PDF
          </CardTitle>
          <div className="flex items-center gap-1">
            {pdfUrl && (
              <>
                <Button variant="ghost" size="sm" onClick={handleZoomOut} className="h-7 w-7 p-0 text-[#71717A] hover:text-[#045B3F]">
                  <ZoomOut className="h-3.5 w-3.5" />
                </Button>
                <span className="text-[11px] text-[#92979C] min-w-[3ch] text-center">{Math.round(zoom * 100)}%</span>
                <Button variant="ghost" size="sm" onClick={handleZoomIn} className="h-7 w-7 p-0 text-[#71717A] hover:text-[#045B3F]">
                  <ZoomIn className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="sm" onClick={handleReset} className="h-7 w-7 p-0 text-[#71717A] hover:text-[#045B3F]">
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
                <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-[#71717A] hover:text-[#045B3F]">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                </a>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading && (
          <div className="flex items-center justify-center bg-[#F7F7F7] rounded-xl" style={{ aspectRatio: '8.5/11' }}>
            <Loader2 className="h-6 w-6 animate-spin text-[#92979C]" />
          </div>
        )}
        {error && (
          <div className="flex flex-col items-center justify-center h-[300px] bg-[#F7F7F7] rounded-xl">
            <FileText className="h-10 w-10 text-[#D3D7DC] mb-3" />
            <p className="text-sm text-[#92979C]">Unable to load PDF preview</p>
          </div>
        )}
        {pdfUrl && !loading && (
          <div
            ref={containerRef}
            className="rounded-xl border border-[#E8EAEC] overflow-hidden bg-[#525659]"
            style={{ aspectRatio: '8.5/11', cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
          >
            <iframe
              src={`${pdfUrl}#toolbar=0&navpanes=0&view=FitH`}
              className="w-full h-full border-0"
              style={{
                transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                transformOrigin: 'top left',
              }}
              title="Invoice PDF"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
