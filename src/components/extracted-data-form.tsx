'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Loader2, Send, Save, CheckCircle, XCircle, Clock, AlertTriangle, ShieldCheck, ShieldX, Mail, User, Briefcase, Building2, AlertCircle, Phone, Globe } from 'lucide-react';
import type { Payee, Invoice, Verification, VerificationResponse, VerificationStatus, InvoiceStatus } from '@/lib/types';

interface ExtractedDataFormProps {
  invoice: Invoice;
  payee: Payee;
  verification: Verification | null;
}

const verificationStatusConfig: Record<VerificationStatus, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: 'Pending', color: 'bg-[#E5E5E5] text-[#606265]', icon: <Clock className="h-4 w-4" /> },
  sent: { label: 'SMS Sent', color: 'bg-[#CFE5F3] text-[#045B3F]', icon: <Mail className="h-4 w-4" /> },
  opened: { label: 'Opened', color: 'bg-[#EED9F7] text-[#8F5CCF]', icon: <Mail className="h-4 w-4" /> },
  confirmed: { label: 'Payee Confirmed', color: 'bg-[#F2FCE4] text-[#30AC2E]', icon: <CheckCircle className="h-4 w-4" /> },
  denied: { label: 'Discrepancy Flagged', color: 'bg-[#FEF1ED] text-[#F12D1B]', icon: <XCircle className="h-4 w-4" /> },
  expired: { label: 'Expired', color: 'bg-[#E5E5E5] text-[#606265]', icon: <Clock className="h-4 w-4" /> },
  failed: { label: 'Failed', color: 'bg-[#FEF1ED] text-[#F12D1B]', icon: <XCircle className="h-4 w-4" /> },
};

interface MissingField {
  label: string;
  severity: 'error' | 'warning';
}

function getMissingFields(payee: Payee): MissingField[] {
  const missing: MissingField[] = [];

  // Core fields — errors
  if (!payee.company_name) missing.push({ label: 'Company Name', severity: 'error' });
  if (!payee.invoice_number) missing.push({ label: 'Invoice Number', severity: 'error' });
  if (!payee.invoice_amount) missing.push({ label: 'Invoice Amount', severity: 'error' });
  if (!payee.invoice_date) missing.push({ label: 'Invoice Date', severity: 'warning' });

  // Contact — warning if no phone (needed for SMS)
  if (!payee.contact_phone) missing.push({ label: 'Phone Number (required for SMS verification)', severity: 'error' });
  if (!payee.contact_name) missing.push({ label: 'Contact Name', severity: 'warning' });

  // Banking details — warning
  const hasBanking = payee.country === 'US'
    ? (payee.aba_routing_number && payee.account_number)
    : (payee.transit_number && payee.institution_number && payee.account_number);
  if (!hasBanking) missing.push({ label: 'Banking Details (will be requested from payee during verification)', severity: 'warning' });

  return missing;
}

const COUNTRY_CODES = [
  { code: '+1', label: 'US/CA +1', flag: '🇺🇸🇨🇦' },
  { code: '+44', label: 'UK +44', flag: '🇬🇧' },
  { code: '+61', label: 'AU +61', flag: '🇦🇺' },
  { code: '+33', label: 'FR +33', flag: '🇫🇷' },
  { code: '+49', label: 'DE +49', flag: '🇩🇪' },
  { code: '+91', label: 'IN +91', flag: '🇮🇳' },
  { code: '+86', label: 'CN +86', flag: '🇨🇳' },
  { code: '+81', label: 'JP +81', flag: '🇯🇵' },
  { code: '+52', label: 'MX +52', flag: '🇲🇽' },
  { code: '+55', label: 'BR +55', flag: '🇧🇷' },
];

