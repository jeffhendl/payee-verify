'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Loader2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function PdfPreview({ invoiceId }: { invoiceId: string }) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

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

  return (
    <Card className="rounded-2xl border-[#E8EAEC] shadow-[0_1px_3px_rgba(0,0,0,0.04)] sticky top-24">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg tracking-[-0.01em] flex items-center gap-2">
            <FileText className="h-5 w-5 text-[#045B3F]" />
            Invoice PDF
          </CardTitle>
          {pdfUrl && (
            <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="ghost" size="sm" className="gap-1.5 text-[12px] text-[#71717A] hover:text-[#045B3F]">
                <ExternalLink className="h-3.5 w-3.5" />
                Open
              </Button>
            </a>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading && (
          <div className="flex items-center justify-center h-[500px] bg-[#F7F7F7] rounded-xl">
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
          <iframe
            src={`${pdfUrl}#toolbar=0&navpanes=0`}
            className="w-full h-[600px] rounded-xl border border-[#E8EAEC]"
            title="Invoice PDF"
          />
        )}
      </CardContent>
    </Card>
  );
}
