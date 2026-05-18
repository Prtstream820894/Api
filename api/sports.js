export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Content-Type', 'application/mpegurl');

  // Vercel isko 24 ghante (86400 seconds) ke liye khud save (cache) rakhega
  res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=3600');

  try {
    const m3uUrl = "https://server.vodep39240327.workers.dev/channel/raw?=m3u";
    const m3uResponse = await fetch(m3uUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
    });

    if (!m3uResponse.ok) throw new Error("Source M3U fetch failed");
    const rawText = await m3uResponse.text();

    const startMarker = "OTT | TP";
    const endMarker = "-------===";
    const startIndex = rawText.indexOf(startMarker);
    const endIndex = rawText.indexOf(endMarker, startIndex);

    if (startIndex === -1 || endIndex === -1) {
      return res.status(404).send("#EXTM3U\n#ERROR: Section not found");
    }

    const targetSection = rawText.substring(startIndex, endIndex);
    const rawChannels = targetSection.split("#EXTINF:");
    let finalPlaylist = "#EXTM3U\n\n";

    const channelPromises = rawChannels.slice(1).map(async (channelBlock) => {
      const lines = ("#EXTINF:" + channelBlock).split("\n").map(l => l.trim()).filter(l => l);

      let extinfLine = "";
      let licenseUrl = "";
      let extvlcoptLine = "";
      let exthttpLine = "";
      let streamUrl = "";

      lines.forEach(line => {
        if (line.startsWith("#EXTINF:")) extinfLine = line;
        else if (line.startsWith("#KODIPROP:inputstream.adaptive.license_key=")) {
          licenseUrl = line.replace("#KODIPROP:inputstream.adaptive.license_key=", "").trim();
        }
        else if (line.startsWith("#EXTVLCOPT:")) extvlcoptLine = line;
        else if (line.startsWith("#EXTHTTP:")) exthttpLine = line;
        else if (line.startsWith("http")) streamUrl = line;
      });

      if (!streamUrl) return null;

      let channelName = extinfLine.split(",").pop() || "Unknown Channel";
      channelName = channelName.trim();

      // License fetch aur Clearkey format (kid:k) banana
      let clearkeyPair = "";
      if (licenseUrl && licenseUrl.startsWith("http")) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout

          const licenseRes = await fetch(licenseUrl, {
            signal: controller.signal,
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
              "Accept": "application/json"
            }
          });
          clearTimeout(timeoutId);

          if (licenseRes.ok) {
            const json = await licenseRes.json();
            if (json.keys && json.keys[0]) {
              clearkeyPair = `${json.keys[0].kid}:${json.keys[0].k}`;
            }
          }
        } catch (e) {
          console.error("License fetch failed for: " + channelName);
        }
      }

      // Aapka bataya naya clean format
      let outputChunk = `#EXTINF:-1 tvg-logo="https://project-lc4mz.vercel.app/api/img" group-title="Sports", ${channelName}\n`;
      outputChunk += `#KODIPROP:inputstream.adaptive.license_type=clearkey\n`;
      if (clearkeyPair) {
        outputChunk += `#KODIPROP:inputstream.adaptive.license_key=${clearkeyPair}\n`;
      }
      if (extvlcoptLine) outputChunk += `${extvlcoptLine}\n`;
      if (exthttpLine) outputChunk += `${exthttpLine}\n`;
      outputChunk += `${streamUrl}\n\n`;

      return outputChunk;
    });

    const processedChunks = await Promise.all(channelPromises);
    finalPlaylist += processedChunks.filter(Boolean).join("");

    return res.status(200).send(finalPlaylist);
  } catch (error) {
    return res.status(500).send(`#EXTM3U\n#ERROR: ${error.message}`);
  }
}
