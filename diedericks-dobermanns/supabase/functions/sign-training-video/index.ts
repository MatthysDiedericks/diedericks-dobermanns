import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BUCKET = 'training-videos';
const PLAY_TTL = 2 * 60 * 60;
const THUMB_TTL = 60 * 60;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

function objectPath(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const v = raw.trim();
  if (!v) return null;
  if (!v.startsWith('http')) return v;
  const marks = [
    `/object/public/${BUCKET}/`,
    `/object/sign/${BUCKET}/`,
    `/object/authenticated/${BUCKET}/`,
  ];
  for (const mark of marks) {
    const idx = v.indexOf(mark);
    if (idx >= 0) return v.slice(idx + mark.length).split('?')[0] || null;
  }
  return v;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const url = Deno.env.get('SUPABASE_URL');
  const anon = Deno.env.get('SUPABASE_ANON_KEY');
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !anon || !service) return json({ error: 'Not configured' }, 500);

  const auth = req.headers.get('Authorization') ?? '';
  const userClient = createClient(url, anon, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const admin = createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const body = (await req.json()) as {
      videoId?: string;
      purpose?: 'play' | 'thumb';
      videoIds?: string[];
    };
    const purpose = body.purpose === 'thumb' ? 'thumb' : 'play';

    if (purpose === 'thumb' && Array.isArray(body.videoIds) && body.videoIds.length) {
      const { data: rows, error } = await userClient
        .from('training_videos')
        .select('id, thumbnail_url')
        .in('id', body.videoIds.slice(0, 40));
      if (error) return json({ error: error.message }, 400);
      const thumbs: Record<string, string> = {};
      for (const row of rows ?? []) {
        const path = objectPath(row.thumbnail_url);
        if (!path) continue;
        const signed = await admin.storage.from(BUCKET).createSignedUrl(path, THUMB_TTL);
        if (signed.data?.signedUrl) thumbs[row.id] = signed.data.signedUrl;
      }
      return json({ thumbs });
    }

    if (!body.videoId) return json({ error: 'videoId is required' }, 400);

    if (purpose === 'play') {
      const { data: allowed, error } = await userClient.rpc('client_can_watch_training_video', {
        p_video_id: body.videoId,
      });
      if (error) return json({ error: error.message }, 400);
      if (!allowed) return json({ error: 'Access denied' }, 403);
    }

    const { data: row, error: rowError } = await userClient
      .from('training_videos')
      .select('video_url, thumbnail_url')
      .eq('id', body.videoId)
      .maybeSingle();
    if (rowError || !row) return json({ error: 'Not found' }, 404);

    const path = objectPath(purpose === 'play' ? row.video_url : row.thumbnail_url);
    if (!path) return json({ error: 'No file' }, 404);
    const signed = await admin.storage
      .from(BUCKET)
      .createSignedUrl(path, purpose === 'play' ? PLAY_TTL : THUMB_TTL);
    if (signed.error || !signed.data?.signedUrl) {
      return json({ error: signed.error?.message ?? 'Sign failed' }, 500);
    }
    return json({ url: signed.data.signedUrl });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Sign failed' }, 500);
  }
});
