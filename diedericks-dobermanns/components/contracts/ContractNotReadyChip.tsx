import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import { contractBlockers, tokenLabel, contractUnresolvedTokens } from '@/lib/contracts/contractReadiness';

export function ContractNotReadyChip({
  contract,
}: {
  contract: {
    status: string | null;
    body_html: string | null;
    dog_id: string | null;
    client_id: string | null;
    contact_id: string | null;
  };
}) {
  if (contract.status !== 'draft') return null;
  const n = contractBlockers(contract).length;
  if (n === 0) return null;
  return (
    <View className="mt-1 self-start rounded-full border border-amber-400/50 bg-amber-500/15 px-2 py-0.5">
      <Typography variant="caption" className="text-amber-200">
        Not ready · {n}
      </Typography>
    </View>
  );
}

export function ContractMissingPanel({
  contract,
}: {
  contract: {
    body_html: string | null;
    dog_id: string | null;
    client_id: string | null;
    contact_id: string | null;
  };
}) {
  const router = useRouter();
  const blockers = contractBlockers(contract);
  if (blockers.length === 0) return null;
  const tokens = contractUnresolvedTokens(contract.body_html);
  return (
    <View className="mt-3 rounded-xl border border-amber-400/40 bg-amber-500/10 p-3">
      <Typography variant="label" className="text-amber-200">
        Not ready to send
      </Typography>
      {tokens.map((t) => (
        <Typography key={t} variant="caption" className="mt-1">
          {tokenLabel(t)}
        </Typography>
      ))}
      {blockers.includes('zero_price') && !tokens.includes('purchase_price') ? (
        <Typography variant="caption" className="mt-1">
          Purchase price
        </Typography>
      ) : null}
      {contract.dog_id ? (
        <Pressable
          onPress={() =>
            router.push({ pathname: '/(admin)/dogs/[id]', params: { id: contract.dog_id! } } as never)
          }
          className="mt-2"
        >
          <Typography variant="caption" className="text-gold">
            Open the dog
          </Typography>
        </Pressable>
      ) : null}
      {contract.contact_id ? (
        <Pressable
          onPress={() =>
            router.push({ pathname: '/(admin)/contacts/[id]', params: { id: contract.contact_id! } } as never)
          }
          className="mt-1"
        >
          <Typography variant="caption" className="text-gold">
            Open the contact
          </Typography>
        </Pressable>
      ) : null}
    </View>
  );
}
