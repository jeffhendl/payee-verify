import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: knownPayees, error } = await supabaseAdmin
      .from('known_payees')
      .select('id, primary_name, nickname, created_at, updated_at')
      .eq('user_id', user.id)
      .order('primary_name');

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch known payees' }, { status: 500 });
    }

    // Get invoice counts per known payee
    const { data: linkCounts } = await supabaseAdmin
      .from('payees')
      .select('known_payee_id')
      .in('known_payee_id', (knownPayees || []).map(kp => kp.id));

    const countMap: Record<string, number> = {};
    (linkCounts || []).forEach(p => {
      if (p.known_payee_id) {
        countMap[p.known_payee_id] = (countMap[p.known_payee_id] || 0) + 1;
      }
    });

    const result = (knownPayees || []).map(kp => ({
      ...kp,
      invoice_count: countMap[kp.id] || 0,
    }));

    return NextResponse.json({ knownPayees: result });
  } catch (error) {
    console.error('List known payees error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
