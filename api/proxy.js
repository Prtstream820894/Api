export default async function handler(req, res) {
  try {
    let target = req.query.url;

    if (!target) {
      return res.status(400).send("Missing URL");
    }

    if (!target.startsWith("http")) {
      target = "https://" + target;
    }

    const urlObj = new URL(target);
    const base = urlObj.origin;

    const response = await fetch(target, {
      headers: {
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "referer": base,
        "origin": base,
      },
    });

    const contentType = response.headers.get("content-type") || "";

    // 🔥 HTML handling
    if (contentType.includes("text/html")) {
      let html = await response.text();

      // Base tag add takis relative URLs correct base se load hon
      html = html.replace(/<head>/i, `<head><base href="${base}/">`);

      // 1. Rewrite ALL href attributes (Single & Double quotes)
      html = html.replace(/href=["'](.*?)["']/gi, (match, p1) => {
        if (p1.startsWith('#') || p1.startsWith('javascript:')) return match;
        try {
          const newUrl = new URL(p1, target).href;
          return `href="/api/proxy?url=${encodeURIComponent(newUrl)}"`;
        } catch { return match; }
      });

      // 2. Rewrite ALL src attributes (Single & Double quotes) - Fixes standard Images/Scripts
      html = html.replace(/src=["'](.*?)["']/gi, (match, p1) => {
        try {
          const newUrl = new URL(p1, target).href;
          return `src="/api/proxy?url=${encodeURIComponent(newUrl)}"`;
        } catch { return match; }
      });

      // 3. Rewrite data-src & srcset (Modern lazy-loaded images fix)
      html = html.replace(/(data-src|srcset)=["'](.*?)["']/gi, (match, attr, p1) => {
        try {
          // Agar srcset me multiple images hain comma-separated
          if (attr === 'srcset') {
            const parts = p1.split(',').map(part => {
              const [url, size] = part.trim().split(/\s+/);
              const newUrl = new URL(url, target).href;
              return `/api/proxy?url=${encodeURIComponent(newUrl)} ${size || ''}`.trim();
            });
            return `srcset="${parts.join(', ')}"`;
          }
          const newUrl = new URL(p1, target).href;
          return `${attr}="/api/proxy?url=${encodeURIComponent(newUrl)}"`;
        } catch { return match; }
      });

      res.setHeader("Content-Type", "text/html");
      return res.status(200).send(html);
    }

    // 🔥 Other files (css/js/images)
    const buffer = await response.arrayBuffer();
    res.setHeader("Content-Type", contentType);
    // Cache standard assets for speed improvement
    res.setHeader("Cache-Control", "public, max-age=86400"); 

    return res.status(200).send(Buffer.from(buffer));

  } catch (err) {
    return res.status(500).send("Proxy Error: " + err.toString());
  }
}
