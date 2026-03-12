import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const invoiceId = searchParams.get('id');

    if (!invoiceId) {
      return NextResponse.json({ error: 'Missing invoice id' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: invoice } = await supabase
      .from('invoices')
      .select('file_path')
      .eq('id', invoiceId)
      .eq('user_id', user.id)
      .single();

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Create a signed URL valid for 1 hour
    const { data: signedUrl, error } = await supabase.storage
      .from('invoices')
      .createSignedUrl(invoice.file_path, 3600);

    if (error || !signedUrl) {
      return NextResponse.json({ error: 'Failed to generate PDF URL' }, { status: 500 });
    }

    return NextResponse.json({ url: signedUrl.signedUrl });
  } catch (error) {
    console.error('PDF URL error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
