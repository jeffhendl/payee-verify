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

    const { data: knownPayee } = await supabaseAdmin
      .from('known_payees')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (!knownPayee) {
      return NextResponse.json({ error: 'Known payee not found' }, { status: 404 });
    }

    const { alias } = await request.json();
    const normalized = alias?.toLowerCase().trim();
    if (!normalized) {
      return NextResponse.json({ error: 'Alias is required' }, { status: 400 });
    }

    const { data: added, error } = await supabaseAdmin
      .from('known_payee_aliases')
      .upsert(
        { known_payee_id: id, alias: normalized },
        { onConflict: 'known_payee_id,alias', ignoreDuplicates: true }
      )
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to add alias' }, { status: 500 });
    }

    return NextResponse.json({ alias: added });
  } catch (error) {
    console.error('Add alias error:', error);
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

    const { data: knownPayee } = await supabaseAdmin
      .from('known_payees')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (!knownPayee) {
      return NextResponse.json({ error: 'Known payee not found' }, { status: 404 });
    }

    const { aliasId } = await request.json();

    const { error } = await supabaseAdmin
      .from('known_payee_aliases')
      .delete()
      .eq('id', aliasId)
      .eq('known_payee_id', id);

    if (error) {
      return NextResponse.json({ error: 'Failed to delete alias' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete alias error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
