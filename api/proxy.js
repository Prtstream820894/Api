export const config = {
  runtime: 'edge', // Edge pe chala, 5x fast
};

export default async function handler(req) {
  try {
    const { searchParams } = new URL(req.url);
    let target = searchParams.get('url');
    
    if (!target) return new Response('Missing URL', { status: 400 });
    if (!target.startsWith('http')) target = 'https://' + target;

    const urlObj = new URL(target);
    const base = urlObj.origin;

    const response = await fetch(target, {
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36',
        'referer': base,
        'accept-encoding': 'gzip, deflate, br', // Compression on
      },
      // Timeout fix
      signal: AbortSignal.timeout(25000),
    });

    const contentType = response.headers.get('content-type') || '';

    // 🔥 1. CDN Cache add kar de - 100x fast ho jayega repeat requests
    const headers = new Headers(response.headers);
    headers.set('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=43200'); // 1 day cache
    headers.set('CDN-Cache-Control', 'public, s-maxage=86400');
    headers.delete('set-cookie'); // Cache ke liye cookie hata de

    // 🔥 2. HTML ke liye streaming + light rewrite
    if (contentType.includes('text/html')) {
      let html = await response.text();
      html = html.replace(/<head>/i, `<head><base href="${base}/">`);
      
      // Sirf zaroori attributes - regex heavy hai
      html = html.replace(/(src|href)="(.*?)"/gi, (match, attr, p1) => {
        if (p1.startsWith('data:') || p1.startsWith('#') || p1.startsWith('javascript:')) return match;
        try {
          const newUrl = new URL(p1, target).href;
          return `${attr}="/api/proxy?url=${encodeURIComponent(newUrl)}"`;
        } catch { return match; }
      });

      headers.set('Content-Type', 'text/html; charset=utf-8');
      return new Response(html, { status: 200, headers });
    }

    // 🔥 3. Binary files - stream kar, buffer mat bana
    return new Response(response.body, {
      status: response.status,
      headers,
    });

  } catch (err) {
    return new Response('Proxy Error: ' + err.toString(), { status: 500 });
  }
}