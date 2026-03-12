'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Loader2, ExternalLink, ZoomIn, ZoomOut, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function PdfPreview({ invoiceId }: { invoiceId: string }) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pageNum, setPageNum] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pdfDocRef = useRef<any>(null);

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

  // Load PDF document
  useEffect(() => {
    if (!pdfUrl) return;

    let cancelled = false;

    async function loadPdf() {
      try {
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

        const loadingTask = pdfjsLib.getDocument(pdfUrl as string);
        const pdf = await loadingTask.promise;

        if (cancelled) return;

        pdfDocRef.current = pdf;
        setTotalPages(pdf.numPages);
        setPageNum(1);
      } catch (err) {
        console.error('PDF load error:', err);
        if (!cancelled) setError(true);
      }
    }

    loadPdf();
    return () => { cancelled = true; };
  }, [pdfUrl]);

  // Render current page
  const renderPage = useCallback(async () => {
    const pdf = pdfDocRef.current;
    const canvas = canvasRef.current;
    if (!pdf || !canvas) return;

    setRendering(true);

    try {
      const page = await pdf.getPage(pageNum);
      const containerWidth = containerRef.current?.clientWidth || 370;
      const baseScale = containerWidth / page.getViewport({ scale: 1 }).width;
      const viewport = page.getViewport({ scale: baseScale * zoom });

      canvas.width = viewport.width * 2; // 2x for retina
      canvas.height = viewport.height * 2;
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;

      const ctx = canvas.getContext('2d')!;
      ctx.scale(2, 2);

      await page.render({
        canvasContext: ctx,
        viewport,
      }).promise;
    } catch (err) {
      console.error('PDF render error:', err);
    } finally {
      setRendering(false);
    }
  }, [pageNum, zoom]);

  useEffect(() => {
    if (pdfDocRef.current && totalPages > 0) {
      renderPage();
    }
  }, [renderPage, totalPages]);

  const handleZoomIn = () => setZoom(z => Math.min(z + 0.25, 3));
  const handleZoomOut = () => setZoom(z => Math.max(z - 0.25, 0.5));
  const handleReset = () => setZoom(1);
  const handlePrevPage = () => setPageNum(p => Math.max(p - 1, 1));
  const handleNextPage = () => setPageNum(p => Math.min(p + 1, totalPages));

  return (
    <Card className="rounded-2xl border-[#E8EAEC] shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden min-h-0 flex-1 flex flex-col">
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
      <CardContent className="flex-1 min-h-0 flex flex-col">
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
        {pdfUrl && !loading && !error && (
          <>
            <div
              ref={containerRef}
              className="rounded-xl border border-[#E8EAEC] overflow-auto bg-[#525659] relative w-full flex-1 min-h-0"
            >
              {rendering && (
                <div className="absolute inset-0 flex items-center justify-center bg-[#525659]/50 z-10">
                  <Loader2 className="h-5 w-5 animate-spin text-white" />
                </div>
              )}
              <canvas ref={canvasRef} className="block mx-auto" />
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-3">
                <Button variant="ghost" size="sm" onClick={handlePrevPage} disabled={pageNum <= 1} className="h-7 w-7 p-0">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs text-[#92979C]">{pageNum} / {totalPages}</span>
                <Button variant="ghost" size="sm" onClick={handleNextPage} disabled={pageNum >= totalPages} className="h-7 w-7 p-0">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
