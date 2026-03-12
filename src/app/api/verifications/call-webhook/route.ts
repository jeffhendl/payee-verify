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

    // Handle different Retell event types:
    // - call_started: call is ringing/in progress
    // - call_ended: call disconnected, transcript available but no analysis yet
    // - call_analyzed: analysis complete (summary, sentiment, custom data)

    if (event === 'call_started') {
      // Mark as "in progress" — don't change from sent, just acknowledge
      return NextResponse.json({ received: true });
    }

    const callConnected = duration_ms > 0 && disconnection_reason !== 'telephony_provider_permission_denied';

    if (event === 'call_ended') {
      // Call just ended — we have transcript but NOT analysis yet
      // If call didn't connect, mark as failed immediately
      // If call connected, mark as opened (awaiting analysis)
      const status = callConnected ? 'opened' : 'failed';

      const { error: verError } = await supabaseAdmin
        .from('verifications')
        .update({
          status,
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
            from_number,
            to_number,
          },
        })
        .eq('id', verificationId);

      if (verError) {
        console.error('Retell webhook call_ended: verification update error:', verError);
      }

      // If call failed, don't change invoice status (let user retry)
      // If call connected, move invoice to pending_review so user can review
      if (callConnected && invoiceId) {
        await supabaseAdmin
          .from('invoices')
          .update({ status: 'pending_review', updated_at: new Date().toISOString() })
          .eq('id', invoiceId);
      }

      return NextResponse.json({ received: true });
    }

    // event === 'call_analyzed' — analysis is ready, merge into existing data
    const callSummary = call_analysis?.call_summary || '';
    const callSuccessfulAnalysis = call_analysis?.call_successful === true;
    const userSentiment = call_analysis?.user_sentiment || 'Unknown';
    const customData = call_analysis?.custom_analysis_data || {};

    // Check for payee confirmation/denial in custom analysis
    const payeeConfirmed = customData?.payee_confirmed === true ||
      customData?.payee_confirmed === 'true' ||
      call_analysis?.payee_confirmed === true ||
      call_analysis?.payee_confirmed === 'true';
    const payeeDenied = customData?.payee_denied === true ||
      customData?.payee_denied === 'true' ||
      call_analysis?.payee_denied === true ||
      call_analysis?.payee_denied === 'true';
    const discrepancies = customData?.discrepancies || call_analysis?.discrepancies || '';

    let verificationStatus = 'opened'; // default: call completed, no clear outcome
    let invoiceStatus = 'pending_review';

    if (payeeConfirmed) {
      verificationStatus = 'confirmed';
      invoiceStatus = 'pending_review';
    } else if (payeeDenied) {
      verificationStatus = 'denied';
      invoiceStatus = 'denied';
    }

    // Update verification with analysis data (merge with existing response_data)
    const { data: existing } = await supabaseAdmin
      .from('verifications')
      .select('response_data')
      .eq('id', verificationId)
      .single();

    const existingData = (existing?.response_data as Record<string, unknown>) || {};

    const { error: verError } = await supabaseAdmin
      .from('verifications')
      .update({
        status: verificationStatus,
        response_data: {
          ...existingData,
          call_summary: callSummary || null,
          user_sentiment: userSentiment,
          call_successful: callSuccessfulAnalysis,
          call_analysis: call_analysis || null,
          discrepancies: discrepancies || null,
          // Also update these in case they weren't available at call_ended
          recording_url: recording_url || existingData.recording_url || null,
          transcript: transcript || existingData.transcript || null,
          transcript_object: transcript_object || existingData.transcript_object || null,
        },
      })
      .eq('id', verificationId);

    if (verError) {
      console.error('Retell webhook call_analyzed: verification update error:', verError);
    }

    // Update invoice status if we got a clear confirm/deny
    if (invoiceId && (payeeConfirmed || payeeDenied)) {
      await supabaseAdmin
        .from('invoices')
        .update({ status: invoiceStatus, updated_at: new Date().toISOString() })
        .eq('id', invoiceId);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Retell webhook error:', error);
    return NextResponse.json({ received: true });
  }
}
