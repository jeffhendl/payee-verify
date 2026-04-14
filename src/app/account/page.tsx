'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { NavBar } from '@/components/nav-bar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Trash2, AlertTriangle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function AccountPage() {
  const router = useRouter();
  const supabase = createClient();

  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [confirmDeleteDialogOpen, setConfirmDeleteDialogOpen] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleClearData = async () => {
    setClearing(true);
    try {
      const res = await fetch('/api/account/data', { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to clear data');
      setClearDialogOpen(false);
      router.push('/');
      router.refresh();
    } catch {
      alert('Failed to clear data. Please try again.');
    } finally {
      setClearing(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const res = await fetch('/api/account', { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete account');
      // Sign out locally and redirect to login
      await supabase.auth.signOut();
      router.push('/login');
      router.refresh();
    } catch {
      alert('Failed to delete account. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <NavBar />
      <main className="max-w-2xl mx-auto px-6 py-10">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-[#606265] hover:text-[#383B3E] mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        <h1 className="text-2xl font-semibold text-[#1D1D1D] mb-1">Manage Account</h1>
        <p className="text-sm text-[#92979C] mb-8">Manage your data and account settings.</p>

        <div className="space-y-4">
          {/* Clear Invoice Data */}
          <Card className="border-[#E8EAEC]">
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-base font-medium text-[#383B3E] mb-1">Clear Invoice Data</h2>
                  <p className="text-sm text-[#92979C] leading-relaxed">
                    Remove all invoices, payee details, and verification records. This gives you a fresh start while keeping your account.
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setClearDialogOpen(true)}
                  className="shrink-0 text-[#606265] border-[#E8EAEC] hover:text-red-600 hover:border-red-200 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear Data
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Delete Account */}
          <Card className="border-red-200">
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-base font-medium text-[#383B3E] mb-1">Delete Account</h2>
                  <p className="text-sm text-[#92979C] leading-relaxed">
                    Permanently delete your account and all associated data. This action cannot be undone. You will be signed out immediately.
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setDeleteDialogOpen(true)}
                  className="shrink-0 text-red-600 border-red-200 hover:bg-red-50"
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Delete Account
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Clear Data Confirmation */}
      <Dialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear all invoice data?</DialogTitle>
            <DialogDescription>
              This will permanently delete all your invoices, extracted payee details, and verification records. Your account will remain active but empty. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button
              onClick={handleClearData}
              disabled={clearing}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {clearing ? 'Clearing...' : 'Yes, clear all data'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Account - First Confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete your account?</DialogTitle>
            <DialogDescription>
              This will permanently delete your account, all invoices, payee details, and verification records. You will be signed out and your login credentials will stop working immediately.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button
              onClick={() => {
                setDeleteDialogOpen(false);
                setConfirmDeleteDialogOpen(true);
              }}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Account - Final Confirmation */}
      <Dialog open={confirmDeleteDialogOpen} onOpenChange={setConfirmDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you absolutely sure?</DialogTitle>
            <DialogDescription>
              This is your last chance. Once deleted, your account and all data are gone forever. There is no way to recover them.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button
              onClick={handleDeleteAccount}
              disabled={deleting}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {deleting ? 'Deleting...' : 'Permanently delete my account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
