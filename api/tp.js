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
    const section = rawText.substring(rawText.indexOf(startMarker), rawText.indexOf(endMarker));
    
    const blocks = section.split("#EXTINF:").slice(1);
    
    // 1. Pehle saare License Keys ko ek array mein nikal lo
    let allLicenses = [];
    blocks.forEach(block => {
      const lines = block.split("\n");
      const keyLine = lines.find(l => l.includes("license_key="));
      if (keyLine) allLicenses.push(keyLine.trim());
    });

    let m3u = "#EXTM3U\n\n";

    // 2. Loop chalao aur har channel ko usse "Agla" (i + 1) license do
    for (let i = 0; i < blocks.length; i++) {
      const lines = ("#EXTINF:" + blocks[i]).split("\n").map(l => l.trim()).filter(l => l !== "");
      
      const infoLine = lines.find(l => l.startsWith("#EXTINF:"));
      const streamUrl = lines.find(l => l.startsWith("http"));
      const licenseType = lines.find(l => l.includes("license_type="));

      // Jaisa tune bola: Jo license ek aage chala gaya hai, use i+1 se uthao
      const shiftedLicense = allLicenses[i + 1]; 

      // Agar agla license nahi hai (last channel), toh use skip kar do ya remove kar do
      if (!streamUrl || !shiftedLicense) continue;

      const logo = infoLine.match(/tvg-logo="([^"]+)"/)?.[1] || "";
      const group = infoLine.match(/group-title="([^"]+)"/)?.[1] || "";
      const name = infoLine.split(",").pop().trim();

      m3u += `#EXTINF:-1 tvg-logo="${logo}" group-title="${group}", ${name}\n`;
      if (licenseType) m3u += `${licenseType}\n`;
      m3u += `${shiftedLicense}\n`; // Ye raha shifted license

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
