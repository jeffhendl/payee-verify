'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle, Loader2, Building2, AlertTriangle } from 'lucide-react';

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
    swift_code: string | null;
    iban: string | null;
    sort_code: string | null;
    country: string;
    payment_rail: string | null;
  };
  bankingMissing: boolean;
}

function maskValue(value: string | null): string {
  if (!value || value.length <= 4) return value || '••••';
  return '•'.repeat(value.length - 4) + value.slice(-4);
}

interface BankingErrors {
  transitNumber?: string;
  institutionNumber?: string;
  accountNumber?: string;
  abaRouting?: string;
  swiftCode?: string;
  iban?: string;
  sortCode?: string;
}

function validateBanking(rail: string, fields: { transitNumber: string; institutionNumber: string; accountNumber: string; abaRouting: string; swiftCode: string; iban: string; sortCode: string }): BankingErrors {
  const errors: BankingErrors = {};

  if (rail === 'ach') {
    if (fields.abaRouting && !/^\d{9}$/.test(fields.abaRouting)) errors.abaRouting = 'Routing number must be exactly 9 digits';
    if (fields.accountNumber && !/^\d{7,12}$/.test(fields.accountNumber)) errors.accountNumber = 'Account number must be 7–12 digits';
  } else if (rail === 'eft') {
    if (fields.transitNumber && !/^\d{5}$/.test(fields.transitNumber)) errors.transitNumber = 'Transit number must be exactly 5 digits';
    if (fields.institutionNumber && !/^\d{3}$/.test(fields.institutionNumber)) errors.institutionNumber = 'Institution number must be exactly 3 digits';
    if (fields.accountNumber && !/^\d{7,12}$/.test(fields.accountNumber)) errors.accountNumber = 'Account number must be 7–12 digits';
  } else if (rail === 'swift') {
    if (fields.swiftCode && !/^[A-Z0-9]{8,11}$/i.test(fields.swiftCode)) errors.swiftCode = 'SWIFT code must be 8 or 11 alphanumeric characters';
  } else if (rail === 'sepa') {
    if (fields.iban && !/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/i.test(fields.iban.replace(/\s/g, ''))) errors.iban = 'Invalid IBAN format';
  } else if (rail === 'bacs') {
    if (fields.sortCode && !/^\d{6}$/.test(fields.sortCode.replace(/-/g, ''))) errors.sortCode = 'Sort code must be 6 digits';
  }

  return errors;
}

