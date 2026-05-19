// Global cache object jo server restart hone tak memory me rehta hai
if (!global.playlistCache) {
  global.playlistCache = {
    data: null,
    expiry: 0
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/mpegurl');
  res.setHeader('Cache-Control', 'no-store'); 

  const currentTime = Date.now();
  const CACHE_DURATION = 12 * 60 * 60 * 1000; // 12 Hours

  // URL query check to force clear cache (e.g., /api/playlist?clear=true)
  const { clear } = req.query;
  if (clear === 'true') {
    console.log("Force clearing cache via URL param!");
    global.playlistCache.data = null;
    global.playlistCache.expiry = 0;
  }

  // 1. Check karo agar strictly valid cache padi hai
  if (global.playlistCache.data && currentTime < global.playlistCache.expiry) {
    // Ek aur check: m3u data sahi hona chahiye, koi chota error text cache nahi hona chahiye
    if (global.playlistCache.data.includes("#EXTM3U") && global.playlistCache.data.length > 500) {
      console.log("Serving Playlist from Fresh Cache!");
      return res.status(200).send(global.playlistCache.data);
    }
  }

  try {
    console.log("Fetching fresh playlist from source...");
    const m3uUrl = "https://server.vodep39240327.workers.dev/channel/raw?=m3u";
    
    const response = await fetch(m3uUrl, { signal: AbortSignal.timeout(8000) });
    
    if (!response.ok) {
      throw new Error(`Source server responded with status: ${response.status}`);
    }
    
    const rawText = await response.text();

    if (!rawText || rawText.trim() === "") {
      throw new Error("Received empty response from source server.");
    }

    if (rawText.includes("error code:") || rawText.includes("1027") || rawText.includes("Cloudflare")) {
      throw new Error("Cloudflare Rate Limit Error or Blocking page detected.");
    }

    // 2. NEW ROBUST MARKER LOGIC (Naye markers ke hisab se)
    const startMarker = "OTT | TP";
    const startIdx = rawText.indexOf(startMarker);
    
    let section = rawText;
    
    if (startIdx !== -1) {
      // Hum naye aur purane dono end markers ko check kar rahe hain safety ke liye
      let endIdx = rawText.indexOf("=== Other Channels", startIdx);
      if (endIdx === -1) endIdx = rawText.indexOf("-------===", startIdx);
      if (endIdx === -1) endIdx = rawText.indexOf("===", startIdx + startMarker.length); // Fallback to just ===

      if (endIdx !== -1) {
        section = rawText.substring(startIdx, endIdx);
      } else {
        // Agar koi bhi end marker na mile toh startMarker se lekar poori file ke end tak le lo
        section = rawText.substring(startIdx);
      }
    } else if (!rawText.includes("#EXTINF:")) {
      throw new Error("Valid M3U structure or Start Marker not found in source text.");
    }

    const blocks = section.split("#EXTINF:").slice(1);
    let channelsList = [];

    for (const block of blocks) {
      const lines = ("#EXTINF:" + block).split("\n").map(l => l.trim()).filter(l => l !== "");
      
      const infoLine = lines.find(l => l.startsWith("#EXTINF:"));
      const streamUrl = lines.find(l => l.startsWith("http"));
      const licenseKey = lines.find(l => l.includes("license_key="));
      const licenseType = lines.find(l => l.includes("license_type="));

      if (!streamUrl || !infoLine) continue;

      const logoMatch = infoLine.match(/tvg-logo="([^"]+)"/);
      const groupMatch = infoLine.match(/group-title="([^"]+)"/);
      const logo = logoMatch ? logoMatch[1] : "";
      
      let group = groupMatch ? groupMatch[1] : "";
      group = group.replace("TATA PLAY ▶ | ", "").trim();
      
      if (group === "Spor") {
        group = "Sports";
      }

      const name = infoLine.split(",").pop().trim();

      let extraHeaders = [];
      lines.forEach(l => {
        if (l.startsWith("#EXTVLCOPT:") || l.startsWith("#EXTHTTP:")) {
          extraHeaders.push(l);
        }
      });

      channelsList.push({
        logo, group, name, streamUrl, extraHeaders,
        originalLicenseType: licenseType || null,
        originalLicenseKey: licenseKey || null,
        finalLicenseType: null, finalLicenseKey: null
      });
    }

    // --- LICENSE SHIFTING LOGIC ---
    if (channelsList.length > 1) {
      for (let i = 0; i < channelsList.length - 1; i++) {
        channelsList[i + 1].finalLicenseType = channelsList[i].originalLicenseType;
        channelsList[i + 1].finalLicenseKey = channelsList[i].originalLicenseKey;
      }
      channelsList.shift();
    }

    if (channelsList.length === 0) {
      throw new Error("No channels successfully parsed from the text.");
    }

    const host = req.headers.host;
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const serverUrl = `${protocol}://${host}`;

    let m3u = "#EXTM3U\n\n";

    for (const ch of channelsList) {
      m3u += `#EXTINF:-1 tvg-logo="${ch.logo}" group-title="${ch.group}", ${ch.name}\n`;
      
      if (ch.finalLicenseKey && ch.finalLicenseKey.includes("http")) {
        const urlMatch = ch.finalLicenseKey.match(/https?:\/\/[^\s"]+/);
        if (urlMatch) {
          const originalUrl = urlMatch[0];
          const proxyLicenseUrl = `${serverUrl}/api/license?url=${encodeURIComponent(originalUrl)}`;
          
          m3u += `#EXTVLCOPT:license_type=clearkey\n`;
          m3u += `${ch.finalLicenseKey.replace(originalUrl, proxyLicenseUrl)}\n`;
        }
      } else {
        if (ch.finalLicenseType) m3u += `${ch.finalLicenseType}\n`;
        if (ch.finalLicenseKey) m3u += `${ch.finalLicenseKey}\n`;
      }

      ch.extraHeaders.forEach(h => {
        m3u += `${h}\n`;
      });

      m3u += `${ch.streamUrl}\n\n`;
    }

    // Sahi data ko hi cache me daalein
    global.playlistCache.data = m3u;
    global.playlistCache.expiry = currentTime + CACHE_DURATION;

    console.log("Cache refreshed successfully!");
    return res.status(200).send(m3u);

  } catch (e) {
    console.error("Error fetching fresh data:", e.message);

    // Agar kharab data cache hua tha, toh use clear kar do taaki agli request fresh try kare
    if (global.playlistCache.data && (!global.playlistCache.data.includes("#EXTM3U") || global.playlistCache.data.length < 500)) {
      global.playlistCache.data = null;
      global.playlistCache.expiry = 0;
    }

    // Smart Fallback
    if (global.playlistCache.data) {
      console.log("Serving expired cache as fallback.");
      global.playlistCache.expiry = Date.now() + (5 * 60 * 1000); 
      return res.status(200).send(global.playlistCache.data);
    }

    return res.status(500).send("Server Error: " + e.message);
  }
}
