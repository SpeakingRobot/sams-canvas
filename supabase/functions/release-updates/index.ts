const OWNER = 'speakingrobot';
const REPO = 'sams-canvas';
const GH_API = `https://api.github.com/repos/${OWNER}/${REPO}`;

const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
});

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, range',
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  };
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders() });
  if (!['GET', 'HEAD'].includes(request.method)) return json({ error: 'Method not allowed' }, 405);

  const projectUrl = Deno.env.get('SUPABASE_URL');
  const publicKey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY');
  const githubToken = Deno.env.get('GITHUB_RELEASE_TOKEN');
  const authorization = request.headers.get('Authorization');
  if (!projectUrl || !publicKey || !githubToken) return json({ error: 'Release update service is not configured.' }, 503);
  if (!authorization?.startsWith('Bearer ')) return json({ error: 'Sign in to access private releases.' }, 401);

  // Confirm the bearer is a real, active user session before serving private release data.
  const userResponse = await fetch(`${projectUrl}/auth/v1/user`, {
    headers: { apikey: publicKey, Authorization: authorization },
  });
  if (!userResponse.ok) return json({ error: 'Your session expired. Sign in again to check for updates.' }, 401);

  const url = new URL(request.url);
  const functionRoot = new URL('/functions/v1/release-updates/', projectUrl);
  const path = url.pathname.slice(new URL('/functions/v1/release-updates', projectUrl).pathname.length).replace(/^\/+/, '');
  const ghHeaders = {
    Authorization: `Bearer ${githubToken}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'Sams-Canvas-Updater',
  };

  try {
    if (path === 'release-notes') {
      const releasesResponse = await fetch(`${GH_API}/releases?per_page=30`, { headers: ghHeaders });
      if (!releasesResponse.ok) return json({ error: `GitHub release lookup failed (${releasesResponse.status}).` }, 502);
      const releases = await releasesResponse.json();
      const release = releases.find((item: any) => !item.draft && item.assets?.some((asset: any) => asset.name === 'latest.yml'));
      if (!release) return json({ error: 'No desktop update is published yet.' }, 404);
      return json({
        version: String(release.tag_name || '').replace(/^v/, ''),
        name: release.name || release.tag_name,
        body: release.body || '',
        published_at: release.published_at,
        html_url: release.html_url,
      });
    }

    if (path === 'latest.yml') {
      const releasesResponse = await fetch(`${GH_API}/releases?per_page=30`, { headers: ghHeaders });
      if (!releasesResponse.ok) return new Response('GitHub release lookup failed.', { status: 502 });
      const releases = await releasesResponse.json();
      const release = releases.find((item: any) => !item.draft && item.assets?.some((asset: any) => asset.name === 'latest.yml'));
      if (!release) return new Response('No desktop update is published yet.', { status: 404 });
      const tag = encodeURIComponent(release.tag_name);
      let yaml = await (await fetch(release.assets.find((asset: any) => asset.name === 'latest.yml').url, {
        headers: { ...ghHeaders, Accept: 'application/octet-stream' },
      })).text();
      yaml = yaml.replace(/^(\s*(?:url|path):\s*)["']?([^\s"']+)["']?\s*$/gm, (_match, prefix, filename) => `${prefix}${new URL(`asset/${tag}/${encodeURIComponent(filename)}`, functionRoot).href}`);
      return new Response(yaml, {
        headers: { ...corsHeaders(), 'Content-Type': 'text/yaml; charset=utf-8', 'Cache-Control': 'no-store' },
      });
    }

    const assetMatch = path.match(/^asset\/([^/]+)\/(.+)$/);
    if (assetMatch) {
      const tag = decodeURIComponent(assetMatch[1]);
      const filename = decodeURIComponent(assetMatch[2]);
      const releaseResponse = await fetch(`${GH_API}/releases/tags/${encodeURIComponent(tag)}`, { headers: ghHeaders });
      if (!releaseResponse.ok) return new Response('Release not found.', { status: 404 });
      const release = await releaseResponse.json();
      const asset = release.assets?.find((item: any) => item.name === filename);
      if (!asset) return new Response('Release asset not found.', { status: 404 });
      const headers: Record<string, string> = { ...ghHeaders, Accept: 'application/octet-stream' };
      const range = request.headers.get('Range');
      if (range) headers['Range'] = range;
      const assetResponse = await fetch(asset.url, { headers, redirect: 'follow' });
      if (!assetResponse.ok && assetResponse.status !== 206) return new Response('Could not download the release asset.', { status: 502 });
      const responseHeaders = new Headers(corsHeaders());
      responseHeaders.set('Content-Type', assetResponse.headers.get('Content-Type') || 'application/octet-stream');
      responseHeaders.set('Content-Disposition', `attachment; filename="${filename.replace(/["\\\r\n]/g, '_')}"`);
      responseHeaders.set('Cache-Control', 'private, no-store');
      for (const name of ['content-length', 'content-range', 'accept-ranges']) {
        const value = assetResponse.headers.get(name);
        if (value) responseHeaders.set(name, value);
      }
      return new Response(request.method === 'HEAD' ? null : assetResponse.body, { status: assetResponse.status, headers: responseHeaders });
    }

    return json({ error: 'Unknown updater route.' }, 404);
  } catch (error) {
    console.error('release-updates error', error);
    return json({ error: 'The private release service is temporarily unavailable.' }, 502);
  }
});
