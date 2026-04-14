'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { ArrowLeft, Save, Trash2, Plus, X, Loader2, FileText } from 'lucide-react';
import type { KnownPayee, KnownPayeeAlias, KnownPayeeBankingDetails } from '@/lib/types';

interface LinkedInvoice {
  id: string;
  file_name: string;
  status: string;
  created_at: string;
  company_name: string | null;
}

interface KnownPayeeDetailProps {
  knownPayee: KnownPayee;
  aliases: KnownPayeeAlias[];
  bankingDetails: KnownPayeeBankingDetails[];
  linkedInvoices: LinkedInvoice[];
}

const STATUS_COLORS: Record<string, string> = {
  verified: 'bg-[#F2FCE4] text-[#30AC2E]',
  denied: 'bg-[#FEF1ED] text-[#F12D1B]',
  pending_review: 'bg-[#FFFBEB] text-[#D97706]',
  parsed: 'bg-[#CFE5F3] text-[#045B3F]',
  verification_sent: 'bg-[#EED9F7] text-[#8F5CCF]',
};

function maskAccountNumber(num: string | null): string {
  if (!num) return '—';
  if (num.length <= 4) return num;
  return '••••' + num.slice(-4);
}

export function KnownPayeeDetail({ knownPayee, aliases: initialAliases, bankingDetails: initialBanking, linkedInvoices }: KnownPayeeDetailProps) {
  const router = useRouter();
  const [nickname, setNickname] = useState(knownPayee.nickname || '');
  const [savingNickname, setSavingNickname] = useState(false);
  const [aliases, setAliases] = useState(initialAliases);
  const [bankingDetails, setBankingDetails] = useState(initialBanking);
  const [newAlias, setNewAlias] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteBankingId, setDeleteBankingId] = useState<string | null>(null);

  // Add banking form state
  const [showBankingForm, setShowBankingForm] = useState(false);
  const [bankingCountry, setBankingCountry] = useState<'US' | 'CA'>('US');
  const [bankingForm, setBankingForm] = useState({
    aba_routing_number: '',
    account_number: '',
    transit_number: '',
    institution_number: '',
    bank_name: '',
    account_type: '',
    currency: 'USD',
  });
  const [addingBanking, setAddingBanking] = useState(false);

  const handleSaveNickname = async () => {
    setSavingNickname(true);
    try {
      const res = await fetch(`/api/known-payees/${knownPayee.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: nickname || null }),
      });
      if (!res.ok) throw new Error();
      toast.success('Nickname saved');
    } catch {
      toast.error('Failed to save nickname');
    } finally {
      setSavingNickname(false);
    }
  };

  const handleAddAlias = async () => {
    if (!newAlias.trim()) return;
    try {
      // Add via direct call — we'll use the link endpoint pattern
      const normalized = newAlias.toLowerCase().trim();
      const res = await fetch(`/api/known-payees/${knownPayee.id}`, {
        method: 'GET',
      });
      if (!res.ok) throw new Error();

      // Use a simpler approach — just post to a custom endpoint
      // For now, re-fetch after adding
      const addRes = await fetch(`/api/known-payees/${knownPayee.id}/aliases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alias: normalized }),
      });
      if (!addRes.ok) throw new Error();
      const { alias: added } = await addRes.json();
      setAliases(prev => [...prev, added]);
      setNewAlias('');
      toast.success('Alias added');
    } catch {
      toast.error('Failed to add alias');
    }
  };

  const handleDeleteAlias = async (aliasId: string) => {
    try {
      const res = await fetch(`/api/known-payees/${knownPayee.id}/aliases`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aliasId }),
      });
      if (!res.ok) throw new Error();
      setAliases(prev => prev.filter(a => a.id !== aliasId));
      toast.success('Alias removed');
    } catch {
      toast.error('Failed to remove alias');
    }
  };

  const handleAddBanking = async () => {
    setAddingBanking(true);
    try {
      const res = await fetch(`/api/known-payees/${knownPayee.id}/banking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          country: bankingCountry,
          ...bankingForm,
          currency: bankingCountry === 'CA' ? 'CAD' : 'USD',
        }),
      });
      if (!res.ok) throw new Error();
      const { banking } = await res.json();
      setBankingDetails(prev => [...prev, banking]);
      setShowBankingForm(false);
      setBankingForm({ aba_routing_number: '', account_number: '', transit_number: '', institution_number: '', bank_name: '', account_type: '', currency: 'USD' });
      toast.success('Banking details added');
    } catch {
      toast.error('Failed to add banking details');
    } finally {
      setAddingBanking(false);
    }
  };

  const handleDeleteBanking = async () => {
    if (!deleteBankingId) return;
    try {
      const res = await fetch(`/api/known-payees/${knownPayee.id}/banking`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bankingId: deleteBankingId }),
      });
      if (!res.ok) throw new Error();
      setBankingDetails(prev => prev.filter(b => b.id !== deleteBankingId));
      setDeleteBankingId(null);
      toast.success('Banking details removed');
    } catch {
      toast.error('Failed to remove banking details');
    }
  };

  const handleDeletePayee = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/known-payees/${knownPayee.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('Known payee deleted');
      router.push('/payees');
    } catch {
      toast.error('Failed to delete known payee');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Link
        href="/payees"
        className="inline-flex items-center gap-1.5 text-sm text-[#606265] hover:text-[#383B3E]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Payees
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#1D1D1D]">{knownPayee.nickname || knownPayee.primary_name}</h1>
          {knownPayee.nickname && (
            <p className="text-[#71717A] mt-0.5">{knownPayee.primary_name}</p>
          )}
        </div>
        <Button
          variant="outline"
          onClick={() => setDeleteDialogOpen(true)}
          className="text-red-600 border-red-200 hover:bg-red-50"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete Payee
        </Button>
      </div>

      {/* Nickname */}
      <Card className="rounded-2xl border-[#E8EAEC]">
        <CardHeader>
          <CardTitle className="text-lg">Nickname</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Optional friendly name"
              className="max-w-sm"
            />
            <Button onClick={handleSaveNickname} disabled={savingNickname} variant="outline" className="gap-2">
              {savingNickname && <Loader2 className="h-4 w-4 animate-spin" />}
              <Save className="h-4 w-4" />
              Save
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Name Aliases */}
      <Card className="rounded-2xl border-[#E8EAEC]">
        <CardHeader>
          <CardTitle className="text-lg">Name Aliases</CardTitle>
          <p className="text-sm text-[#71717A]">Company names that will auto-match to this payee (case-insensitive).</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {aliases.map(alias => (
              <div key={alias.id} className="flex items-center gap-1.5 bg-[#F2F2F2] rounded-lg px-3 py-1.5">
                <span className="text-sm text-[#383B3E]">{alias.alias}</span>
                <button
                  onClick={() => handleDeleteAlias(alias.id)}
                  className="text-[#92979C] hover:text-[#F12D1B] transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {aliases.length === 0 && (
              <p className="text-sm text-[#92979C]">No aliases yet.</p>
            )}
          </div>
          <div className="flex gap-2">
            <Input
              value={newAlias}
              onChange={(e) => setNewAlias(e.target.value)}
              placeholder="Add company name alias..."
              className="max-w-sm"
              onKeyDown={(e) => e.key === 'Enter' && handleAddAlias()}
            />
            <Button variant="outline" size="sm" onClick={handleAddAlias} disabled={!newAlias.trim()} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Banking Details */}
      <Card className="rounded-2xl border-[#E8EAEC]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Verified Banking Details</CardTitle>
              <p className="text-sm text-[#71717A] mt-0.5">Bank accounts on file for this payee.</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowBankingForm(true)} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Add
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {bankingDetails.map(bd => (
            <div key={bd.id} className="flex items-center justify-between p-4 rounded-xl bg-[#FAFAFA] border border-[#E8EAEC]">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">{bd.country}</Badge>
                  <Badge variant="outline" className="text-xs">{bd.currency}</Badge>
                  {bd.bank_name && <span className="text-sm text-[#383B3E] font-medium">{bd.bank_name}</span>}
                </div>
                <div className="text-sm text-[#71717A]">
                  {bd.country === 'US' ? (
                    <>Routing: {bd.aba_routing_number || '—'} / Account: {maskAccountNumber(bd.account_number)}</>
                  ) : (
                    <>Transit: {bd.transit_number || '—'} / Inst: {bd.institution_number || '—'} / Account: {maskAccountNumber(bd.account_number)}</>
                  )}
                  {bd.account_type && <> / {bd.account_type}</>}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDeleteBankingId(bd.id)}
                className="text-[#92979C] hover:text-[#F12D1B]"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {bankingDetails.length === 0 && !showBankingForm && (
            <p className="text-sm text-[#92979C]">No banking details on file.</p>
          )}

          {/* Add Banking Form */}
          {showBankingForm && (
            <div className="p-4 rounded-xl border border-[#045B3F] bg-[#F0FFF8] space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-[#045B3F]">Add Banking Details</p>
                <select
                  className="rounded-lg border border-input bg-transparent px-3 py-1.5 text-sm"
                  value={bankingCountry}
                  onChange={(e) => setBankingCountry(e.target.value as 'US' | 'CA')}
                >
                  <option value="US">United States</option>
                  <option value="CA">Canada</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {bankingCountry === 'US' ? (
                  <>
                    <div>
                      <Label className="text-xs">ABA Routing Number</Label>
                      <Input
                        value={bankingForm.aba_routing_number}
                        onChange={(e) => setBankingForm(p => ({ ...p, aba_routing_number: e.target.value }))}
                        maxLength={9}
                        placeholder="9 digits"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Account Number</Label>
                      <Input
                        value={bankingForm.account_number}
                        onChange={(e) => setBankingForm(p => ({ ...p, account_number: e.target.value }))}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <Label className="text-xs">Transit Number</Label>
                      <Input
                        value={bankingForm.transit_number}
                        onChange={(e) => setBankingForm(p => ({ ...p, transit_number: e.target.value }))}
                        maxLength={5}
                        placeholder="5 digits"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Institution Number</Label>
                      <Input
                        value={bankingForm.institution_number}
                        onChange={(e) => setBankingForm(p => ({ ...p, institution_number: e.target.value }))}
                        maxLength={3}
                        placeholder="3 digits"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Account Number</Label>
                      <Input
                        value={bankingForm.account_number}
                        onChange={(e) => setBankingForm(p => ({ ...p, account_number: e.target.value }))}
                      />
                    </div>
                  </>
                )}
                <div>
                  <Label className="text-xs">Bank Name</Label>
                  <Input
                    value={bankingForm.bank_name}
                    onChange={(e) => setBankingForm(p => ({ ...p, bank_name: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className="text-xs">Account Type</Label>
                  <select
                    className="flex h-10 w-full rounded-xl border border-input bg-transparent px-3 py-1 text-sm"
                    value={bankingForm.account_type}
                    onChange={(e) => setBankingForm(p => ({ ...p, account_type: e.target.value }))}
                  >
                    <option value="">Not specified</option>
                    <option value="checking">Checking</option>
                    <option value="savings">Savings</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => setShowBankingForm(false)}>Cancel</Button>
                <Button size="sm" onClick={handleAddBanking} disabled={addingBanking || !bankingForm.account_number} className="bg-[#045B3F] hover:bg-[#034830] gap-1.5">
                  {addingBanking && <Loader2 className="h-3 w-3 animate-spin" />}
                  Add
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Linked Invoices */}
      <Card className="rounded-2xl border-[#E8EAEC]">
        <CardHeader>
          <CardTitle className="text-lg">Linked Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          {linkedInvoices.length === 0 ? (
            <p className="text-sm text-[#92979C]">No invoices linked to this payee yet.</p>
          ) : (
            <div className="space-y-2">
              {linkedInvoices.map(inv => (
                <Link key={inv.id} href={`/review/${inv.id}`}>
                  <div className="flex items-center justify-between p-3 rounded-xl hover:bg-[#F2F2F2] transition-colors">
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-[#92979C]" />
                      <div>
                        <p className="text-sm font-medium text-[#383B3E]">{inv.file_name}</p>
                        <p className="text-xs text-[#92979C]">{new Date(inv.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <Badge className={STATUS_COLORS[inv.status] || 'bg-[#E5E5E5] text-[#606265]'}>
                      {inv.status.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Payee Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete known payee?</DialogTitle>
            <DialogDescription>
              This will remove &quot;{knownPayee.nickname || knownPayee.primary_name}&quot; and all its aliases and banking details. Existing invoices will be unlinked but not deleted. Future invoices from this payee will not auto-match.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button onClick={handleDeletePayee} disabled={deleting} className="bg-red-600 text-white hover:bg-red-700">
              {deleting ? 'Deleting...' : 'Delete Payee'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Banking Dialog */}
      <Dialog open={!!deleteBankingId} onOpenChange={(open) => !open && setDeleteBankingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove banking details?</DialogTitle>
            <DialogDescription>
              This banking detail set will be removed. Future invoices with these banking details will no longer auto-match to this payee.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button onClick={handleDeleteBanking} className="bg-red-600 text-white hover:bg-red-700">
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
