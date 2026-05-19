// Global cache object
if (!global.playlistCache) {
  global.playlistCache = { data: null, expiry: 0 };
}

export default async function handler(req, res) {
  // Basic Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'text/plain'); // Invalid response se bachne ke liye plain text rakha hai

  const currentTime = Date.now();
  const CACHE_DURATION = 12 * 60 * 60 * 1000;

  // Manual Clear
  if (req.query.clear === 'true') {
    global.playlistCache.data = null;
    global.playlistCache.expiry = 0;
  }

  // 1. Cache Check
  if (global.playlistCache.data && currentTime < global.playlistCache.expiry) {
    return res.status(200).send(global.playlistCache.data);
  }

  try {
    const m3uUrl = "https://server.vodep39240327.workers.dev/channel/raw?=m3u";
    
    // Simple fetch bina kisi complex signal ke
    const response = await fetch(m3uUrl);
    if (!response.ok) throw new Error("Source Server Down");

    const rawText = await response.text();
    if (!rawText.includes("#EXTINF")) throw new Error("Invalid Playlist Data");

    // 2. Marker Logic
    const startMarker = "OTT | TP";
    const startIdx = rawText.indexOf(startMarker);
    let section = rawText;

    if (startIdx !== -1) {
      // Naye markers check karo
      let endIdx = rawText.indexOf("=== Other Channels", startIdx);
      if (endIdx === -1) endIdx = rawText.indexOf("-------===", startIdx);
      if (endIdx === -1) endIdx = rawText.indexOf("===", startIdx + 10);
      
      if (endIdx !== -1) {
        section = rawText.substring(startIdx, endIdx);
      } else {
        section = rawText.substring(startIdx);
      }
    }

    const blocks = section.split("#EXTINF:").slice(1);
    let channelsList = [];

    for (const block of blocks) {
      const lines = ("#EXTINF:" + block).split("\n").map(l => l.trim()).filter(l => l !== "");
      const infoLine = lines.find(l => l.startsWith("#EXTINF:"));
      const streamUrl = lines.find(l => l.startsWith("http"));
      if (!streamUrl || !infoLine) continue;

      const logoMatch = infoLine.match(/tvg-logo="([^"]+)"/);
      const groupMatch = infoLine.match(/group-title="([^"]+)"/);
      const name = infoLine.split(",").pop().trim();

      channelsList.push({
        logo: logoMatch ? logoMatch[1] : "",
        group: (groupMatch ? groupMatch[1] : "").replace("TATA PLAY ▶ | ", "").trim(),
        name,
        streamUrl,
        originalLicenseType: lines.find(l => l.includes("license_type=")),
        originalLicenseKey: lines.find(l => l.includes("license_key=")),
        extraHeaders: lines.filter(l => l.startsWith("#EXTVLCOPT:") || l.startsWith("#EXTHTTP:"))
      });
    }

    // 3. License Shifting
    if (channelsList.length > 1) {
      for (let i = 0; i < channelsList.length - 1; i++) {
        channelsList[i + 1].finalLicenseType = channelsList[i].originalLicenseType;
        channelsList[i + 1].finalLicenseKey = channelsList[i].originalLicenseKey;
      }
      channelsList.shift();
    }

    // 4. M3U Generation
    const host = req.headers.host;
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    let m3u = "#EXTM3U\n\n";

    for (const ch of channelsList) {
      m3u += `#EXTINF:-1 tvg-logo="${ch.logo}" group-title="${ch.group === 'Spor' ? 'Sports' : ch.group}", ${ch.name}\n`;
      
      if (ch.finalLicenseKey && ch.finalLicenseKey.includes("http")) {
        const urlMatch = ch.finalLicenseKey.match(/https?:\/\/[^\s"]+/);
        if (urlMatch) {
          const proxyUrl = `${protocol}://${host}/api/license?url=${encodeURIComponent(urlMatch[0])}`;
          m3u += `#EXTVLCOPT:license_type=clearkey\n${ch.finalLicenseKey.replace(urlMatch[0], proxyUrl)}\n`;
        }
      } else {
        if (ch.finalLicenseType) m3u += `${ch.finalLicenseType}\n`;
        if (ch.finalLicenseKey) m3u += `${ch.finalLicenseKey}\n`;
      }
      ch.extraHeaders.forEach(h => { m3u += `${h}\n`; });
      m3u += `${ch.streamUrl}\n\n`;
    }

    // Cache save
    global.playlistCache.data = m3u;
    global.playlistCache.expiry = currentTime + CACHE_DURATION;

    res.setHeader('Content-Type', 'application/mpegurl');
    return res.status(200).send(m3u);

  } catch (e) {
    console.error(e);
    // Fallback if cache exists
    if (global.playlistCache.data) {
      res.setHeader('Content-Type', 'application/mpegurl');
      return res.status(200).send(global.playlistCache.data);
    }
    return res.status(500).send("Error: " + e.message);
  }
}
