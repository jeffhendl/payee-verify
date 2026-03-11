'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Loader2, Mail, CheckCircle, XCircle, Clock } from 'lucide-react';
import type { Payee, Invoice, Verification, VerificationStatus } from '@/lib/types';

interface ExtractedDataFormProps {
  invoice: Invoice;
  payee: Payee;
  verification: Verification | null;
}

const statusConfig: Record<VerificationStatus, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: 'Pending', color: 'bg-gray-100 text-gray-700', icon: <Clock className="h-4 w-4" /> },
  sent: { label: 'Email Sent', color: 'bg-blue-100 text-blue-700', icon: <Mail className="h-4 w-4" /> },
  opened: { label: 'Opened', color: 'bg-yellow-100 text-yellow-700', icon: <Mail className="h-4 w-4" /> },
  confirmed: { label: 'Confirmed', color: 'bg-green-100 text-green-700', icon: <CheckCircle className="h-4 w-4" /> },
  denied: { label: 'Discrepancy Flagged', color: 'bg-red-100 text-red-700', icon: <XCircle className="h-4 w-4" /> },
  expired: { label: 'Expired', color: 'bg-gray-100 text-gray-700', icon: <Clock className="h-4 w-4" /> },
  failed: { label: 'Failed', color: 'bg-red-100 text-red-700', icon: <XCircle className="h-4 w-4" /> },
};

