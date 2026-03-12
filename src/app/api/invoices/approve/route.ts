import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { invoiceId, action } = await request.json();

    if (!invoiceId || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    // Verify the invoice belongs to this user
    const { data: invoice, error } = await supabase
      .from('invoices')
      .select('id, status')
      .eq('id', invoiceId)
      .eq('user_id', user.id)
      .single();

    if (error || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Check verification status — if payee confirmed, allow approval even if invoice status is stale
    const { data: verification } = await supabaseAdmin
      .from('verifications')
      .select('status')
      .eq('invoice_id', invoiceId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const isPayeeConfirmed = verification?.status === 'confirmed';
    const isCallCompleted = verification?.status === 'opened'; // phone call completed
    const isPayeeDenied = verification?.status === 'denied';
    const isInvoicePendingReview = invoice.status === 'pending_review';
    const isVerificationSent = invoice.status === 'verification_sent';

    // For approval: payee must have confirmed, call completed, or invoice must be pending_review
    // For rejection: allow if payee denied, payee confirmed, call completed, pending review, or verification was sent
    if (action === 'approve' && !isPayeeConfirmed && !isCallCompleted && !isInvoicePendingReview) {
      return NextResponse.json({ error: 'Invoice is not ready for approval' }, { status: 400 });
    }

    if (action === 'reject' && !isPayeeConfirmed && !isCallCompleted && !isPayeeDenied && !isInvoicePendingReview && !isVerificationSent) {
      console.error('Reject guard failed:', { verificationStatus: verification?.status, invoiceStatus: invoice.status });
      return NextResponse.json({ error: `Invoice is not ready for rejection (verification: ${verification?.status}, invoice: ${invoice.status})` }, { status: 400 });
    }

    const newStatus = action === 'approve' ? 'verified' : 'denied';

    // Use admin client to ensure update succeeds regardless of RLS
    const { error: updateError } = await supabaseAdmin
      .from('invoices')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', invoiceId);

    if (updateError) {
      console.error('Invoice approve update error:', updateError, { invoiceId, action, newStatus });
      return NextResponse.json({ error: `Failed to update invoice: ${updateError.message}` }, { status: 500 });
    }

    return NextResponse.json({ success: true, status: newStatus });
  } catch (error) {
    console.error('Approve error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
