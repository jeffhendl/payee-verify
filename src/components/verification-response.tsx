'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface VerificationResponseFormProps {
  token: string;
  payee: {
    company_name: string | null;
    invoice_number: string | null;
    invoice_amount: number | null;
    currency: string;
    bank_name: string | null;
    aba_routing_number: string | null;
    account_number: string | null;
    transit_number: string | null;
    institution_number: string | null;
    country: string;
  };
}

function maskValue(value: string | null): string {
  if (!value || value.length <= 4) return value || '••••';
  return '•'.repeat(value.length - 4) + value.slice(-4);
}

export function VerificationResponseForm({ token, payee }: VerificationResponseFormProps) {
  const [mode, setMode] = useState<'choose' | 'confirm' | 'deny' | 'submitted'>('choose');
  const [respondentName, setRespondentName] = useState('');
  const [respondentRole, setRespondentRole] = useState('');
  const [discrepancies, setDiscrepancies] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formattedAmount = payee.invoice_amount
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: payee.currency }).format(payee.invoice_amount)
    : 'N/A';

  const handleSubmit = async (confirmed: boolean) => {
    if (!respondentName || !respondentRole) {
      setError('Please provide your name and role');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/verifications/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          confirmed,
          respondent_name: respondentName,
          respondent_role: respondentRole,
          discrepancies: confirmed ? null : discrepancies,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to submit response');
      }

      setMode('submitted');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  if (mode === 'submitted') {
    return (
      <Card className="max-w-lg mx-auto">
        <CardContent className="pt-8 pb-8 text-center">
          <CheckCircle className="h-16 w-16 text-[#30AC2E] mx-auto mb-4" />
          <h2 className="text-xl font-bold text-[#383B3E] mb-2">Thank you!</h2>
          <p className="text-[#92979C]">Your response has been recorded. You can close this page.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Invoice Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Invoice Details to Verify</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span className="text-[#92979C]">Company</span>
            <span className="font-medium">{payee.company_name || 'N/A'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#92979C]">Invoice Number</span>
            <span className="font-medium">{payee.invoice_number || 'N/A'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#92979C]">Amount</span>
            <span className="font-medium">{formattedAmount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#92979C]">Bank Name</span>
            <span className="font-medium">{payee.bank_name || 'N/A'}</span>
          </div>
          {payee.country === 'US' && (
            <>
              <div className="flex justify-between">
                <span className="text-[#92979C]">Routing Number</span>
                <span className="font-mono">{maskValue(payee.aba_routing_number)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#92979C]">Account Number</span>
                <span className="font-mono">{maskValue(payee.account_number)}</span>
              </div>
            </>
          )}
          {payee.country === 'CA' && (
            <>
              <div className="flex justify-between">
                <span className="text-[#92979C]">Transit Number</span>
                <span className="font-mono">{maskValue(payee.transit_number)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#92979C]">Institution Number</span>
                <span className="font-mono">{maskValue(payee.institution_number)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#92979C]">Account Number</span>
                <span className="font-mono">{maskValue(payee.account_number)}</span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons or Form */}
      {mode === 'choose' && (
        <div className="grid grid-cols-2 gap-4">
          <Button
            size="lg"
            className="h-20 bg-[#045B3F] hover:bg-[#034830]"
            onClick={() => setMode('confirm')}
          >
            <CheckCircle className="h-5 w-5 mr-2" />
            Confirm Details
          </Button>
          <Button
            size="lg"
            variant="destructive"
            className="h-20"
            onClick={() => setMode('deny')}
          >
            <XCircle className="h-5 w-5 mr-2" />
            Flag Discrepancy
          </Button>
        </div>
      )}

      {(mode === 'confirm' || mode === 'deny') && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {mode === 'confirm' ? 'Confirm Details Are Correct' : 'Report Discrepancy'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Your Name</Label>
              <Input
                value={respondentName}
                onChange={(e) => setRespondentName(e.target.value)}
                placeholder="John Smith"
              />
            </div>
            <div>
              <Label>Your Role / Title</Label>
              <Input
                value={respondentRole}
                onChange={(e) => setRespondentRole(e.target.value)}
                placeholder="Accounts Receivable Manager"
              />
            </div>
            {mode === 'deny' && (
              <div>
                <Label>What is incorrect?</Label>
                <Textarea
                  value={discrepancies}
                  onChange={(e) => setDiscrepancies(e.target.value)}
                  placeholder="Please describe what details are incorrect..."
                  rows={4}
                />
              </div>
            )}

            {error && <p className="text-sm text-[#F12D1B]">{error}</p>}

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setMode('choose')}>
                Back
              </Button>
              <Button
                onClick={() => handleSubmit(mode === 'confirm')}
                disabled={submitting}
                className={mode === 'confirm' ? 'bg-[#045B3F] hover:bg-[#034830]' : ''}
                variant={mode === 'deny' ? 'destructive' : 'default'}
              >
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {mode === 'confirm' ? 'Submit Confirmation' : 'Submit Discrepancy Report'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
