export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/mpegurl');
  res.setHeader('Cache-Control', 'no-store'); 

  try {
    const m3uUrl = "https://server.vodep39240327.workers.dev/channel/raw?=m3u";
    const response = await fetch(m3uUrl);
    const rawText = await response.text();

    // Section nikalna
    const startMarker = "OTT | TP";
    const endMarker = "-------===";
    const section = rawText.substring(rawText.indexOf(startMarker), rawText.indexOf(endMarker));
    
    const chunks = section.split("#EXTINF:").slice(1);
    let m3u = "#EXTM3U\n\n";

    const host = req.headers.host;

    chunks.forEach(chunk => {
      const lines = ("#EXTINF:" + chunk).split("\n").map(l => l.trim());
      const infoLine = lines[0];
      const streamUrl = lines.find(l => l.startsWith("http"));

      if (!streamUrl) return;

      // 1. Sahi Logo aur Group nikalna
      const logo = infoLine.match(/tvg-logo="([^"]+)"/)?.[1] || "";
      const group = infoLine.match(/group-title="([^"]+)"/)?.[1] || "Entertainment";
      const name = infoLine.split(",").pop();

      // 2. Channel ID nikalna license ke liye
      const channelId = streamUrl.match(/Channel_(\d+)/)?.[1] || streamUrl.match(/\/(\d+)\.mpd/)?.[1];

      m3u += `#EXTINF:-1 tvg-logo="${logo}" group-title="${group}", ${name}\n`;
      m3u += `#KODIPROP:inputstream.adaptive.license_type=clearkey\n`;
      if (channelId) {
        // Tumhara license URL jo niche wali file ko hit karega
        m3u += `#KODIPROP:inputstream.adaptive.license_key=https://${host}/api/license?id=${channelId}\n`;
      }
      
      // Baaki headers (User-Agent/Cookie) jo source mein hain unhe dhoond kar add karna
      const vlcOpt = lines.find(l => l.startsWith("#EXTVLCOPT:"));
      const httpOpt = lines.find(l => l.startsWith("#EXTHTTP:"));
      if (vlcOpt) m3u += `${vlcOpt}\n`;
      if (httpOpt) m3u += `${httpOpt}\n`;
      
      m3u += `${streamUrl}\n\n`;
    });

    res.status(200).send(m3u);
  } catch (e) {
    res.status(500).send("Error: " + e.message);
  }
}
