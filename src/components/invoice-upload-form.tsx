'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, Loader2, CheckCircle, FileText } from 'lucide-react';
import { toast } from 'sonner';

type UploadState = 'idle' | 'uploading' | 'parsing' | 'done';

export function InvoiceUploadForm() {
  const [state, setState] = useState<UploadState>('idle');
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const router = useRouter();

  const processFile = useCallback(async (file: File) => {
    if (file.type !== 'application/pdf') {
      toast.error('Please upload a PDF file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large (max 10MB)');
      return;
    }

    setFileName(file.name);
    setState('uploading');

    try {
      // Step 1: Upload
      const formData = new FormData();
      formData.append('file', file);

      const uploadRes = await fetch('/api/invoices/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) {
        const err = await uploadRes.json();
        throw new Error(err.error || 'Upload failed');
      }

      const { invoiceId } = await uploadRes.json();

      // Step 2: Parse
      setState('parsing');

      const parseRes = await fetch('/api/invoices/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId }),
      });

      if (!parseRes.ok) {
        const err = await parseRes.json();
        throw new Error(err.error || 'Parsing failed');
      }

      setState('done');
      toast.success('Invoice parsed successfully!');

      // Redirect to review page
      setTimeout(() => {
        router.push(`/review/${invoiceId}`);
      }, 500);
    } catch (error) {
      console.error('Upload/parse error:', error);
      toast.error(error instanceof Error ? error.message : 'Something went wrong');
      setState('idle');
      setFileName(null);
    }
  }, [router]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  return (
    <Card className="max-w-2xl mx-auto rounded-2xl border-[#E8EAEC] shadow-[0_1px_3px_rgba(0,0,0,0.04),0_6px_24px_rgba(0,0,0,0.03)]">
      <CardContent className="pt-6">
        <div
          className={`border-2 border-dashed rounded-xl p-12 text-center transition-all ${
            dragActive
              ? 'border-[#045B3F] bg-[#F2FCE4]'
              : state === 'idle'
              ? 'border-[#D3D7DC] hover:border-[#92979C] bg-white'
              : 'border-[#D3D7DC] bg-white'
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
        >
          {state === 'idle' && (
            <div className="flex flex-col items-center">
              <div className={`h-12 w-12 rounded-full flex items-center justify-center mb-4 transition-colors ${
                dragActive ? 'bg-[#045B3F]' : 'bg-[#F2FCE4]'
              }`}>
                <Upload className={`h-5 w-5 transition-colors ${
                  dragActive ? 'text-white' : 'text-[#045B3F]'
                }`} />
              </div>
              <p className="text-base font-medium text-[#383B3E] mb-1">
                Drop your invoice here
              </p>
              <p className="text-sm text-[#92979C] mb-5">PDF format, up to 10MB</p>
              <div className="flex items-center gap-3">
                <label className="cursor-pointer">
                  <Button
                    type="button"
                    className="bg-[#045B3F] hover:bg-[#034830] h-9 px-4 text-[13px] font-medium pointer-events-none"
                  >
                    Browse files
                  </Button>
                  <input
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={handleFileInput}
                  />
                </label>
              </div>
            </div>
          )}

          {state === 'uploading' && (
            <div className="flex flex-col items-center">
              <div className="h-12 w-12 rounded-full bg-[#F2FCE4] flex items-center justify-center mb-4">
                <Loader2 className="h-5 w-5 text-[#045B3F] animate-spin" />
              </div>
              <p className="text-base font-medium text-[#383B3E] mb-1">
                Uploading {fileName}
              </p>
              <p className="text-sm text-[#92979C]">Please wait</p>
            </div>
          )}

          {state === 'parsing' && (
            <div className="flex flex-col items-center">
              <div className="h-12 w-12 rounded-full bg-[#F2FCE4] flex items-center justify-center mb-4">
                <Loader2 className="h-5 w-5 text-[#045B3F] animate-spin" />
              </div>
              <p className="text-base font-medium text-[#383B3E] mb-1">
                Analyzing invoice with AI
              </p>
              <p className="text-sm text-[#92979C]">
                Extracting payee details, banking information, and invoice data
              </p>
            </div>
          )}

          {state === 'done' && (
            <div className="flex flex-col items-center">
              <div className="h-12 w-12 rounded-full bg-[#F2FCE4] flex items-center justify-center mb-4">
                <CheckCircle className="h-5 w-5 text-[#30AC2E]" />
              </div>
              <p className="text-base font-medium text-[#383B3E] mb-1">
                Invoice parsed successfully!
              </p>
              <p className="text-sm text-[#92979C]">Redirecting to review...</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
