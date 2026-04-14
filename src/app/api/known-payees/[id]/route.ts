import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: knownPayee, error } = await supabaseAdmin
      .from('known_payees')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error || !knownPayee) {
      return NextResponse.json({ error: 'Known payee not found' }, { status: 404 });
    }

    const { data: aliases } = await supabaseAdmin
      .from('known_payee_aliases')
      .select('*')
      .eq('known_payee_id', id)
      .order('alias');

    const { data: bankingDetails } = await supabaseAdmin
      .from('known_payee_banking_details')
      .select('*')
      .eq('known_payee_id', id)
      .order('created_at');

    // Get linked invoices
    const { data: linkedPayees } = await supabaseAdmin
      .from('payees')
      .select('invoice_id, company_name, invoices!inner(id, file_name, status, created_at)')
      .eq('known_payee_id', id);

    const linkedInvoices = (linkedPayees || []).map(p => {
      const inv = p.invoices as unknown as { id: string; file_name: string; status: string; created_at: string };
      return {
        id: inv.id,
        file_name: inv.file_name,
        status: inv.status,
        created_at: inv.created_at,
        company_name: p.company_name,
      };
    });

    return NextResponse.json({
      knownPayee,
      aliases: aliases || [],
      bankingDetails: bankingDetails || [],
      linkedInvoices,
    });
  } catch (error) {
    console.error('Get known payee error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify ownership
    const { data: knownPayee } = await supabaseAdmin
      .from('known_payees')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (!knownPayee) {
      return NextResponse.json({ error: 'Known payee not found' }, { status: 404 });
    }

    const { nickname } = await request.json();

    const { error } = await supabaseAdmin
      .from('known_payees')
      .update({ nickname, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update known payee error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify ownership
    const { data: knownPayee } = await supabaseAdmin
      .from('known_payees')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (!knownPayee) {
      return NextResponse.json({ error: 'Known payee not found' }, { status: 404 });
    }

    // Unlink all payees referencing this known payee
    await supabaseAdmin
      .from('payees')
      .update({ known_payee_id: null, match_result: null })
      .eq('known_payee_id', id);

    // Delete cascades aliases and banking details
    const { error } = await supabaseAdmin
      .from('known_payees')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete known payee error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
