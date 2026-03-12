import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Retell nests all call data under body.call
    const call = body.call || body;
    const { call_id, call_status, metadata, transcript, call_analysis, disconnection_reason } = call;

    if (!metadata?.verification_id) {
      console.error('Retell webhook: no verification_id in metadata', body);
      return NextResponse.json({ received: true });
    }

    const verificationId = metadata.verification_id;
    const invoiceId = metadata.invoice_id;

    // Determine outcome from the call
    // call_analysis may contain custom analysis fields from Retell agent
    const callSuccessful = call_status === 'ended' || call_status === 'registered' || disconnection_reason === 'user_hangup' || disconnection_reason === 'agent_hangup';
    const payeeConfirmed = call_analysis?.payee_confirmed === true || call_analysis?.payee_confirmed === 'true';
    const payeeDenied = call_analysis?.payee_denied === true || call_analysis?.payee_denied === 'true';
    const discrepancies = call_analysis?.discrepancies || '';

    let verificationStatus = 'sent'; // keep as sent if inconclusive
    let invoiceStatus = 'verification_sent';

    if (payeeConfirmed) {
      verificationStatus = 'confirmed';
      invoiceStatus = 'pending_review';
    } else if (payeeDenied) {
      verificationStatus = 'denied';
      invoiceStatus = 'denied';
    } else if (!callSuccessful) {
      verificationStatus = 'failed';
    }

    // Update verification
    const { error: verError } = await supabaseAdmin
      .from('verifications')
      .update({
        status: verificationStatus,
        responded_at: new Date().toISOString(),
        response_data: {
          call_id,
          call_type: 'ai_phone',
          call_status,
          transcript: transcript || null,
          call_analysis: call_analysis || null,
          discrepancies: discrepancies || null,
        },
      })
      .eq('id', verificationId);

    if (verError) {
      console.error('Retell webhook: verification update error:', verError);
    }

    // Update invoice status
    if (invoiceId && (payeeConfirmed || payeeDenied)) {
      const { error: invError } = await supabaseAdmin
        .from('invoices')
        .update({
          status: invoiceStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', invoiceId);

      if (invError) {
        console.error('Retell webhook: invoice update error:', invError);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Retell webhook error:', error);
    return NextResponse.json({ received: true });
  }
}
