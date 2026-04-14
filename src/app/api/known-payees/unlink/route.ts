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

    const { payeeId } = await request.json();
    if (!payeeId) {
      return NextResponse.json({ error: 'payeeId is required' }, { status: 400 });
    }

    // Verify the payee belongs to an invoice owned by this user
    const { data: payee } = await supabaseAdmin
      .from('payees')
      .select('id, invoice_id, invoices!inner(user_id, status)')
      .eq('id', payeeId)
      .single();

    if (!payee) {
      return NextResponse.json({ error: 'Payee not found' }, { status: 404 });
    }

    const inv = payee.invoices as unknown as { user_id: string; status: string };
    if (inv.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Clear the link
    await supabaseAdmin
      .from('payees')
      .update({ known_payee_id: null, match_result: null })
      .eq('id', payeeId);

    // If the invoice was set to pending_review by a match (no verification exists),
    // reset it back to parsed
    if (inv.status === 'pending_review') {
      const { data: verifications } = await supabaseAdmin
        .from('verifications')
        .select('id')
        .eq('invoice_id', payee.invoice_id)
        .limit(1);

      if (!verifications || verifications.length === 0) {
        await supabaseAdmin
          .from('invoices')
          .update({ status: 'parsed', updated_at: new Date().toISOString() })
          .eq('id', payee.invoice_id);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unlink known payee error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
