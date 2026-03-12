import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const event = body.event;

    // Retell nests all call data under body.call
    const call = body.call || body;
    const {
      call_id,
      call_status,
      metadata,
      transcript,
      transcript_object,
      call_analysis,
      disconnection_reason,
      recording_url,
      duration_ms,
      from_number,
      to_number,
    } = call;

    if (!metadata?.verification_id) {
      console.error('Retell webhook: no verification_id in metadata', body);
      return NextResponse.json({ received: true });
    }

    const verificationId = metadata.verification_id;
    const invoiceId = metadata.invoice_id;

    // Determine call outcome
    const callConnected = duration_ms > 0 && disconnection_reason !== 'telephony_provider_permission_denied';
    const callSuccessful = callConnected && (
      disconnection_reason === 'user_hangup' ||
      disconnection_reason === 'agent_hangup' ||
      disconnection_reason === 'call_transfer' ||
      call_status === 'ended'
    );

    // call_analysis fields from Retell agent
    const callSummary = call_analysis?.call_summary || '';
    const callSuccessfulAnalysis = call_analysis?.call_successful === true;
    const userSentiment = call_analysis?.user_sentiment || 'Unknown';
    const customData = call_analysis?.custom_analysis_data || {};

    // Check for payee confirmation/denial in custom analysis data
    const payeeConfirmed = customData?.payee_confirmed === true ||
      customData?.payee_confirmed === 'true' ||
      call_analysis?.payee_confirmed === true ||
      call_analysis?.payee_confirmed === 'true';
    const payeeDenied = customData?.payee_denied === true ||
      customData?.payee_denied === 'true' ||
      call_analysis?.payee_denied === true ||
      call_analysis?.payee_denied === 'true';
    const discrepancies = customData?.discrepancies || call_analysis?.discrepancies || '';

    let verificationStatus = 'sent'; // keep as sent if inconclusive
    let invoiceStatus = 'verification_sent';

    if (payeeConfirmed) {
      verificationStatus = 'confirmed';
      invoiceStatus = 'pending_review';
    } else if (payeeDenied) {
      verificationStatus = 'denied';
      invoiceStatus = 'denied';
    } else if (!callConnected) {
      verificationStatus = 'failed';
    } else if (callSuccessful && !payeeConfirmed && !payeeDenied) {
      // Call completed but no clear confirm/deny — mark as opened (call happened, awaiting analysis)
      verificationStatus = 'opened';
    }

    // Update verification
    const { error: verError } = await supabaseAdmin
      .from('verifications')
      .update({
        status: verificationStatus,
        responded_at: callConnected ? new Date().toISOString() : null,
        response_data: {
          call_id,
          call_type: 'ai_phone',
          call_status,
          disconnection_reason,
          duration_ms,
          transcript: transcript || null,
          transcript_object: transcript_object || null,
          recording_url: recording_url || null,
          call_summary: callSummary || null,
          user_sentiment: userSentiment,
          call_successful: callSuccessfulAnalysis,
          call_analysis: call_analysis || null,
          discrepancies: discrepancies || null,
          from_number,
          to_number,
        },
      })
      .eq('id', verificationId);

    if (verError) {
      console.error('Retell webhook: verification update error:', verError);
    }

    // Update invoice status
    if (invoiceId && (payeeConfirmed || payeeDenied || !callConnected)) {
      const newInvoiceStatus = !callConnected ? 'verification_sent' : invoiceStatus;
      if (newInvoiceStatus !== 'verification_sent' || !callConnected) {
        const { error: invError } = await supabaseAdmin
          .from('invoices')
          .update({
            status: payeeConfirmed || payeeDenied ? invoiceStatus : 'verification_sent',
            updated_at: new Date().toISOString(),
          })
          .eq('id', invoiceId);

        if (invError) {
          console.error('Retell webhook: invoice update error:', invError);
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Retell webhook error:', error);
    return NextResponse.json({ received: true });
  }
}
