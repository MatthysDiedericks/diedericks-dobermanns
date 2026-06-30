import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function SignContractPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();

  const { data: contract } = await supabase
    .from('contracts')
    .select('id, contract_title, body_html, status, esign_expires_at, signed_by_client')
    .eq('esign_token', token)
    .maybeSingle();

  const expired =
    !contract ||
    !contract.esign_expires_at ||
    new Date(contract.esign_expires_at) < new Date() ||
    contract.status === 'void';

  if (expired || contract.signed_by_client) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16 text-center">
        <h1 className="font-cinzel text-2xl text-gold">Link unavailable</h1>
        <p className="mt-4 text-subtle">
          {contract?.signed_by_client
            ? 'This contract has already been signed.'
            : 'This link has expired. Please contact Diedericks Dobermanns.'}
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="font-cinzel text-2xl text-gold">{contract.contract_title ?? 'Contract'}</h1>
      <div
        className="mt-8 rounded-sm border border-gold/20 bg-surface p-6 prose prose-invert max-w-none text-sm"
        dangerouslySetInnerHTML={{ __html: contract.body_html ?? '<p>No content</p>' }}
      />
      <p className="mt-8 text-center text-subtle text-sm">
        To sign electronically, please contact us — full eSign UI can be enabled with server actions.
      </p>
    </main>
  );
}
