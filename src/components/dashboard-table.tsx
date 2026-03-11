'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { InvoiceStatusBadge } from './invoice-status-badge';
import { FileText } from 'lucide-react';
import type { InvoiceStatus } from '@/lib/types';

interface DashboardInvoice {
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

export function DashboardTable({ invoices }: { invoices: DashboardInvoice[] }) {
  if (invoices.length === 0) {
    return (
      <div className="text-center py-16">
        <FileText className="h-12 w-12 text-[#D3D7DC] mx-auto mb-4" />
        <h3 className="text-lg font-medium text-[#383B3E] mb-1">No invoices yet</h3>
        <p className="text-[#92979C] mb-4">Upload your first invoice to get started</p>
        <Link href="/upload">
          <Button>Upload Invoice</Button>
        </Link>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>File Name</TableHead>
          <TableHead>Payee</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Uploaded</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {invoices.map((invoice) => {
          const payee = invoice.payees?.[0];
          const amount = payee?.invoice_amount;
          const currency = payee?.currency || 'USD';
          const formatted = amount
            ? new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount)
            : '—';

          return (
            <TableRow key={invoice.id} className="even:bg-[#F2FCE4]/50">
              <TableCell className="font-medium">{invoice.file_name}</TableCell>
              <TableCell>{payee?.company_name || '—'}</TableCell>
              <TableCell>{formatted}</TableCell>
              <TableCell>
                <InvoiceStatusBadge status={invoice.status} />
              </TableCell>
              <TableCell className="text-[#92979C]">{timeAgo(invoice.created_at)}</TableCell>
              <TableCell className="text-right">
                <Link href={`/review/${invoice.id}`}>
                  <Button variant="ghost" size="sm">
                    Review
                  </Button>
                </Link>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
