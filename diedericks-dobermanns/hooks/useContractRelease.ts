import { useCallback, useEffect, useState } from 'react';

import { Config } from '@/constants/config';
import { buildContractHtml, buildContractMergeData, mergeContractTemplate } from '@/lib/contracts/generateContract';
import { generateAndUploadContractPdf } from '@/lib/contracts/contractPdf';
import { callNotify } from '@/lib/functions';
import { requireSupabase } from '@/lib/supabase';
import type { TablesInsert, TablesUpdate } from '@/types/database.types';

export interface PuppyClientInfo {
  clientId: string;
  fullName: string | null;
}

/** Per-puppy linked client (owner_id takes priority over an open reservation). */
export function usePuppyClients(puppyIds: string[]) {
  const [clients, setClients] = useState<Map<string, PuppyClientInfo>>(new Map());
  const [loading, setLoading] = useState(true);
  const key = puppyIds.join(',');

  const refresh = useCallback(async () => {
    if (puppyIds.length === 0) {
      setClients(new Map());
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const supabase = requireSupabase();
      const [reservations, dogsWithOwners] = await Promise.all([
        supabase
          .from('reservations')
          .select('dog_id, client_id, client:users!reservations_client_id_fkey(full_name)')
          .in('dog_id', puppyIds),
        supabase
          .from('dogs')
          .select('id, owner_id, owner:users!dogs_owner_id_fkey(full_name)')
          .in('id', puppyIds)
          .not('owner_id', 'is', null),
      ]);
      const next = new Map<string, PuppyClientInfo>();
      for (const row of (reservations.data ?? []) as unknown as {
        dog_id: string;
        client_id: string;
        client: { full_name: string | null } | null;
      }[]) {
        if (row.client_id) next.set(row.dog_id, { clientId: row.client_id, fullName: row.client?.full_name ?? null });
      }
      for (const row of (dogsWithOwners.data ?? []) as unknown as {
        id: string;
        owner_id: string;
        owner: { full_name: string | null } | null;
      }[]) {
        if (row.owner_id) next.set(row.id, { clientId: row.owner_id, fullName: row.owner?.full_name ?? null });
      }
      setClients(next);
    } catch {
      setClients(new Map());
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { clients, loading, refresh };
}

export interface ContractTemplateOption {
  id: string;
  name: string;
}

/** The 2 live contract templates, for the Release flow's template picker. */
export function useContractTemplates() {
  const [templates, setTemplates] = useState<ContractTemplateOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = requireSupabase();
        const { data } = await supabase.from('contract_templates').select('id, name').order('name');
        if (!cancelled) setTemplates((data ?? []) as ContractTemplateOption[]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { templates, loading };
}

interface DogRow {
  id: string;
  name: string;
  date_of_birth: string | null;
  sex: string | null;
  colour: string | null;
  microchip_number: string | null;
  registration_number: string | null;
  price: number | null;
  father_id: string | null;
  mother_id: string | null;
  litter_id: string | null;
}

function genToken(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

export function useContractRelease() {
  const [releasing, setReleasing] = useState<string | null>(null);

  const releaseAndSendContract = useCallback(
    async (params: { dogId: string; clientId: string; templateId: string }) => {
      const { dogId, clientId, templateId } = params;
      setReleasing(dogId);
      try {
        const supabase = requireSupabase();

        const { data: dog, error: dogErr } = await supabase
          .from('dogs')
          .select(
            'id, name, date_of_birth, sex, colour, microchip_number, registration_number, price, father_id, mother_id, litter_id',
          )
          .eq('id', dogId)
          .single();
        if (dogErr || !dog) throw new Error(dogErr?.message ?? 'Puppy not found');
        const d = dog as unknown as DogRow;

        const parentIds = [d.father_id, d.mother_id].filter((v): v is string => !!v);
        const [litterRes, parentsRes, clientRes, priceRes, templateRes, userRes] = await Promise.all([
          d.litter_id
            ? supabase.from('litters').select('name').eq('id', d.litter_id).maybeSingle()
            : Promise.resolve({ data: null }),
          parentIds.length > 0
            ? supabase.from('dogs').select('id, name').in('id', parentIds)
            : Promise.resolve({ data: [] }),
          supabase.from('users').select('full_name').eq('id', clientId).maybeSingle(),
          supabase
            .from('reservations')
            .select('total_price')
            .eq('dog_id', dogId)
            .eq('client_id', clientId)
            .maybeSingle(),
          supabase.from('contract_templates').select('body_html, contract_title').eq('id', templateId).single(),
          supabase.auth.getUser(),
        ]);

        const template = templateRes.data as { body_html: string; contract_title: string } | null;
        if (templateRes.error || !template) throw new Error(templateRes.error?.message ?? 'Template not found');

        const parents = (parentsRes.data ?? []) as unknown as { id: string; name: string }[];
        const sireName = parents.find((p) => p.id === d.father_id)?.name ?? null;
        const damName = parents.find((p) => p.id === d.mother_id)?.name ?? null;
        const litterName = (litterRes.data as { name: string } | null)?.name ?? null;
        const buyerName = (clientRes.data as { full_name: string | null } | null)?.full_name ?? null;
        const negotiatedPrice = (priceRes.data as { total_price: number | null } | null)?.total_price;

        const mergeData = buildContractMergeData({
          buyerName,
          dogName: d.name,
          dateOfBirth: d.date_of_birth,
          sex: d.sex,
          colour: d.colour,
          microchipNumber: d.microchip_number,
          registrationNumber: d.registration_number,
          litterName,
          sireName,
          damName,
          price: negotiatedPrice ?? d.price,
        });
        const mergedBody = mergeContractTemplate(template.body_html, mergeData);
        const html = buildContractHtml(template.contract_title, mergedBody);

        await supabase.from('dogs').update({ released_at: new Date().toISOString() } as TablesUpdate<'dogs'>).eq('id', dogId);

        const { data: existingDraft } = await supabase
          .from('contracts')
          .select('id')
          .eq('dog_id', dogId)
          .eq('client_id', clientId)
          .eq('status', 'draft')
          .maybeSingle();

        let contractId = (existingDraft as { id: string } | null)?.id ?? null;
        if (contractId) {
          await supabase
            .from('contracts')
            .update({
              template_id: templateId,
              contract_title: template.contract_title,
              body_html: mergedBody,
            } as TablesUpdate<'contracts'>)
            .eq('id', contractId);
        } else {
          const insertPayload: TablesInsert<'contracts'> = {
            dog_id: dogId,
            client_id: clientId,
            litter_id: d.litter_id,
            template_id: templateId,
            contract_title: template.contract_title,
            body_html: mergedBody,
            status: 'draft',
            document_url: '',
            signed_by_client: false,
          };
          const { data: created, error: createErr } = await supabase
            .from('contracts')
            .insert(insertPayload)
            .select('id')
            .single();
          if (createErr || !created) throw new Error(createErr?.message ?? 'Could not create contract');
          contractId = (created as { id: string }).id;
        }

        const uploaderId = userRes.data.user?.id ?? null;
        const documentUrl = await generateAndUploadContractPdf(html, contractId, uploaderId);

        const token = genToken();
        const expires = new Date(Date.now() + 14 * 86_400_000).toISOString();
        await supabase
          .from('contracts')
          .update({
            document_url: documentUrl,
            esign_token: token,
            esign_expires_at: expires,
            esign_sent_at: new Date().toISOString(),
            status: 'sent',
          } as TablesUpdate<'contracts'>)
          .eq('id', contractId);

        const link = `${Config.app.webBaseUrl}/contracts/${contractId}`;
        await callNotify({
          userId: clientId,
          type: 'email',
          title: `${template.contract_title} — ready to sign`,
          body:
            `Hi${buyerName ? ` ${buyerName}` : ''}, the contract for ${d.name} is ready. ` +
            `<a href="${link}">Review &amp; sign your contract</a>. This link is valid for 14 days.`,
        });

        return contractId;
      } finally {
        setReleasing(null);
      }
    },
    [],
  );

  return { releaseAndSendContract, releasing };
}
