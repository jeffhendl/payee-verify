import { NavBar } from '@/components/nav-bar';
import { InvoiceUploadForm } from '@/components/invoice-upload-form';

export default function UploadPage() {
  return (
    <div className="min-h-screen bg-white">
      <NavBar />
      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-[#1D1D1D] tracking-[-0.02em]">Upload Invoice</h1>
          <p className="text-[#71717A] mt-1.5 text-[15px]">
            Upload a PDF invoice to extract and verify payee details
          </p>
        </div>
        <InvoiceUploadForm />
      </main>
    </div>
  );
}
