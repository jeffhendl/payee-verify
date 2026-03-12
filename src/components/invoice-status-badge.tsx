import { Badge } from '@/components/ui/badge';
import type { InvoiceStatus } from '@/lib/types';

const statusConfig: Record<InvoiceStatus, { label: string; className: string }> = {
  uploaded: { label: 'Uploaded', className: 'bg-[#E5E5E5] text-[#606265] hover:bg-[#E5E5E5]' },
  parsing: { label: 'Parsing...', className: 'bg-[#CFE5F3] text-[#045B3F] hover:bg-[#CFE5F3]' },
  parsed: { label: 'Parsed', className: 'bg-[#EED9F7] text-[#8F5CCF] hover:bg-[#EED9F7]' },
  verification_sent: { label: 'Verification Sent', className: 'bg-[#D2F3A7] text-[#0F3B00] hover:bg-[#D2F3A7]' },
  pending_review: { label: 'Payee Confirmed', className: 'bg-[#FFF3CD] text-[#856404] hover:bg-[#FFF3CD]' },
  verified: { label: 'Verified', className: 'bg-[#F2FCE4] text-[#30AC2E] hover:bg-[#F2FCE4]' },
  denied: { label: 'Denied', className: 'bg-[#FEF1ED] text-[#F12D1B] hover:bg-[#FEF1ED]' },
  failed: { label: 'Failed', className: 'bg-[#FEE2E2] text-[#991B1B] hover:bg-[#FEE2E2]' },
};

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  const config = statusConfig[status] || statusConfig.uploaded;
  return (
    <Badge className={config.className}>
      {config.label}
    </Badge>
  );
}
