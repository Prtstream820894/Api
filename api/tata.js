export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Content-Type', 'application/mpegurl');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

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
      return res.status(404).send("#EXTM3U\n#ERROR: Required playlist section not found");
    }

    const targetSection = rawText.substring(startIndex, endIndex);
    const rawChannels = targetSection.split("#EXTINF:");
    let finalPlaylist = "#EXTM3U\n\n";

    const host = req.headers.host || "project-lc4mz.vercel.app";
    const protocol = req.headers['x-forwarded-proto'] || 'https';

    rawChannels.slice(1).forEach((channelBlock) => {
      const lines = ("#EXTINF:" + channelBlock).split("\n").map(l => l.trim()).filter(l => l);

      let extinfLine = "";
      let extvlcoptLine = "";
      let exthttpLine = "";
      let streamUrl = "";

      lines.forEach(line => {
        if (line.startsWith("#EXTINF:")) extinfLine = line;
        else if (line.startsWith("#EXTVLCOPT:")) extvlcoptLine = line;
        else if (line.startsWith("#EXTHTTP:")) exthttpLine = line;
        else if (line.startsWith("http")) streamUrl = line;
      });

      if (!streamUrl) return;

      let channelName = extinfLine.split(",").pop() || "Unknown Channel";
      channelName = channelName.trim();

      let channelIdMatch = streamUrl.match(/Channel_(\d+)/);
      if (!channelIdMatch) {
        channelIdMatch = streamUrl.match(/\/(\d+)\.mpd/);
      }

      let outputChunk = `#EXTINF:-1 tvg-logo="https://project-lc4mz.vercel.app/api/img" group-title="Sports", ${channelName}\n`;
      outputChunk += `#KODIPROP:inputstream.adaptive.license_type=clearkey\n`;
      
      if (channelIdMatch && channelIdMatch[1]) {
        const channelId = channelIdMatch[1];
        // Player jab channel pe click karega toh is URL pe jaakar key uthayega
        outputChunk += `#KODIPROP:inputstream.adaptive.license_key=${protocol}://${host}/api/license?id=${channelId}\n`;
      }
      
      if (extvlcoptLine) outputChunk += `${extvlcoptLine}\n`;
      if (exthttpLine) outputChunk += `${exthttpLine}\n`;
      outputChunk += `${streamUrl}\n\n`;

      finalPlaylist += outputChunk;
    });

    return res.status(200).send(finalPlaylist);
  } catch (error) {
    return res.status(500).send(`#EXTM3U\n#ERROR: ${error.message}`);
  }
}
