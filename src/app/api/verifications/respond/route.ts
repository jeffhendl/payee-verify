import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const { token, confirmed, respondent_name, respondent_role, discrepancies } = await request.json();

    if (!token || typeof confirmed !== 'boolean' || !respondent_name || !respondent_role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Look up verification by token using service role (public endpoint)
    const { data: verification, error } = await supabaseAdmin
      .from('verifications')
      .select('*')
      .eq('token', token)
      .single();

    if (error || !verification) {
      return NextResponse.json({ error: 'Invalid verification token' }, { status: 400 });
    }

    // Check if expired
    if (new Date(verification.expires_at) < new Date()) {
      return NextResponse.json({ error: 'This verification link has expired' }, { status: 410 });
    }

    // Check if already responded
    if (verification.status === 'confirmed' || verification.status === 'denied') {
      return NextResponse.json({ error: 'This verification has already been completed' }, { status: 409 });
    }

    const responseData = {
      confirmed,
      discrepancies: discrepancies || null,
      respondent_name,
      respondent_role,
      timestamp: new Date().toISOString(),
    };

    // Update verification
    await supabaseAdmin
      .from('verifications')
      .update({
        status: confirmed ? 'confirmed' : 'denied',
        responded_at: new Date().toISOString(),
        response_data: responseData,
      })
      .eq('id', verification.id);

    // Update invoice status
    await supabaseAdmin
      .from('invoices')
      .update({
        status: confirmed ? 'verified' : 'failed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', verification.invoice_id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Respond error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
