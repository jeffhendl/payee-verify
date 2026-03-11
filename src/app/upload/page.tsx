import { NavBar } from '@/components/nav-bar';
import { InvoiceUploadForm } from '@/components/invoice-upload-form';

export default function UploadPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Upload Invoice</h1>
          <p className="text-gray-500 mt-1">
            Upload a PDF invoice to extract and verify payee details
          </p>
        </div>
        <InvoiceUploadForm />
      </main>
    </div>
  );
}
