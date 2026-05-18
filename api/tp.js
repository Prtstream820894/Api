export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/mpegurl');
  res.setHeader('Cache-Control', 'no-store'); 

  try {
    const m3uUrl = "https://server.vodep39240327.workers.dev/channel/raw?=m3u";
    const response = await fetch(m3uUrl);
    const rawText = await response.text();

    const startMarker = "OTT | TP";
    const endMarker = "-------===";
    const startIdx = rawText.indexOf(startMarker);
    const endIdx = rawText.indexOf(endMarker, startIdx);
    
    const section = rawText.substring(startIdx, endIdx);
    const chunks = section.split("#EXTINF:").slice(1);
    
    let m3u = "#EXTM3U\n\n";

    chunks.forEach(chunk => {
      const lines = ("#EXTINF:" + chunk).split("\n").map(l => l.trim()).filter(l => l !== "");
      
      const infoLine = lines[0];
      const streamUrl = lines.find(l => l.startsWith("http"));
      if (!streamUrl) return;

      // 1. Sabse important: Asli License Key aur Type ki poori line uthana
      const originalLicenseKey = lines.find(l => l.includes("license_key="));
      const originalLicenseType = lines.find(l => l.includes("license_type="));

      // 2. Logo, Group aur Name nikalna
      const logo = infoLine.match(/tvg-logo="([^"]+)"/)?.[1] || "";
      const group = infoLine.match(/group-title="([^"]+)"/)?.[1] || "";
      const name = infoLine.split(",").pop().trim();

      // 3. Playlist structure (Ditto copy of tags)
      m3u += `#EXTINF:-1 tvg-logo="${logo}" group-title="${group}", ${name}\n`;
      
      if (originalLicenseType) m3u += `${originalLicenseType}\n`;
      if (originalLicenseKey) m3u += `${originalLicenseKey}\n`;

      // Baaki VLCOPT aur HTTP headers (Cookies wagera)
      lines.forEach(l => {
        if (l.startsWith("#EXTVLCOPT:") || l.startsWith("#EXTHTTP:")) {
          m3u += `${l}\n`;
        }
      });

      m3u += `${streamUrl}\n\n`;
    });

    res.status(200).send(m3u);
  } catch (e) {
    res.status(500).send("Error: " + e.message);
  }
}
