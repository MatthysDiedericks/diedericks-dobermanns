import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

function md5Hash(str: string): string {
  function cmn(q: number, a: number, b: number, x: number, s: number, t: number) {
    a = (a + q + x + t) | 0;
    return (((a << s) | (a >>> (32 - s))) + b) | 0;
  }
  function ff(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn((b & c) | (~b & d), a, b, x, s, t);
  }
  function gg(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn((b & d) | (c & ~d), a, b, x, s, t);
  }
  function hh(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn(b ^ c ^ d, a, b, x, s, t);
  }
  function ii(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn(c ^ (b | ~d), a, b, x, s, t);
  }
  function md5cycle(x: number[], k: number[]) {
    let a = x[0], b = x[1], c = x[2], d = x[3];
    a = ff(a, b, c, d, k[0], 7, -680876936); d = ff(d, a, b, c, k[1], 12, -389564586);
    c = ff(c, d, a, b, k[2], 17, 606105819); b = ff(b, c, d, a, k[3], 22, -1044525330);
    a = ff(a, b, c, d, k[4], 7, -176418897); d = ff(d, a, b, c, k[5], 12, 1200080426);
    c = ff(c, d, a, b, k[6], 17, -1473231341); b = ff(b, c, d, a, k[7], 22, -45705983);
    a = ff(a, b, c, d, k[8], 7, 1770035416); d = ff(d, a, b, c, k[9], 12, -1958414417);
    c = ff(c, d, a, b, k[10], 17, -42063); b = ff(b, c, d, a, k[11], 22, -1990404162);
    a = ff(a, b, c, d, k[12], 7, 1804603682); d = ff(d, a, b, c, k[13], 12, -40341101);
    c = ff(c, d, a, b, k[14], 17, -1502002290); b = ff(b, c, d, a, k[15], 22, 1236535329);
    a = gg(a, b, c, d, k[1], 5, -165796510); d = gg(d, a, b, c, k[6], 9, -1069501632);
    c = gg(c, d, a, b, k[11], 14, 643717713); b = gg(b, c, d, a, k[0], 20, -373897302);
    a = gg(a, b, c, d, k[5], 5, -701558691); d = gg(d, a, b, c, k[10], 9, 38016083);
    c = gg(c, d, a, b, k[15], 14, -660478335); b = gg(b, c, d, a, k[4], 20, -405537848);
    a = gg(a, b, c, d, k[9], 5, 568446438); d = gg(d, a, b, c, k[14], 9, -1019803690);
    c = gg(c, d, a, b, k[3], 14, -187363961); b = gg(b, c, d, a, k[8], 20, 1163531501);
    a = gg(a, b, c, d, k[13], 5, -1444681467); d = gg(d, a, b, c, k[2], 9, -51403784);
    c = gg(c, d, a, b, k[7], 14, 1735328473); b = gg(b, c, d, a, k[12], 20, -1926607734);
    a = hh(a, b, c, d, k[5], 4, -378558); d = hh(d, a, b, c, k[8], 11, -2022574463);
    c = hh(c, d, a, b, k[11], 16, 1839030562); b = hh(b, c, d, a, k[14], 23, -35309556);
    a = hh(a, b, c, d, k[1], 4, -1530992060); d = hh(d, a, b, c, k[4], 11, 1272893353);
    c = hh(c, d, a, b, k[7], 16, -155497632); b = hh(b, c, d, a, k[10], 23, -1094730640);
    a = hh(a, b, c, d, k[13], 4, 681279174); d = hh(d, a, b, c, k[0], 11, -358537222);
    c = hh(c, d, a, b, k[3], 16, -722521979); b = hh(b, c, d, a, k[6], 23, 76029189);
    a = hh(a, b, c, d, k[9], 4, -640364487); d = hh(d, a, b, c, k[12], 11, -421815835);
    c = hh(c, d, a, b, k[15], 16, 530742520); b = hh(b, c, d, a, k[2], 23, -995338651);
    a = ii(a, b, c, d, k[0], 6, -198630844); d = ii(d, a, b, c, k[7], 10, 1126891415);
    c = ii(c, d, a, b, k[14], 15, -1416354905); b = ii(b, c, d, a, k[5], 21, -57434055);
    a = ii(a, b, c, d, k[12], 6, 1700485571); d = ii(d, a, b, c, k[3], 10, -1894986606);
    c = ii(c, d, a, b, k[10], 15, -1051523); b = ii(b, c, d, a, k[1], 21, -2054922799);
    a = ii(a, b, c, d, k[8], 6, 1873313359); d = ii(d, a, b, c, k[15], 10, -30611744);
    c = ii(c, d, a, b, k[6], 15, -1560198380); b = ii(b, c, d, a, k[13], 21, 1309151649);
    a = ii(a, b, c, d, k[4], 6, -145523070); d = ii(d, a, b, c, k[11], 10, -1120210379);
    c = ii(c, d, a, b, k[2], 15, 718787259); b = ii(b, c, d, a, k[9], 21, -343485551);
    x[0] = (a + x[0]) | 0; x[1] = (b + x[1]) | 0; x[2] = (c + x[2]) | 0; x[3] = (d + x[3]) | 0;
  }
  function md5blk(s: string) {
    const md5blks: number[] = [];
    for (let i = 0; i < 64; i += 4) {
      md5blks[i >> 2] =
        s.charCodeAt(i) +
        (s.charCodeAt(i + 1) << 8) +
        (s.charCodeAt(i + 2) << 16) +
        (s.charCodeAt(i + 3) << 24);
    }
    return md5blks;
  }
  const x = [1732584193, -271733879, -1732584194, 271733878];
  let i: number;
  for (i = 64; i <= str.length; i += 64) {
    md5cycle(x, md5blk(str.substring(i - 64, i)));
  }
  str = str.substring(i - 64);
  const tail = new Array(16).fill(0);
  for (i = 0; i < str.length; i++) tail[i >> 2] |= str.charCodeAt(i) << ((i % 4) << 3);
  tail[i >> 2] |= 0x80 << ((i % 4) << 3);
  if (i > 55) {
    md5cycle(x, tail);
    tail.fill(0);
  }
  tail[14] = str.length * 8;
  md5cycle(x, tail);
  return x
    .map((n) => {
      const hex = (n >>> 0).toString(16);
      return '00000000'.slice(hex.length) + hex;
    })
    .join('');
}

