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
      
      // Yahan hum asli license key wali line dhoond rahe hain (#KODIPROP:inputstream.adaptive.license_key)
      const originalLicenseLine = lines.find(l => l.includes("license_key="));
      const licenseTypeLine = lines.find(l => l.includes("license_type="));

      if (!streamUrl) return;

      // Sahi Logo, Group aur Name nikalna
      const logo = infoLine.match(/tvg-logo="([^"]+)"/)?.[1] || "";
      const group = infoLine.match(/group-title="([^"]+)"/)?.[1] || "";
      const name = infoLine.split(",").pop().trim();

      // Playlist Structure banana
      m3u += `#EXTINF:-1 tvg-logo="${logo}" group-title="${group}", ${name}\n`;
      
      // Agar asli license line mili toh wahi chipka do (No changes)
      if (licenseTypeLine) m3u += `${licenseTypeLine}\n`;
      if (originalLicenseLine) m3u += `${originalLicenseLine}\n`;

      // Baaki VLCOPT aur HTTP headers
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
