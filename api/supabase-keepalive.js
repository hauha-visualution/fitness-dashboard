/* global process */

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

export default async function handler(_req, res) {
  if (!supabaseUrl || !supabaseAnonKey) {
    res.status(500).json({
      ok: false,
      error: 'Missing SUPABASE_URL/SUPABASE_ANON_KEY or VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY.',
    });
    return;
  }

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/clients?select=id&limit=1`, {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
    });

    const body = await response.text();

    res.status(response.ok ? 200 : 502).json({
      ok: response.ok,
      supabaseStatus: response.status,
      checkedAt: new Date().toISOString(),
      preview: body.slice(0, 160),
    });
  } catch (error) {
    res.status(502).json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      checkedAt: new Date().toISOString(),
    });
  }
}
