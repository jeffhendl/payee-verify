import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function DELETE() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.id;

    // Get all invoice IDs and file paths for this user
    const { data: invoices, error: fetchError } = await supabaseAdmin
      .from('invoices')
      .select('id, file_path')
      .eq('user_id', userId);

    if (fetchError) {
      console.error('Failed to fetch invoices:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 });
    }

    if (invoices && invoices.length > 0) {
      const invoiceIds = invoices.map((i) => i.id);

      // Delete verifications for all user's invoices
      const { error: verError } = await supabaseAdmin
        .from('verifications')
        .delete()
        .in('invoice_id', invoiceIds);

      if (verError) {
        console.error('Failed to delete verifications:', verError);
        return NextResponse.json({ error: 'Failed to delete verifications' }, { status: 500 });
      }

      // Delete payees for all user's invoices
      const { error: payeeError } = await supabaseAdmin
        .from('payees')
        .delete()
        .in('invoice_id', invoiceIds);

      if (payeeError) {
        console.error('Failed to delete payees:', payeeError);
        return NextResponse.json({ error: 'Failed to delete payees' }, { status: 500 });
      }

      // Delete invoice records
      const { error: invoiceError } = await supabaseAdmin
        .from('invoices')
        .delete()
        .eq('user_id', userId);

      if (invoiceError) {
        console.error('Failed to delete invoices:', invoiceError);
        return NextResponse.json({ error: 'Failed to delete invoices' }, { status: 500 });
      }

      // Delete files from storage
      const filePaths = invoices
        .map((i) => i.file_path)
        .filter(Boolean);

      if (filePaths.length > 0) {
        const { error: storageError } = await supabaseAdmin.storage
          .from('invoices')
          .remove(filePaths);

        if (storageError) {
          console.error('Failed to delete storage files:', storageError);
          // Non-fatal: data is already deleted
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Clear data error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
