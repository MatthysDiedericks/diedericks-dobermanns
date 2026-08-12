/**
 * Union-find + contact duplicate graph (email / phone / name).
 */

import {
  isPlaceholderName,
  namesCompatible,
  normaliseEmail,
  normaliseName,
  toE164,
} from './phoneE164.mjs';

export function richness(c) {
  return ['full_name', 'email', 'phone', 'address', 'city', 'country', 'company', 'user_id']
    .filter((f) => c[f]).length;
}

export function pickSurvivor(a, b) {
  const ra = richness(a);
  const rb = richness(b);
  if (ra !== rb) return ra > rb ? a : b;
  const ta = a.created_at || '';
  const tb = b.created_at || '';
  return ta <= tb ? a : b;
}

export function ufParent(parent, x) {
  if (parent.get(x) !== x) parent.set(x, ufParent(parent, parent.get(x)));
  return parent.get(x);
}

export function ufUnion(parent, a, b) {
  const ra = ufParent(parent, a);
  const rb = ufParent(parent, b);
  if (ra !== rb) parent.set(rb, ra);
}

export function orderedPair(a, b) {
  return a.id < b.id ? [a, b] : [b, a];
}

/**
 * Build phone/email patches and duplicate queues from active contacts.
 * Mutates contacts in-place with computed phone_e164 / whatsapp_e164.
 */
export function detectDuplicates(active) {
  const phonePatches = [];
  const unresolvable = [];
  for (const c of active) {
    const phone_e164 = toE164(c.phone);
    const whatsapp_e164 = toE164(c.whatsapp_number);
    if (c.phone && !phone_e164) {
      unresolvable.push({ id: c.id, name: c.full_name, phone: c.phone });
    }
    if (
      phone_e164 !== (c.phone_e164 ?? null) ||
      whatsapp_e164 !== (c.whatsapp_e164 ?? null)
    ) {
      phonePatches.push({ id: c.id, phone_e164, whatsapp_e164 });
      c.phone_e164 = phone_e164;
      c.whatsapp_e164 = whatsapp_e164;
    }
  }

  const parent = new Map(active.map((c) => [c.id, c.id]));
  const byEmail = new Map();
  const byPhone = new Map();
  const edgeReasons = new Map();

  function addEdge(a, b, reason, detail) {
    if (a.id === b.id) return;
    ufUnion(parent, a.id, b.id);
    const [x, y] = orderedPair(a, b);
    const key = `${x.id}|${y.id}`;
    if (!edgeReasons.has(key)) edgeReasons.set(key, { reason, detail, a: x, b: y });
  }

  for (const c of active) {
    const em = normaliseEmail(c.email);
    if (em) {
      if (!byEmail.has(em)) byEmail.set(em, []);
      byEmail.get(em).push(c);
    }
    const ph = c.phone_e164 || toE164(c.phone);
    if (ph) {
      if (!byPhone.has(ph)) byPhone.set(ph, []);
      byPhone.get(ph).push(c);
    }
  }

  for (const [em, list] of byEmail) {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) addEdge(list[i], list[j], 'email', em);
    }
  }
  for (const [ph, list] of byPhone) {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const [x, y] = orderedPair(list[i], list[j]);
        const key = `${x.id}|${y.id}`;
        if (edgeReasons.has(key)) {
          const prev = edgeReasons.get(key);
          if (prev.reason === 'email') {
            edgeReasons.set(key, {
              reason: 'name+phone',
              detail: `${prev.detail} / ${ph}`,
              a: x,
              b: y,
            });
          }
        } else addEdge(list[i], list[j], 'phone', ph);
      }
    }
  }

  const byName = new Map();
  for (const c of active) {
    const n = normaliseName(c.full_name);
    if (!n || isPlaceholderName(c.full_name)) continue;
    if (!byName.has(n)) byName.set(n, []);
    byName.get(n).push(c);
  }

  const autoMerges = [];
  const queueMedium = [];
  const queueLow = [];

  for (const [, edge] of edgeReasons) {
    const { a, b, reason, detail } = edge;
    if (namesCompatible(a.full_name, b.full_name)) {
      autoMerges.push({ a, b, reason, detail, survivor: pickSurvivor(a, b) });
    } else {
      queueMedium.push({ a, b, reason, detail, confidence: 'medium' });
    }
  }

  for (const [n, list] of byName) {
    if (list.length < 2) continue;
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const [x, y] = orderedPair(list[i], list[j]);
        const key = `${x.id}|${y.id}`;
        if (edgeReasons.has(key)) continue;
        queueLow.push({ a: x, b: y, reason: 'name', detail: n, confidence: 'low' });
      }
    }
  }

  return { phonePatches, unresolvable, autoMerges, queueMedium, queueLow };
}