export function VerificationResponseForm({ token, payee, bankingMissing }: VerificationResponseFormProps) {
  const [mode, setMode] = useState<'choose' | 'confirm' | 'deny' | 'submitted'>('choose');
  const [respondentName, setRespondentName] = useState('');
  const [respondentRole, setRespondentRole] = useState('');
  const [discrepancies, setDiscrepancies] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Banking details state (only used when bankingMissing is true)
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [abaRouting, setAbaRouting] = useState('');
  const [transitNumber, setTransitNumber] = useState('');
  const [institutionNumber, setInstitutionNumber] = useState('');
  const [swiftCode, setSwiftCode] = useState('');
  const [iban, setIban] = useState('');
  const [sortCode, setSortCode] = useState('');
  const [selectedRail, setSelectedRail] = useState(payee.payment_rail || '');
  const [accountType, setAccountType] = useState('');
  const [bankingErrors, setBankingErrors] = useState<BankingErrors>({});

  const formattedAmount = (() => {
    if (!payee.invoice_amount) return 'N/A';
    const prefix = payee.currency === 'USD' ? 'US' : payee.currency === 'CAD' ? 'CA' : '';
    return prefix + new Intl.NumberFormat('en-US', { style: 'currency', currency: payee.currency, currencyDisplay: 'narrowSymbol' }).format(payee.invoice_amount);
  })();

  const handleSubmit = async (confirmed: boolean) => {
    if (!respondentName || !respondentRole) {
      setError('Please provide your name and role');
      return;
    }

    // If confirming and banking is missing, validate required banking fields based on rail
    if (confirmed && bankingMissing) {
      const rail = selectedRail;
      if (!rail) {
        setError('Please select a payment rail type');
        return;
      }

      const missingFields: string[] = [];
      if (rail === 'ach') { if (!abaRouting) missingFields.push('ABA Routing Number'); if (!accountNumber) missingFields.push('Account Number'); }
      else if (rail === 'eft') { if (!transitNumber) missingFields.push('Transit Number'); if (!institutionNumber) missingFields.push('Institution Number'); if (!accountNumber) missingFields.push('Account Number'); }
      else if (rail === 'swift') { if (!swiftCode) missingFields.push('SWIFT/BIC Code'); if (!accountNumber) missingFields.push('Account Number'); }
      else if (rail === 'sepa') { if (!iban) missingFields.push('IBAN'); }
      else if (rail === 'bacs') { if (!sortCode) missingFields.push('Sort Code'); if (!accountNumber) missingFields.push('Account Number'); }

      if (missingFields.length > 0) {
        setError(`Please provide: ${missingFields.join(', ')}`);
        return;
      }

      const validationErrors = validateBanking(rail, { transitNumber, institutionNumber, accountNumber, abaRouting, swiftCode, iban, sortCode });
      if (Object.keys(validationErrors).length > 0) {
        setBankingErrors(validationErrors);
        setError('Please fix the banking detail errors before submitting');
        return;
      }
    }

    setSubmitting(true);
    setError(null);
    setBankingErrors({});

    const bankingDetails = bankingMissing && confirmed ? {
      payment_rail: selectedRail || null,
      bank_name: bankName || null,
      account_number: accountNumber || null,
      aba_routing_number: selectedRail === 'ach' ? (abaRouting || null) : null,
      transit_number: selectedRail === 'eft' ? (transitNumber || null) : null,
      institution_number: selectedRail === 'eft' ? (institutionNumber || null) : null,
      swift_code: selectedRail === 'swift' ? (swiftCode || null) : null,
      iban: selectedRail === 'sepa' ? (iban || null) : null,
      sort_code: selectedRail === 'bacs' ? (sortCode || null) : null,
      account_type: accountType || null,
    } : undefined;

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
          banking_details: bankingDetails,
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
      <Card className="max-w-lg mx-auto rounded-2xl border-[#E8EAEC] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
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
      <Card className="rounded-2xl border-[#E8EAEC] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
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
          {!bankingMissing && (
            <>
              {payee.bank_name && (
                <div className="flex justify-between">
                  <span className="text-[#92979C]">Bank Name</span>
                  <span className="font-medium">{payee.bank_name}</span>
                </div>
              )}
              {payee.aba_routing_number && (
                <div className="flex justify-between">
                  <span className="text-[#92979C]">Routing Number</span>
                  <span className="font-mono">{maskValue(payee.aba_routing_number)}</span>
                </div>
              )}
              {payee.transit_number && (
                <div className="flex justify-between">
                  <span className="text-[#92979C]">Transit Number</span>
                  <span className="font-mono">{maskValue(payee.transit_number)}</span>
                </div>
              )}
              {payee.institution_number && (
                <div className="flex justify-between">
                  <span className="text-[#92979C]">Institution Number</span>
                  <span className="font-mono">{maskValue(payee.institution_number)}</span>
                </div>
              )}
              {payee.swift_code && (
                <div className="flex justify-between">
                  <span className="text-[#92979C]">SWIFT/BIC</span>
                  <span className="font-mono">{payee.swift_code}</span>
                </div>
              )}
              {payee.iban && (
                <div className="flex justify-between">
                  <span className="text-[#92979C]">IBAN</span>
                  <span className="font-mono">{maskValue(payee.iban)}</span>
                </div>
              )}
              {payee.sort_code && (
                <div className="flex justify-between">
                  <span className="text-[#92979C]">Sort Code</span>
                  <span className="font-mono">{payee.sort_code}</span>
                </div>
              )}
              {payee.account_number && (
                <div className="flex justify-between">
                  <span className="text-[#92979C]">Account Number</span>
                  <span className="font-mono">{maskValue(payee.account_number)}</span>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Banking Details Collection (when missing) */}
      {bankingMissing && mode === 'choose' && (
        <Card className="rounded-2xl border-[#045B3F] bg-[#F0FFF8] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-[#045B3F]" />
              <CardTitle className="text-lg text-[#045B3F]">Banking Details Needed</CardTitle>
            </div>
            <p className="text-sm text-[#4A7C6A] mt-1">
              The invoice did not include banking details. Please provide them below to complete the verification.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-[#383B3E]">Payment Type</Label>
              <select className="flex h-11 w-full rounded-xl border border-input bg-white px-3 py-1 text-sm" value={selectedRail} onChange={(e) => setSelectedRail(e.target.value)}>
                <option value="">Select payment type...</option>
                <option value="ach">ACH (US Domestic)</option>
                <option value="eft">Canadian EFT</option>
                <option value="swift">SWIFT Wire</option>
                <option value="sepa">SEPA / IBAN</option>
                <option value="bacs">UK BACS</option>
              </select>
            </div>
            <div>
              <Label className="text-[#383B3E]">Bank Name</Label>
              <Input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="e.g. Chase, TD Bank, Barclays" className="rounded-xl h-11 bg-white" />
            </div>
            {selectedRail === 'ach' && (
              <>
                <div>
                  <Label className="text-[#383B3E]">ABA Routing Number</Label>
                  <Input value={abaRouting} onChange={(e) => { setAbaRouting(e.target.value.replace(/\D/g, '').slice(0, 9)); if (bankingErrors.abaRouting) setBankingErrors(prev => ({ ...prev, abaRouting: undefined })); }} placeholder="9 digits" maxLength={9} inputMode="numeric" className={`rounded-xl h-11 bg-white ${bankingErrors.abaRouting ? 'border-[#F12D1B]' : ''}`} />
                  {bankingErrors.abaRouting && <p className="text-xs text-[#F12D1B] mt-1 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> {bankingErrors.abaRouting}</p>}
                </div>
                <div>
                  <Label className="text-[#383B3E]">Account Number</Label>
                  <Input value={accountNumber} onChange={(e) => { setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 12)); if (bankingErrors.accountNumber) setBankingErrors(prev => ({ ...prev, accountNumber: undefined })); }} placeholder="7–12 digits" maxLength={12} inputMode="numeric" className={`rounded-xl h-11 bg-white ${bankingErrors.accountNumber ? 'border-[#F12D1B]' : ''}`} />
                  {bankingErrors.accountNumber && <p className="text-xs text-[#F12D1B] mt-1 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> {bankingErrors.accountNumber}</p>}
                </div>
              </>
            )}
            {selectedRail === 'eft' && (
              <>
                <div>
                  <Label className="text-[#383B3E]">Transit Number</Label>
                  <Input value={transitNumber} onChange={(e) => { setTransitNumber(e.target.value.replace(/\D/g, '').slice(0, 5)); if (bankingErrors.transitNumber) setBankingErrors(prev => ({ ...prev, transitNumber: undefined })); }} placeholder="5 digits" maxLength={5} inputMode="numeric" className={`rounded-xl h-11 bg-white ${bankingErrors.transitNumber ? 'border-[#F12D1B]' : ''}`} />
                  {bankingErrors.transitNumber && <p className="text-xs text-[#F12D1B] mt-1 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> {bankingErrors.transitNumber}</p>}
                </div>
                <div>
                  <Label className="text-[#383B3E]">Institution Number</Label>
                  <Input value={institutionNumber} onChange={(e) => { setInstitutionNumber(e.target.value.replace(/\D/g, '').slice(0, 3)); if (bankingErrors.institutionNumber) setBankingErrors(prev => ({ ...prev, institutionNumber: undefined })); }} placeholder="3 digits" maxLength={3} inputMode="numeric" className={`rounded-xl h-11 bg-white ${bankingErrors.institutionNumber ? 'border-[#F12D1B]' : ''}`} />
                  {bankingErrors.institutionNumber && <p className="text-xs text-[#F12D1B] mt-1 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> {bankingErrors.institutionNumber}</p>}
                </div>
                <div>
                  <Label className="text-[#383B3E]">Account Number</Label>
                  <Input value={accountNumber} onChange={(e) => { setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 12)); if (bankingErrors.accountNumber) setBankingErrors(prev => ({ ...prev, accountNumber: undefined })); }} placeholder="7–12 digits" maxLength={12} inputMode="numeric" className={`rounded-xl h-11 bg-white ${bankingErrors.accountNumber ? 'border-[#F12D1B]' : ''}`} />
                  {bankingErrors.accountNumber && <p className="text-xs text-[#F12D1B] mt-1 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> {bankingErrors.accountNumber}</p>}
                </div>
              </>
            )}
            {selectedRail === 'swift' && (
              <>
                <div>
                  <Label className="text-[#383B3E]">SWIFT / BIC Code</Label>
                  <Input value={swiftCode} onChange={(e) => { setSwiftCode(e.target.value.toUpperCase().slice(0, 11)); if (bankingErrors.swiftCode) setBankingErrors(prev => ({ ...prev, swiftCode: undefined })); }} placeholder="8 or 11 characters" maxLength={11} className={`rounded-xl h-11 bg-white ${bankingErrors.swiftCode ? 'border-[#F12D1B]' : ''}`} />
                  {bankingErrors.swiftCode && <p className="text-xs text-[#F12D1B] mt-1 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> {bankingErrors.swiftCode}</p>}
                </div>
                <div>
                  <Label className="text-[#383B3E]">Account Number</Label>
                  <Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} className="rounded-xl h-11 bg-white" />
                </div>
              </>
            )}
            {selectedRail === 'sepa' && (
              <div>
                <Label className="text-[#383B3E]">IBAN</Label>
                <Input value={iban} onChange={(e) => { setIban(e.target.value.toUpperCase().replace(/\s/g, '')); if (bankingErrors.iban) setBankingErrors(prev => ({ ...prev, iban: undefined })); }} placeholder="e.g. DE89370400440532013000" maxLength={34} className={`rounded-xl h-11 bg-white ${bankingErrors.iban ? 'border-[#F12D1B]' : ''}`} />
                {bankingErrors.iban && <p className="text-xs text-[#F12D1B] mt-1 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> {bankingErrors.iban}</p>}
              </div>
            )}
            {selectedRail === 'bacs' && (
              <>
                <div>
                  <Label className="text-[#383B3E]">Sort Code</Label>
                  <Input value={sortCode} onChange={(e) => { setSortCode(e.target.value.slice(0, 8)); if (bankingErrors.sortCode) setBankingErrors(prev => ({ ...prev, sortCode: undefined })); }} placeholder="e.g. 20-00-00" maxLength={8} className={`rounded-xl h-11 bg-white ${bankingErrors.sortCode ? 'border-[#F12D1B]' : ''}`} />
                  {bankingErrors.sortCode && <p className="text-xs text-[#F12D1B] mt-1 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> {bankingErrors.sortCode}</p>}
                </div>
                <div>
                  <Label className="text-[#383B3E]">Account Number</Label>
                  <Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} className="rounded-xl h-11 bg-white" />
                </div>
              </>
            )}
            <div>
              <Label className="text-[#383B3E]">Account Type</Label>
              <select
                className="flex h-11 w-full rounded-xl border border-input bg-white px-3 py-1 text-sm"
                value={accountType}
                onChange={(e) => setAccountType(e.target.value)}
              >
                <option value="">Select type</option>
                <option value="checking">Checking</option>
                <option value="savings">Savings</option>
              </select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error message in choose mode */}
      {mode === 'choose' && error && (
        <div className="p-3 rounded-xl bg-[#FEF1ED] border border-[#FECDC6]">
          <p className="text-sm text-[#F12D1B] flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            {error}
          </p>
        </div>
      )}

      {/* Action Buttons or Form */}
      {mode === 'choose' && (
        <div className="grid grid-cols-2 gap-4">
          <Button
            size="lg"
            className="h-16 rounded-2xl bg-[#045B3F] hover:bg-[#034830]"
            onClick={() => {
              // Validate banking fields before proceeding
              if (bankingMissing) {
                const missingFields: string[] = [];
                if (payee.country === 'US') {
                  if (!abaRouting) missingFields.push('ABA Routing Number');
                  if (!accountNumber) missingFields.push('Account Number');
                } else {
                  if (!transitNumber) missingFields.push('Transit Number');
                  if (!institutionNumber) missingFields.push('Institution Number');
                  if (!accountNumber) missingFields.push('Account Number');
                }

                if (missingFields.length > 0) {
                  setError(`Please provide: ${missingFields.join(', ')}`);
                  return;
                }

                const validationErrors = validateBanking(selectedRail || payee.payment_rail || '', { transitNumber, institutionNumber, accountNumber, abaRouting, swiftCode, iban, sortCode });
                if (Object.keys(validationErrors).length > 0) {
                  setBankingErrors(validationErrors);
                  setError('Please fix the banking detail errors before proceeding');
                  return;
                }
              }
              setError(null);
              setBankingErrors({});
              setMode('confirm');
            }}
          >
            <CheckCircle className="h-5 w-5 mr-2" />
            Confirm Details
          </Button>
          <Button
            size="lg"
            variant="destructive"
            className="h-16 rounded-2xl"
            onClick={() => setMode('deny')}
          >
            <XCircle className="h-5 w-5 mr-2" />
            Flag Discrepancy
          </Button>
        </div>
      )}

      {(mode === 'confirm' || mode === 'deny') && (
        <Card className="rounded-2xl border-[#E8EAEC] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
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
                className="rounded-xl h-11"
              />
            </div>
            <div>
              <Label>Your Role / Title</Label>
              <Input
                value={respondentRole}
                onChange={(e) => setRespondentRole(e.target.value)}
                placeholder="Accounts Receivable Manager"
                className="rounded-xl h-11"
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
                  className="rounded-xl"
                />
              </div>
            )}

            {error && <p className="text-sm text-[#F12D1B]">{error}</p>}

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setMode('choose')} className="rounded-xl">
                Back
              </Button>
              <Button
                onClick={() => handleSubmit(mode === 'confirm')}
                disabled={submitting}
                className={`rounded-xl ${mode === 'confirm' ? 'bg-[#045B3F] hover:bg-[#034830]' : ''}`}
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
