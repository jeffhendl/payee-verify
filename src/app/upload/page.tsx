import { NavBar } from '@/components/nav-bar';
import { InvoiceUploadForm } from '@/components/invoice-upload-form';
import { Zap, FileSearch, ShieldCheck, Send } from 'lucide-react';

export default function UploadPage() {
  return (
    <div className="min-h-screen bg-[#FCFCFC]">
      <NavBar />
      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-[#1D1D1D] tracking-[-0.02em]">Upload Invoice</h1>
          <p className="text-[#71717A] mt-1.5 text-[15px]">
            Upload a PDF invoice to extract and verify payee details
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-10">
          <InvoiceUploadForm />
          <div className="space-y-6">
            <h3 className="text-sm font-semibold text-[#1D1D1D] uppercase tracking-wider">How it works</h3>
            <div className="space-y-5">
              <div className="flex gap-3">
                <div className="h-8 w-8 rounded-full bg-[#F2FCE4] flex items-center justify-center flex-shrink-0">
                  <Zap className="h-4 w-4 text-[#045B3F]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#1D1D1D]">AI-powered extraction</p>
                  <p className="text-xs text-[#71717A] mt-0.5 leading-relaxed">Our system reads the invoice and extracts vendor name, contact info, banking details, and payment amounts.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="h-8 w-8 rounded-full bg-[#F2FCE4] flex items-center justify-center flex-shrink-0">
                  <FileSearch className="h-4 w-4 text-[#045B3F]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#1D1D1D]">Review &amp; edit</p>
                  <p className="text-xs text-[#71717A] mt-0.5 leading-relaxed">Confirm the extracted details are correct. Edit any fields that need updating before sending verification.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="h-8 w-8 rounded-full bg-[#F2FCE4] flex items-center justify-center flex-shrink-0">
                  <Send className="h-4 w-4 text-[#045B3F]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#1D1D1D]">Send verification</p>
                  <p className="text-xs text-[#71717A] mt-0.5 leading-relaxed">The payee receives an SMS to confirm their details. They can also provide banking information if it was missing from the invoice.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="h-8 w-8 rounded-full bg-[#F2FCE4] flex items-center justify-center flex-shrink-0">
                  <ShieldCheck className="h-4 w-4 text-[#045B3F]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#1D1D1D]">Approve payment</p>
                  <p className="text-xs text-[#71717A] mt-0.5 leading-relaxed">Once the payee confirms, review their response and approve the invoice with confidence.</p>
                </div>
              </div>
            </div>
            <div className="pt-4 border-t border-[#E8EAEC]">
              <p className="text-xs text-[#92979C] leading-relaxed">
                Supported formats: PDF invoices from US and Canadian vendors. Banking details are validated against regional standards.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
