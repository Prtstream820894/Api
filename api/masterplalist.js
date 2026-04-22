import crypto from 'crypto';

export default async function handler(req, res) {
  try {
    const { device, ts, sig, m3u } = req.query;
    const SECRET = "PRT_STREAM_SECRET_2026_CHANGE_THIS"; // Isse change kar dena

    // 1. Parameter check
    if (!device || !ts || !sig || !m3u) {
      return res.status(403).send("Missing parameters");
    }

    // 2. Signature verify
    const expectedSig = crypto
      .createHash('sha256')
      .update(device + ts + SECRET + m3u)
      .digest('hex');

    if (sig !== expectedSig) {
      return res.status(403).send("Invalid signature");
    }

    // 3. Expiry check - 2 minute
    const now = Date.now();
    const requestTime = parseInt(ts);
    if (isNaN(requestTime) || now - requestTime > 120000) {
      return res.status(403).send("Link expired");
    }

    // 4. User ka M3U fetch karo
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 7000);
    
    let userM3UData = "";
    try {
      const response = await fetch(m3u, {
        signal: controller.signal,
        headers: { "User-Agent": "PRTStream/1.0" }
      });
      if (response.ok) userM3UData = await response.text();
    } catch (err) {
      return res.status(500).send("User playlist failed");
    } finally {
      clearTimeout(id);
    }

    if (!userM3UData) {
      return res.status(500).send("Empty playlist");
    }

    // 5. Proxy inject karo - taki .ts link bhi secure rahe
    const proxyBase = `https://${req.headers.host}/api/proxy`;
    const modifiedM3U = userM3UData.replace(/^(https?:\/\/[^\s]+)/gm, (match) => {
      if (match.includes('.m3u8') || match.includes('.ts') || match.includes('.mp4')) {
        return `${proxyBase}?url=${encodeURIComponent(match)}&device=${device}&ts=${now}`;
      }
      return match;
    });

    // 6. No-cache headers
    res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    res.status(200).send(modifiedM3U);

  } catch (error) {
    res.status(500).send("Server Error");
  }
}