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
    
    // Sirf target section uthana
    const section = rawText.substring(startIdx, endIdx);
    
    // Chunking logic change - har channel ko sahi se group karna
    const blocks = section.split("#EXTINF:").slice(1);
    let m3u = "#EXTM3U\n\n";

    for (const block of blocks) {
      const lines = ("#EXTINF:" + block).split("\n").map(l => l.trim()).filter(l => l !== "");
      
      // 1. Target lines ko identify karna ussi block ke andar
      const infoLine = lines.find(l => l.startsWith("#EXTINF:"));
      const streamUrl = lines.find(l => l.startsWith("http"));
      const licenseKey = lines.find(l => l.includes("license_key="));
      const licenseType = lines.find(l => l.includes("license_type="));

      if (!streamUrl || !infoLine) continue;

      // 2. Logo aur Name extract karna
      const logoMatch = infoLine.match(/tvg-logo="([^"]+)"/);
      const groupMatch = infoLine.match(/group-title="([^"]+)"/);
      const logo = logoMatch ? logoMatch[1] : "";
      const group = groupMatch ? groupMatch[1] : "";
      const name = infoLine.split(",").pop().trim();

      // 3. Playlist build karna (Block by Block matching)
      m3u += `#EXTINF:-1 tvg-logo="${logo}" group-title="${group}", ${name}\n`;
      
      // Wahi license line jo is specific block ke andar mili hai
      if (licenseType) m3u += `${licenseType}\n`;
      if (licenseKey) m3u += `${licenseKey}\n`;

      // Headers (Cookies/UA) bhi ussi block se uthana
      lines.forEach(l => {
        if (l.startsWith("#EXTVLCOPT:") || l.startsWith("#EXTHTTP:")) {
          m3u += `${l}\n`;
        }
      });

      m3u += `${streamUrl}\n\n`;
    }

    res.status(200).send(m3u);
  } catch (e) {
    res.status(500).send("Error: " + e.message);
  }
}