function splitPhoneNumber(phone: string | null): { countryCode: string; localNumber: string } {
  if (!phone) return { countryCode: '+1', localNumber: '' };
  const cleaned = phone.replace(/\s/g, '');
  // Try matching known country codes (longest first)
  const sorted = [...COUNTRY_CODES].sort((a, b) => b.code.length - a.code.length);
  for (const cc of sorted) {
    if (cleaned.startsWith(cc.code)) {
      return { countryCode: cc.code, localNumber: cleaned.slice(cc.code.length) };
    }
  }
  // Default to +1 if no match
  return { countryCode: '+1', localNumber: cleaned.replace(/^\+/, '') };
}

export function ExtractedDataForm({ invoice, payee: initialPayee, verification: initialVerification }: ExtractedDataFormProps) {
  const [payee, setPayee] = useState(initialPayee);
  const [verification, setVerification] = useState(initialVerification);
  const [invoiceStatus, setInvoiceStatus] = useState<InvoiceStatus>(invoice.status);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [calling, setCalling] = useState(false);
  const [approving, setApproving] = useState(false);
  const supabase = createClient();

  // Phone country code state
  const initialPhone = splitPhoneNumber(initialPayee.contact_phone);
  const [phoneCountryCode, setPhoneCountryCode] = useState(initialPhone.countryCode);
  const [phoneLocalNumber, setPhoneLocalNumber] = useState(initialPhone.localNumber);
  const isCallSupported = phoneCountryCode === '+1';
  const fullPhoneNumber = phoneLocalNumber ? `${phoneCountryCode}${phoneLocalNumber}` : '';

  // Keep payee.contact_phone in sync
  useEffect(() => {
    setPayee(prev => ({ ...prev, contact_phone: fullPhoneNumber || null }));
  }, [phoneCountryCode, phoneLocalNumber]);

  const missingFields = useMemo(() => getMissingFields(payee), [payee]);
  const errors = missingFields.filter(f => f.severity === 'error');
  const warnings = missingFields.filter(f => f.severity === 'warning');

  const isPayeeConfirmed = verification?.status === 'confirmed' || invoiceStatus === 'pending_review';
  const isFinalized = invoiceStatus === 'verified' || invoiceStatus === 'denied';
  const isReadOnly = isPayeeConfirmed || isFinalized;

  // Poll for verification status updates
  useEffect(() => {
    if (!verification || verification.status === 'confirmed' || verification.status === 'denied' || verification.status === 'expired') {
      return;
    }

    const interval = setInterval(async () => {
      const res = await fetch(`/api/verifications/${verification.id}`);
      if (res.ok) {
        const { verification: updated } = await res.json();
        setVerification(updated);
        if (updated.status === 'confirmed') {
          setInvoiceStatus('pending_review');
          clearInterval(interval);
          toast.info('Payee confirmed — please review and approve.');
        } else if (updated.status === 'denied') {
          setInvoiceStatus('denied');
          clearInterval(interval);
          toast.error('Payee flagged a discrepancy.');
        }
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [verification]);

  const updateField = (field: string, value: string | number | null) => {
    setPayee((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('payees')
      .update({
        company_name: payee.company_name,
        contact_name: payee.contact_name,
        contact_email: payee.contact_email,
        contact_phone: payee.contact_phone,
        address_line1: payee.address_line1,
        address_line2: payee.address_line2,
        city: payee.city,
        state_province: payee.state_province,
        postal_code: payee.postal_code,
        country: payee.country,
        aba_routing_number: payee.aba_routing_number,
        account_number: payee.account_number,
        transit_number: payee.transit_number,
        institution_number: payee.institution_number,
        bank_name: payee.bank_name,
        account_type: payee.account_type,
        invoice_number: payee.invoice_number,
        invoice_amount: payee.invoice_amount,
        invoice_date: payee.invoice_date,
        due_date: payee.due_date,
        currency: payee.currency,
        updated_at: new Date().toISOString(),
      })
      .eq('id', payee.id);

    setSaving(false);

    if (error) {
      toast.error('Failed to save changes');
      return false;
    } else {
      toast.success('Changes saved');
      return true;
    }
  };

  const handleSaveAndSend = async () => {
    if (!payee.contact_phone) {
      toast.error('Payee does not have a phone number. Please add one first.');
      return;
    }

    setSending(true);

    // Save first
    const saveResult = await supabase
      .from('payees')
      .update({
        company_name: payee.company_name,
        contact_name: payee.contact_name,
        contact_email: payee.contact_email,
        contact_phone: payee.contact_phone,
        address_line1: payee.address_line1,
        address_line2: payee.address_line2,
        city: payee.city,
        state_province: payee.state_province,
        postal_code: payee.postal_code,
        country: payee.country,
        aba_routing_number: payee.aba_routing_number,
        account_number: payee.account_number,
        transit_number: payee.transit_number,
        institution_number: payee.institution_number,
        bank_name: payee.bank_name,
        account_type: payee.account_type,
        invoice_number: payee.invoice_number,
        invoice_amount: payee.invoice_amount,
        invoice_date: payee.invoice_date,
        due_date: payee.due_date,
        currency: payee.currency,
        updated_at: new Date().toISOString(),
      })
      .eq('id', payee.id);

    if (saveResult.error) {
      toast.error('Failed to save changes');
      setSending(false);
      return;
    }

    toast.success('Changes saved');

    // Then send
    try {
      const res = await fetch('/api/verifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payeeId: payee.id, invoiceId: invoice.id }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to send verification');
      }

      const data = await res.json();
      setVerification({
        id: data.verificationId,
        payee_id: payee.id,
        invoice_id: invoice.id,
        type: 'phone',
        status: 'sent',
        token: '',
        sent_at: new Date().toISOString(),
        responded_at: null,
        response_data: null,
        expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
      });
      setInvoiceStatus('verification_sent');
      toast.success(`Verification SMS sent to ${payee.contact_phone}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  const handleCallPayee = async () => {
    if (!payee.contact_phone) {
      toast.error('Payee does not have a phone number. Please add one first.');
      return;
    }

    setCalling(true);

    // Save first
    const saveResult = await supabase
      .from('payees')
      .update({
        company_name: payee.company_name,
        contact_name: payee.contact_name,
        contact_email: payee.contact_email,
        contact_phone: payee.contact_phone,
        address_line1: payee.address_line1,
        address_line2: payee.address_line2,
        city: payee.city,
        state_province: payee.state_province,
        postal_code: payee.postal_code,
        country: payee.country,
        aba_routing_number: payee.aba_routing_number,
        account_number: payee.account_number,
        transit_number: payee.transit_number,
        institution_number: payee.institution_number,
        bank_name: payee.bank_name,
        account_type: payee.account_type,
        invoice_number: payee.invoice_number,
        invoice_amount: payee.invoice_amount,
        invoice_date: payee.invoice_date,
        due_date: payee.due_date,
        currency: payee.currency,
        updated_at: new Date().toISOString(),
      })
      .eq('id', payee.id);

    if (saveResult.error) {
      toast.error('Failed to save changes');
      setCalling(false);
      return;
    }

    try {
      const res = await fetch('/api/verifications/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payeeId: payee.id, invoiceId: invoice.id }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to initiate call');
      }

      const data = await res.json();
      setVerification({
        id: data.verificationId,
        payee_id: payee.id,
        invoice_id: invoice.id,
        type: 'phone_call',
        status: 'sent',
        token: '',
        sent_at: new Date().toISOString(),
        responded_at: null,
        response_data: { call_id: data.callId, call_type: 'ai_phone' },
        expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
      });
      setInvoiceStatus('verification_sent');
      toast.success(`AI verification call initiated to ${payee.contact_phone}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to call');
    } finally {
      setCalling(false);
    }
  };

  const handleApproval = async (action: 'approve' | 'reject') => {
    setApproving(true);
    try {
      const res = await fetch('/api/invoices/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId: invoice.id, action }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to process');
      }

      const data = await res.json();
      setInvoiceStatus(data.status);
      toast.success(action === 'approve' ? 'Invoice verified and approved!' : 'Invoice rejected.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Something went wrong');
    } finally {
      setApproving(false);
    }
  };

  // Name mismatch detection
  const responseData = verification?.response_data as VerificationResponse | null;
  const respondentName = (responseData?.respondent_name as string) || '';
  const contactName = payee.contact_name || '';
  const hasNameMismatch = (() => {
    if (!respondentName || !contactName) return false;
    const normalize = (n: string) => n.toLowerCase().trim().replace(/[^a-z\s]/g, '');
    const rNorm = normalize(respondentName);
    const cNorm = normalize(contactName);
    if (rNorm === cNorm) return false;
    // Check if any name parts overlap (e.g. first or last name match)
    const rParts = rNorm.split(/\s+/);
    const cParts = cNorm.split(/\s+/);
    const overlap = rParts.filter(p => p.length > 1 && cParts.includes(p));
    return overlap.length === 0; // mismatch if zero name parts in common
  })();

  const confidence = invoice.raw_extracted?.confidence ?? 0;
  const confidenceColor = confidence >= 0.8 ? 'bg-[#30AC2E]' : confidence >= 0.5 ? 'bg-[#D2F3A7]' : 'bg-[#F12D1B]';

  return (
    <div className="space-y-6">
      {/* Pending Review Banner — show at top when payee has confirmed */}
      {isPayeeConfirmed && !isFinalized && (
        <Card className="rounded-2xl border-[#045B3F] bg-[#F0FFF8] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <CardContent className="pt-6 pb-6">
            <div className="flex items-start gap-3 mb-4">
              <ShieldCheck className="h-6 w-6 text-[#045B3F] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-base font-semibold text-[#045B3F]">Payee Confirmed — Your Approval Required</p>
                <p className="text-sm text-[#4A7C6A] mt-1">
                  The payee has confirmed the invoice details. Review the information below and approve or reject.
                </p>
              </div>
            </div>
            <div className="flex gap-3 ml-9">
              <Button
                onClick={() => handleApproval('approve')}
                disabled={approving}
                className="bg-[#045B3F] hover:bg-[#034830] rounded-xl gap-2 shadow-[0_1px_2px_rgba(0,0,0,0.1),0_2px_8px_rgba(4,91,63,0.15)]"
              >
                {approving && <Loader2 className="h-4 w-4 animate-spin" />}
                <ShieldCheck className="h-4 w-4" />
                Approve & Verify
              </Button>
              <Button
                variant="outline"
                onClick={() => handleApproval('reject')}
                disabled={approving}
                className="rounded-xl gap-2 text-[#F12D1B] border-[#F12D1B] hover:bg-[#FEF1ED] hover:text-[#F12D1B]"
              >
                <ShieldX className="h-4 w-4" />
                Reject
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Finalized status banner */}
      {invoiceStatus === 'verified' && (
        <Card className="rounded-2xl border-[#30AC2E] bg-[#F2FCE4] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <CardContent className="pt-6 pb-6">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-6 w-6 text-[#30AC2E]" />
              <p className="text-base font-semibold text-[#30AC2E]">Verified & Approved</p>
            </div>
          </CardContent>
        </Card>
      )}
      {invoiceStatus === 'denied' && (
        <Card className="rounded-2xl border-[#F12D1B] bg-[#FEF1ED] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <CardContent className="pt-6 pb-6">
            <div className="flex items-center gap-3">
              <ShieldX className="h-6 w-6 text-[#F12D1B]" />
              <p className="text-base font-semibold text-[#F12D1B]">Rejected</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Verification Status & Response Data — show above confidence when payee has responded */}
      {verification && (verification.status === 'confirmed' || verification.status === 'denied') && responseData && (
        <Card className="rounded-2xl border-[#E8EAEC] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg tracking-[-0.01em]">Payee Response</CardTitle>
              <Badge className={`gap-1 ${verificationStatusConfig[verification.status as VerificationStatus]?.color || ''}`}>
                {verificationStatusConfig[verification.status as VerificationStatus]?.icon}
                {verificationStatusConfig[verification.status as VerificationStatus]?.label || verification.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Name mismatch warning */}
            {hasNameMismatch && (
              <div className="p-3 bg-[#FFF3CD] rounded-xl border border-[#F5C518] flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-[#856404] flex-shrink-0 mt-0.5" />
                <div className="text-sm text-[#856404]">
                  <p className="font-semibold">Name mismatch detected</p>
                  <p>Respondent &quot;{responseData.respondent_name}&quot; does not match the contact name &quot;{payee.contact_name}&quot; on the invoice. Please verify before approving.</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-[#92979C]" />
                <span className="text-[#92979C]">Respondent:</span>
                <span className="font-medium">{responseData.respondent_name}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Briefcase className="h-4 w-4 text-[#92979C]" />
                <span className="text-[#92979C]">Role:</span>
                <span className="font-medium">{responseData.respondent_role}</span>
              </div>
            </div>
            {verification.responded_at && (
              <p className="text-xs text-[#92979C]">
                Responded {new Date(verification.responded_at).toLocaleString()}
              </p>
            )}

            {/* Bank details provided by payee */}
            {responseData.banking_details_provided && (
              <div className="mt-2 p-4 bg-[#F7F7F7] rounded-xl border border-[#E8EAEC]">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="h-4 w-4 text-[#045B3F]" />
                  <p className="text-sm font-semibold text-[#383B3E]">Banking Details Provided by Payee</p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {payee.bank_name && (
                    <div><span className="text-[#92979C]">Bank:</span> <span className="font-medium">{payee.bank_name}</span></div>
                  )}
                  {payee.aba_routing_number && (
                    <div><span className="text-[#92979C]">Routing:</span> <span className="font-mono font-medium">{payee.aba_routing_number}</span></div>
                  )}
                  {payee.transit_number && (
                    <div><span className="text-[#92979C]">Transit:</span> <span className="font-mono font-medium">{payee.transit_number}</span></div>
                  )}
                  {payee.institution_number && (
                    <div><span className="text-[#92979C]">Institution:</span> <span className="font-mono font-medium">{payee.institution_number}</span></div>
                  )}
                  {payee.account_number && (
                    <div><span className="text-[#92979C]">Account:</span> <span className="font-mono font-medium">{payee.account_number}</span></div>
                  )}
                  {payee.account_type && (
                    <div><span className="text-[#92979C]">Type:</span> <span className="font-medium capitalize">{payee.account_type}</span></div>
                  )}
                </div>
              </div>
            )}

            {responseData.discrepancies && (
              <div className="mt-3 p-4 bg-[#FEF1ED] rounded-xl border border-[#FECDC6]">
                <p className="text-sm font-medium text-[#991B1B] mb-1">Discrepancy Reported:</p>
                <p className="text-sm text-[#991B1B]">{responseData.discrepancies}</p>
              </div>
            )}

            {/* Approve/Reject buttons right next to the response */}
            {isPayeeConfirmed && !isFinalized && (
              <div className="flex gap-3 pt-2">
                <Button
                  onClick={() => handleApproval('approve')}
                  disabled={approving}
                  className="bg-[#045B3F] hover:bg-[#034830] rounded-xl gap-2 shadow-[0_1px_2px_rgba(0,0,0,0.1),0_2px_8px_rgba(4,91,63,0.15)]"
                >
                  {approving && <Loader2 className="h-4 w-4 animate-spin" />}
                  <ShieldCheck className="h-4 w-4" />
                  Approve & Verify
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleApproval('reject')}
                  disabled={approving}
                  className="rounded-xl gap-2 text-[#F12D1B] border-[#F12D1B] hover:bg-[#FEF1ED] hover:text-[#F12D1B]"
                >
                  <ShieldX className="h-4 w-4" />
                  Reject
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Verification Status — show when sent but not yet responded */}
      {verification && verification.status !== 'confirmed' && verification.status !== 'denied' && (
        <Card className="rounded-2xl border-[#E8EAEC] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">Verification Status:</span>
              <Badge className={`gap-1 ${verificationStatusConfig[verification.status as VerificationStatus]?.color || ''}`}>
                {verificationStatusConfig[verification.status as VerificationStatus]?.icon}
                {verificationStatusConfig[verification.status as VerificationStatus]?.label || verification.status}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Missing Fields Warnings — only show when editable */}
      {!isReadOnly && missingFields.length > 0 && (
        <Card className="rounded-2xl border-[#F5C518] bg-[#FFFDF0] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <CardContent className="pt-5 pb-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-[#856404] flex-shrink-0 mt-0.5" />
              <div className="space-y-2 flex-1">
                <p className="text-sm font-semibold text-[#856404]">
                  {errors.length > 0 ? 'Missing required fields' : 'Some optional fields are missing'}
                </p>
                {errors.length > 0 && (
                  <div className="space-y-1">
                    {errors.map((f) => (
                      <p key={f.label} className="text-sm text-[#991B1B] flex items-center gap-1.5">
                        <XCircle className="h-3.5 w-3.5 flex-shrink-0" />
                        {f.label}
                      </p>
                    ))}
                  </div>
                )}
                {warnings.length > 0 && (
                  <div className="space-y-1">
                    {warnings.map((f) => (
                      <p key={f.label} className="text-sm text-[#856404] flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                        {f.label}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confidence Score */}
      <Card className="rounded-2xl border-[#E8EAEC] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">AI Extraction Confidence</span>
            <span className="text-sm font-bold">{Math.round(confidence * 100)}%</span>
          </div>
          <div className="w-full bg-[#E5E5E5] rounded-full h-2.5">
            <div
              className={`h-2.5 rounded-full ${confidenceColor}`}
              style={{ width: `${confidence * 100}%` }}
            />
          </div>
          {confidence < 0.7 && (
            <p className="text-sm text-[#F12D1B] mt-2">
              Lower confidence — please review all fields carefully before sending verification.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Invoice Details */}
      <Card className="rounded-2xl border-[#E8EAEC] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <CardHeader>
          <CardTitle className="text-lg tracking-[-0.01em]">Invoice Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <Label>Invoice Number</Label>
            <Input
              value={payee.invoice_number || ''}
              onChange={(e) => updateField('invoice_number', e.target.value)}
              className={!payee.invoice_number ? 'border-[#F5C518]' : ''}
              disabled={isReadOnly}
            />
          </div>
          <div>
            <Label>Amount</Label>
            <Input
              type="number"
              step="0.01"
              value={payee.invoice_amount || ''}
              onChange={(e) => updateField('invoice_amount', e.target.value ? parseFloat(e.target.value) : null)}
              className={!payee.invoice_amount ? 'border-[#F5C518]' : ''}
              disabled={isReadOnly}
            />
          </div>
          <div>
            <Label>Invoice Date</Label>
            <Input
              type="date"
              value={payee.invoice_date || ''}
              onChange={(e) => updateField('invoice_date', e.target.value)}
              disabled={isReadOnly}
            />
          </div>
          <div>
            <Label>Due Date</Label>
            <Input
              type="date"
              value={payee.due_date || ''}
              onChange={(e) => updateField('due_date', e.target.value)}
              disabled={isReadOnly}
            />
          </div>
          <div>
            <Label>Currency</Label>
            <select
              className="flex h-10 w-full rounded-xl border border-input bg-transparent px-3 py-1 text-sm disabled:opacity-50"
              value={payee.currency}
              onChange={(e) => updateField('currency', e.target.value)}
              disabled={isReadOnly}
            >
              <option value="USD">USD</option>
              <option value="CAD">CAD</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Payee Contact */}
      <Card className="rounded-2xl border-[#E8EAEC] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <CardHeader>
          <CardTitle className="text-lg tracking-[-0.01em]">Payee Contact</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <Label>Company Name</Label>
            <Input
              value={payee.company_name || ''}
              onChange={(e) => updateField('company_name', e.target.value)}
              className={!payee.company_name ? 'border-[#F5C518]' : ''}
              disabled={isReadOnly}
            />
          </div>
          <div>
            <Label>Contact Name</Label>
            <Input
              value={payee.contact_name || ''}
              onChange={(e) => updateField('contact_name', e.target.value)}
              disabled={isReadOnly}
            />
          </div>
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={payee.contact_email || ''}
              onChange={(e) => updateField('contact_email', e.target.value)}
              disabled={isReadOnly}
            />
          </div>
          <div>
            <Label>Phone</Label>
            <div className="flex gap-1.5">
              <select
                value={phoneCountryCode}
                onChange={(e) => setPhoneCountryCode(e.target.value)}
                disabled={isReadOnly}
                className="h-9 rounded-md border border-input bg-background px-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 w-[110px] shrink-0"
              >
                {COUNTRY_CODES.map(cc => (
                  <option key={cc.code} value={cc.code}>{cc.flag} {cc.code}</option>
                ))}
              </select>
              <Input
                value={phoneLocalNumber}
                onChange={(e) => setPhoneLocalNumber(e.target.value.replace(/[^\d]/g, ''))}
                placeholder="XXXXXXXXXX"
                className={!phoneLocalNumber ? 'border-[#F5C518]' : ''}
                disabled={isReadOnly}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Address */}
      <Card className="rounded-2xl border-[#E8EAEC] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <CardHeader>
          <CardTitle className="text-lg tracking-[-0.01em]">Address</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label>Address Line 1</Label>
            <Input
              value={payee.address_line1 || ''}
              onChange={(e) => updateField('address_line1', e.target.value)}
              disabled={isReadOnly}
            />
          </div>
          <div className="col-span-2">
            <Label>Address Line 2</Label>
            <Input
              value={payee.address_line2 || ''}
              onChange={(e) => updateField('address_line2', e.target.value)}
              disabled={isReadOnly}
            />
          </div>
          <div>
            <Label>City</Label>
            <Input
              value={payee.city || ''}
              onChange={(e) => updateField('city', e.target.value)}
              disabled={isReadOnly}
            />
          </div>
          <div>
            <Label>State / Province</Label>
            <Input
              value={payee.state_province || ''}
              onChange={(e) => updateField('state_province', e.target.value)}
              disabled={isReadOnly}
            />
          </div>
          <div>
            <Label>Postal Code</Label>
            <Input
              value={payee.postal_code || ''}
              onChange={(e) => updateField('postal_code', e.target.value)}
              disabled={isReadOnly}
            />
          </div>
          <div>
            <Label>Country</Label>
            <select
              className="flex h-10 w-full rounded-xl border border-input bg-transparent px-3 py-1 text-sm disabled:opacity-50"
              value={payee.country}
              onChange={(e) => updateField('country', e.target.value)}
              disabled={isReadOnly}
            >
              <option value="US">United States</option>
              <option value="CA">Canada</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Banking Details */}
      <Card className="rounded-2xl border-[#E8EAEC] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg tracking-[-0.01em]">Banking Details</CardTitle>
            {!isReadOnly && (
              <select
                className="rounded-lg border border-input bg-transparent px-3 py-1.5 text-sm font-medium text-[#045B3F]"
                value={payee.country}
                onChange={(e) => {
                  updateField('country', e.target.value);
                  // Clear banking fields when switching country
                  if (e.target.value === 'US') {
                    updateField('transit_number', null);
                    updateField('institution_number', null);
                  } else {
                    updateField('aba_routing_number', null);
                  }
                }}
              >
                <option value="US">United States</option>
                <option value="CA">Canada</option>
              </select>
            )}
            {isReadOnly && (
              <span className="text-sm text-[#71717A]">{payee.country === 'CA' ? 'Canada' : 'United States'}</span>
            )}
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          {payee.country === 'US' ? (
            <>
              <div>
                <Label>ABA Routing Number</Label>
                <Input
                  value={payee.aba_routing_number || ''}
                  onChange={(e) => updateField('aba_routing_number', e.target.value)}
                  maxLength={9}
                  placeholder="9 digits"
                  disabled={isReadOnly}
                />
              </div>
              <div>
                <Label>Account Number</Label>
                <Input
                  value={payee.account_number || ''}
                  onChange={(e) => updateField('account_number', e.target.value)}
                  disabled={isReadOnly}
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <Label>Transit Number</Label>
                <Input
                  value={payee.transit_number || ''}
                  onChange={(e) => updateField('transit_number', e.target.value)}
                  maxLength={5}
                  placeholder="5 digits"
                  disabled={isReadOnly}
                />
              </div>
              <div>
                <Label>Institution Number</Label>
                <Input
                  value={payee.institution_number || ''}
                  onChange={(e) => updateField('institution_number', e.target.value)}
                  maxLength={3}
                  placeholder="3 digits"
                  disabled={isReadOnly}
                />
              </div>
              <div>
                <Label>Account Number</Label>
                <Input
                  value={payee.account_number || ''}
                  onChange={(e) => updateField('account_number', e.target.value)}
                  disabled={isReadOnly}
                />
              </div>
            </>
          )}
          <div>
            <Label>Bank Name</Label>
            <Input
              value={payee.bank_name || ''}
              onChange={(e) => updateField('bank_name', e.target.value)}
              disabled={isReadOnly}
            />
          </div>
          <div>
            <Label>Account Type</Label>
            <select
              className="flex h-10 w-full rounded-xl border border-input bg-transparent px-3 py-1 text-sm disabled:opacity-50"
              value={payee.account_type || ''}
              onChange={(e) => updateField('account_type', e.target.value || null)}
              disabled={isReadOnly}
            >
              <option value="">Not specified</option>
              <option value="checking">Checking</option>
              <option value="savings">Savings</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Actions — only show when editable */}
      {!isFinalized && !isPayeeConfirmed && (
        <>
          <Separator />
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={handleSave} disabled={saving || sending} className="rounded-xl gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              <Save className="h-4 w-4" />
              Save
            </Button>
            <Button
              onClick={handleSaveAndSend}
              disabled={sending || saving || calling || !payee.contact_phone || (verification?.status === 'sent')}
              className="bg-[#045B3F] hover:bg-[#034830] rounded-xl gap-2 shadow-[0_1px_2px_rgba(0,0,0,0.1),0_2px_8px_rgba(4,91,63,0.15)]"
            >
              {sending && <Loader2 className="h-4 w-4 animate-spin" />}
              <Send className="h-4 w-4" />
              {verification?.status === 'sent' ? 'Verification Sent' : 'Save & Send SMS'}
            </Button>
            <div className="relative group">
              <Button
                onClick={handleCallPayee}
                disabled={calling || saving || sending || !phoneLocalNumber || !isCallSupported || (verification?.status === 'sent')}
                className="bg-[#1D1D1D] hover:bg-[#383B3E] rounded-xl gap-2 shadow-[0_1px_2px_rgba(0,0,0,0.1)]"
              >
                {calling && <Loader2 className="h-4 w-4 animate-spin" />}
                <Phone className="h-4 w-4" />
                {verification?.status === 'sent' ? 'Call Initiated' : 'Save & Call Payee'}
              </Button>
              {!isCallSupported && phoneLocalNumber && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-[#1D1D1D] text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  Only US and Canadian numbers are supported for AI calls
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#1D1D1D]" />
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