export function ExtractedDataForm({ invoice, payee: initialPayee, verification: initialVerification }: ExtractedDataFormProps) {
  const [payee, setPayee] = useState(initialPayee);
  const [verification, setVerification] = useState(initialVerification);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const supabase = createClient();

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
        if (updated.status === 'confirmed' || updated.status === 'denied') {
          clearInterval(interval);
          toast.info(`Verification ${updated.status === 'confirmed' ? 'confirmed' : 'denied'} by payee`);
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
    } else {
      toast.success('Changes saved');
    }
  };

  const handleSendVerification = async () => {
    if (!payee.contact_phone) {
      toast.error('Payee does not have a phone number. Please add one first.');
      return;
    }

    setSending(true);
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
        type: 'email',
        status: 'sent',
        token: '',
        sent_at: new Date().toISOString(),
        responded_at: null,
        response_data: null,
        expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
      });
      toast.success(`Verification SMS sent to ${payee.contact_phone}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  const confidence = invoice.raw_extracted?.confidence ?? 0;
  const confidenceColor = confidence >= 0.8 ? 'bg-green-500' : confidence >= 0.5 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div className="space-y-6">
      {/* Confidence Score */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">AI Extraction Confidence</span>
            <span className="text-sm font-bold">{Math.round(confidence * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${confidenceColor}`}
              style={{ width: `${confidence * 100}%` }}
            />
          </div>
          {confidence < 0.7 && (
            <p className="text-sm text-amber-600 mt-2">
              Lower confidence — please review all fields carefully before sending verification.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Verification Status */}
      {verification && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">Verification Status:</span>
              <Badge className={`gap-1 ${statusConfig[verification.status as VerificationStatus]?.color || ''}`}>
                {statusConfig[verification.status as VerificationStatus]?.icon}
                {statusConfig[verification.status as VerificationStatus]?.label || verification.status}
              </Badge>
            </div>
            {verification.response_data && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium mb-1">
                  Response from {verification.response_data.respondent_name} ({verification.response_data.respondent_role})
                </p>
                {verification.response_data.discrepancies && (
                  <p className="text-sm text-red-600 mt-1">
                    Discrepancy: {verification.response_data.discrepancies}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Invoice Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Invoice Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <Label>Invoice Number</Label>
            <Input
              value={payee.invoice_number || ''}
              onChange={(e) => updateField('invoice_number', e.target.value)}
            />
          </div>
          <div>
            <Label>Amount</Label>
            <Input
              type="number"
              step="0.01"
              value={payee.invoice_amount || ''}
              onChange={(e) => updateField('invoice_amount', e.target.value ? parseFloat(e.target.value) : null)}
            />
          </div>
          <div>
            <Label>Invoice Date</Label>
            <Input
              type="date"
              value={payee.invoice_date || ''}
              onChange={(e) => updateField('invoice_date', e.target.value)}
            />
          </div>
          <div>
            <Label>Due Date</Label>
            <Input
              type="date"
              value={payee.due_date || ''}
              onChange={(e) => updateField('due_date', e.target.value)}
            />
          </div>
          <div>
            <Label>Currency</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              value={payee.currency}
              onChange={(e) => updateField('currency', e.target.value)}
            >
              <option value="USD">USD</option>
              <option value="CAD">CAD</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Payee Contact */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Payee Contact</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <Label>Company Name</Label>
            <Input
              value={payee.company_name || ''}
              onChange={(e) => updateField('company_name', e.target.value)}
            />
          </div>
          <div>
            <Label>Contact Name</Label>
            <Input
              value={payee.contact_name || ''}
              onChange={(e) => updateField('contact_name', e.target.value)}
            />
          </div>
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={payee.contact_email || ''}
              onChange={(e) => updateField('contact_email', e.target.value)}
            />
          </div>
          <div>
            <Label>Phone</Label>
            <Input
              value={payee.contact_phone || ''}
              onChange={(e) => updateField('contact_phone', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Address */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Address</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label>Address Line 1</Label>
            <Input
              value={payee.address_line1 || ''}
              onChange={(e) => updateField('address_line1', e.target.value)}
            />
          </div>
          <div className="col-span-2">
            <Label>Address Line 2</Label>
            <Input
              value={payee.address_line2 || ''}
              onChange={(e) => updateField('address_line2', e.target.value)}
            />
          </div>
          <div>
            <Label>City</Label>
            <Input
              value={payee.city || ''}
              onChange={(e) => updateField('city', e.target.value)}
            />
          </div>
          <div>
            <Label>State / Province</Label>
            <Input
              value={payee.state_province || ''}
              onChange={(e) => updateField('state_province', e.target.value)}
            />
          </div>
          <div>
            <Label>Postal Code</Label>
            <Input
              value={payee.postal_code || ''}
              onChange={(e) => updateField('postal_code', e.target.value)}
            />
          </div>
          <div>
            <Label>Country</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              value={payee.country}
              onChange={(e) => updateField('country', e.target.value)}
            >
              <option value="US">United States</option>
              <option value="CA">Canada</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Banking Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Banking Details {payee.country === 'CA' ? '(Canada)' : '(United States)'}
          </CardTitle>
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
                />
              </div>
              <div>
                <Label>Account Number</Label>
                <Input
                  value={payee.account_number || ''}
                  onChange={(e) => updateField('account_number', e.target.value)}
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
                />
              </div>
              <div>
                <Label>Institution Number</Label>
                <Input
                  value={payee.institution_number || ''}
                  onChange={(e) => updateField('institution_number', e.target.value)}
                  maxLength={3}
                  placeholder="3 digits"
                />
              </div>
              <div>
                <Label>Account Number</Label>
                <Input
                  value={payee.account_number || ''}
                  onChange={(e) => updateField('account_number', e.target.value)}
                />
              </div>
            </>
          )}
          <div>
            <Label>Bank Name</Label>
            <Input
              value={payee.bank_name || ''}
              onChange={(e) => updateField('bank_name', e.target.value)}
            />
          </div>
          <div>
            <Label>Account Type</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              value={payee.account_type || ''}
              onChange={(e) => updateField('account_type', e.target.value || null)}
            >
              <option value="">Not specified</option>
              <option value="checking">Checking</option>
              <option value="savings">Savings</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Separator />
      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Save Changes
        </Button>
        <Button
          onClick={handleSendVerification}
          disabled={sending || !payee.contact_phone || (verification?.status === 'sent')}
        >
          {sending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          <Mail className="h-4 w-4 mr-2" />
          {verification?.status === 'sent' ? 'Verification Sent' : 'Send Verification SMS'}
        </Button>
      </div>
    </div>
  );
}
