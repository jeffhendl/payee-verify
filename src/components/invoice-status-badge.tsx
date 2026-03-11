import { Badge } from '@/components/ui/badge';
import type { InvoiceStatus } from '@/lib/types';

const statusConfig: Record<InvoiceStatus, { label: string; className: string }> = {
  uploaded: { label: 'Uploaded', className: 'bg-gray-100 text-gray-700 hover:bg-gray-100' },
  parsing: { label: 'Parsing...', className: 'bg-blue-100 text-blue-700 hover:bg-blue-100' },
  parsed: { label: 'Parsed', className: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100' },
  verification_sent: { label: 'Verification Sent', className: 'bg-orange-100 text-orange-700 hover:bg-orange-100' },
  verified: { label: 'Verified', className: 'bg-green-100 text-green-700 hover:bg-green-100' },
  failed: { label: 'Failed', className: 'bg-red-100 text-red-700 hover:bg-red-100' },
};

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  const config = statusConfig[status] || statusConfig.uploaded;
  return (
    <Badge className={config.className}>
      {config.label}
    </Badge>
  );
}
