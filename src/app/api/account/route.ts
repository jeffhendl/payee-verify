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
    const { data: invoices } = await supabaseAdmin
      .from('invoices')
      .select('id, file_path')
      .eq('user_id', userId);

    // Delete known payees (cascades to aliases and banking details)
    await supabaseAdmin
      .from('known_payees')
      .delete()
      .eq('user_id', userId);

    if (invoices && invoices.length > 0) {
      const invoiceIds = invoices.map((i) => i.id);

      // Delete verifications
      await supabaseAdmin
        .from('verifications')
        .delete()
        .in('invoice_id', invoiceIds);

      // Delete payees
      await supabaseAdmin
        .from('payees')
        .delete()
        .in('invoice_id', invoiceIds);

      // Delete invoice records
      await supabaseAdmin
        .from('invoices')
        .delete()
        .eq('user_id', userId);

      // Delete files from storage
      const filePaths = invoices
        .map((i) => i.file_path)
        .filter(Boolean);

      if (filePaths.length > 0) {
        await supabaseAdmin.storage
          .from('invoices')
          .remove(filePaths);
      }
    }

    // Delete the auth user — this invalidates all sessions immediately
    const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteUserError) {
      console.error('Failed to delete auth user:', deleteUserError);
      return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete account error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
