import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
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

    const body = await request.json();

    const { data: banking, error } = await supabaseAdmin
      .from('known_payee_banking_details')
      .insert({
        known_payee_id: id,
        country: body.country || '',
        payment_rail: body.payment_rail || null,
        aba_routing_number: body.aba_routing_number || null,
        account_number: body.account_number || null,
        transit_number: body.transit_number || null,
        institution_number: body.institution_number || null,
        swift_code: body.swift_code || null,
        iban: body.iban || null,
        sort_code: body.sort_code || null,
        bank_name: body.bank_name || null,
        account_type: body.account_type || null,
        currency: body.currency || 'USD',
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to add banking details' }, { status: 500 });
    }

    return NextResponse.json({ banking });
  } catch (error) {
    console.error('Add banking details error:', error);
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

    // Verify ownership of the known payee
    const { data: knownPayee } = await supabaseAdmin
      .from('known_payees')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (!knownPayee) {
      return NextResponse.json({ error: 'Known payee not found' }, { status: 404 });
    }

    const { bankingId } = await request.json();

    const { error } = await supabaseAdmin
      .from('known_payee_banking_details')
      .delete()
      .eq('id', bankingId)
      .eq('known_payee_id', id);

    if (error) {
      return NextResponse.json({ error: 'Failed to delete banking details' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete banking details error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
