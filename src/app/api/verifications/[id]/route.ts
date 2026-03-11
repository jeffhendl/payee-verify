import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const { data: verification, error } = await supabase
      .from('verifications')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !verification) {
      return NextResponse.json({ error: 'Verification not found' }, { status: 404 });
    }

    // Verify the user owns this verification (via invoice)
    const { data: invoice } = await supabase
      .from('invoices')
      .select('id')
      .eq('id', verification.invoice_id)
      .eq('user_id', user.id)
      .single();

    if (!invoice) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    return NextResponse.json({ verification });
  } catch (error) {
    console.error('Get verification error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
