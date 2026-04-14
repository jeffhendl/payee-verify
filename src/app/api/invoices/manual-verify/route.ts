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

    const { invoiceId } = await request.json();

    if (!invoiceId) {
      return NextResponse.json({ error: 'invoiceId is required' }, { status: 400 });
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

    if (!['parsed', 'verification_sent'].includes(invoice.status)) {
      return NextResponse.json({ error: 'Invoice is not in a state that can be manually verified' }, { status: 400 });
    }

    const { error: updateError } = await supabaseAdmin
      .from('invoices')
      .update({ status: 'pending_review', updated_at: new Date().toISOString() })
      .eq('id', invoiceId);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update invoice' }, { status: 500 });
    }

    return NextResponse.json({ success: true, status: 'pending_review' });
  } catch (error) {
    console.error('Manual verify error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