function paramString(fields: Record<string, string>): string {
  return Object.keys(fields)
    .filter((k) => fields[k]?.trim())
    .sort()
    .map((k) => `${k}=${encodeURIComponent(fields[k].trim()).replace(/%20/g, '+')}`)
    .join('&');
}

function sign(fields: Record<string, string>, passphrase: string): string {
  let base = paramString(fields);
  if (passphrase) base += `&passphrase=${encodeURIComponent(passphrase.trim())}`;
  return md5Hash(base);
}

interface PaymentRequest {
  orderType: 'video_bundle' | 'deposit' | 'invoice';
  referenceId: string;
  amount: number;
  itemName: string;
  itemDescription?: string;
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const body = (await req.json()) as PaymentRequest;
  const merchantId = Deno.env.get('PAYFAST_MERCHANT_ID') ?? '';
  const merchantKey = Deno.env.get('PAYFAST_MERCHANT_KEY') ?? '';
  const passphrase = Deno.env.get('PAYFAST_PASSPHRASE') ?? '';
  const sandbox = Deno.env.get('PAYFAST_SANDBOX') !== 'false';
  const siteUrl = Deno.env.get('SITE_URL') ?? 'https://www.diedericksdobermanns.com';
  const functionsUrl = Deno.env.get('SUPABASE_URL')!.replace(
    'https://',
    'https://',
  ) + '/functions/v1';

  if (!merchantId || !merchantKey) {
    return new Response(JSON.stringify({ error: 'PayFast not configured' }), { status: 503 });
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const mPaymentId = `DD-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const amount = body.amount.toFixed(2);
  const notifyUrl = `${functionsUrl}/payfast-itn`;

  const { data: order, error: orderError } = await admin
    .from('payment_orders')
    .insert({
      client_id: userData.user.id,
      order_type: body.orderType,
      reference_id: body.referenceId,
      amount: body.amount,
      m_payment_id: mPaymentId,
      item_name: body.itemName,
      return_url: `${siteUrl}/payment/success`,
      cancel_url: `${siteUrl}/payment/cancelled`,
      notify_url: notifyUrl,
      status: 'pending',
    })
    .select('id')
    .single();

  if (orderError || !order) {
    return new Response(JSON.stringify({ error: orderError?.message ?? 'Order failed' }), {
      status: 500,
    });
  }

  const fields: Record<string, string> = {
    merchant_id: merchantId,
    merchant_key: merchantKey,
    return_url: `${siteUrl}/payment/success?ref=${mPaymentId}`,
    cancel_url: `${siteUrl}/payment/cancelled`,
    notify_url: notifyUrl,
    name_first: userData.user.user_metadata?.full_name?.split(' ')[0] ?? 'Client',
    email_address: userData.user.email ?? '',
    m_payment_id: mPaymentId,
    amount,
    item_name: body.itemName,
    custom_str1: body.orderType,
    custom_str2: body.referenceId,
  };
  if (body.itemDescription) fields.item_description = body.itemDescription;
  fields.signature = sign(fields, passphrase);

  const actionUrl = sandbox
    ? 'https://sandbox.payfast.co.za/eng/process'
    : 'https://www.payfast.co.za/eng/process';

  const inputs = Object.entries(fields)
    .map(
      ([k, v]) =>
        `<input type="hidden" name="${k}" value="${v.replace(/"/g, '&quot;')}" />`,
    )
    .join('\n');

  const html = `<!DOCTYPE html><html><body onload="document.forms[0].submit()">
    <form method="post" action="${actionUrl}">${inputs}</form>
    <p>Redirecting to PayFast…</p></body></html>`;

  return new Response(
    JSON.stringify({ html, mPaymentId, actionUrl, orderId: order.id }),
    { headers: { 'Content-Type': 'application/json' } },
  );
});
