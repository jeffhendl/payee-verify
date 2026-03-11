'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react';
import type { InvoiceStatus } from '@/lib/types';

interface FailedInvoice {
  id: string;
  file_name: string;
  status: InvoiceStatus;
  created_at: string;
  payees: Array<{
    company_name: string | null;
    invoice_amount: number | null;
    currency: string;
  }>;
}

function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function FailedUploadsLog({ invoices }: { invoices: FailedInvoice[] }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-8">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-sm text-[#92979C] hover:text-[#606265] transition-colors mb-3"
      >
        {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        <AlertTriangle className="h-4 w-4 text-[#F12D1B]" />
        <span>{invoices.length} failed upload{invoices.length !== 1 ? 's' : ''}</span>
      </button>

      {expanded && (
        <div className="bg-[#FAFAFA] rounded-xl border border-[#E8EAEC] overflow-hidden">
          <div className="divide-y divide-[#E8EAEC]">
            {invoices.map((invoice) => (
              <div key={invoice.id} className="px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-4 w-4 text-[#F12D1B] flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-[#383B3E]">{invoice.file_name}</p>
                    <p className="text-xs text-[#92979C]">
                      Failed to parse — the file may not be a valid invoice PDF
                    </p>
                  </div>
                </div>
                <span className="text-xs text-[#92979C] flex-shrink-0 ml-4">{timeAgo(invoice.created_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
