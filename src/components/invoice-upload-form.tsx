'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FileUp, Loader2, CheckCircle } from 'lucide-react';
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
    <Card className="max-w-xl mx-auto">
      <CardContent className="pt-6">
        <div
          className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
            dragActive
              ? 'border-primary bg-primary/5'
              : state === 'idle'
              ? 'border-gray-300 hover:border-gray-400'
              : 'border-gray-200'
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
        >
          {state === 'idle' && (
            <>
              <FileUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-700 mb-2">
                Drop your invoice PDF here
              </p>
              <p className="text-sm text-gray-500 mb-4">or click to browse</p>
              <label className="cursor-pointer inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground">
                Choose File
                <input
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={handleFileInput}
                />
              </label>
            </>
          )}

          {state === 'uploading' && (
            <>
              <Loader2 className="h-12 w-12 text-primary mx-auto mb-4 animate-spin" />
              <p className="text-lg font-medium text-gray-700 mb-1">
                Uploading {fileName}...
              </p>
              <p className="text-sm text-gray-500">Please wait</p>
            </>
          )}

          {state === 'parsing' && (
            <>
              <Loader2 className="h-12 w-12 text-primary mx-auto mb-4 animate-spin" />
              <p className="text-lg font-medium text-gray-700 mb-1">
                Analyzing invoice with AI...
              </p>
              <p className="text-sm text-gray-500">
                Extracting payee details, banking information, and invoice data
              </p>
            </>
          )}

          {state === 'done' && (
            <>
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-700 mb-1">
                Invoice parsed successfully!
              </p>
              <p className="text-sm text-gray-500">Redirecting to review...</p>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
