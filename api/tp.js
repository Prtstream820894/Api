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
    
    // Target section uthana
    const section = rawText.substring(startIdx, endIdx);
    
    // Chunking logic - har channel ko group karna
    const blocks = section.split("#EXTINF:").slice(1);
    
    // Temp array taaki hum license ko aage shift kar sakein
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
      const group = groupMatch ? groupMatch[1] : "";
      const name = infoLine.split(",").pop().trim();

      // Baki saare extra headers/options
      let extraHeaders = [];
      lines.forEach(l => {
        if (l.startsWith("#EXTVLCOPT:") || l.startsWith("#EXTHTTP:")) {
          extraHeaders.push(l);
        }
      });

      // Sabhi details ko pehle object me save kar rahe hain
      channelsList.push({
        logo,
        group,
        name,
        streamUrl,
        extraHeaders,
        originalLicenseType: licenseType || null,
        originalLicenseKey: licenseKey || null,
        finalLicenseType: null,
        finalLicenseKey: null
      });
    }

    // --- LICENSE SHIFTING LOGIC ---
    // Har channel ka license uske AAGE VAALE (i + 1) channel me daal rahe hain
    for (let i = 0; i < channelsList.length - 1; i++) {
      channelsList[i + 1].finalLicenseType = channelsList[i].originalLicenseType;
      channelsList[i + 1].finalLicenseKey = channelsList[i].originalLicenseKey;
    }

    // Pehle channel ko remove karna (kyunki shift hone ke baad iske paas koi license nahi bacha)
    channelsList.shift();

    // --- NEW LOGIC: FETCH JSON & EXTRACT KID:K ---
    // Sabhi channels ke licenses ko parallelly fetch aur convert karne ke liye `Promise.all` use kar rahe hain
    await Promise.all(
      channelsList.map(async (ch) => {
        // Agar license key line exist karti hai aur usme URL hai
        if (ch.finalLicenseKey && ch.finalLicenseKey.includes("http")) {
          try {
            // URL nikalna (e.g., #EXT-X-KEY:URI="http://..." se sirf http://... nikalna)
            const urlMatch = ch.finalLicenseKey.match(/https?:\/\/[^\s"]+/);
            if (urlMatch) {
              const licenseUrl = urlMatch[0];
              
              // License URL ko fetch karna
              const jsonRes = await fetch(licenseUrl);
              const jsonData = await jsonRes.json();
              
              // JSON se kid aur k extract karna
              if (jsonData.keys && jsonData.keys.length > 0) {
                const kid = jsonData.keys[0].kid;
                const k = jsonData.keys[0].k;
                
                // Naya format banana: kid:k
                const clearKey = `${kid}:${k}`;
                
                // Purani URL vaali line ko naye clearKey string se replace kar dena
                // Agar pehle line `#EXT-X-KEY:URI="http://..."` thi, toh ab wo `#EXT-X-KEY:URI="kid:k"` ho jayegi
                ch.finalLicenseKey = ch.finalLicenseKey.replace(licenseUrl, clearKey);
                
                // Agar license_type player ke liye 'clearkey' karna ho toh yahan change kar sakte hain
                if (ch.finalLicenseType && ch.finalLicenseType.includes("license_type=")) {
                  ch.finalLicenseType = '#EXTVLCOPT:license_type=clearkey'; // ClearKey type set kiya
                }
              }
            }
          } catch (err) {
            console.error(`Failed to fetch license for ${ch.name}:`, err.message);
            // Agar kisi ka fetch fail ho jaye, toh purana URL hi rehne dega taaki crash na ho
          }
        }
      })
    );

    // Final M3U Playlist build karna
    let m3u = "#EXTM3U\n\n";

    for (const ch of channelsList) {
      m3u += `#EXTINF:-1 tvg-logo="${ch.logo}" group-title="${ch.group}", ${ch.name}\n`;
      
      // Shifted aur Converted license add karna
      if (ch.finalLicenseType) m3u += `${ch.finalLicenseType}\n`;
      if (ch.finalLicenseKey) m3u += `${ch.finalLicenseKey}\n`;

      // Headers add karna
      ch.extraHeaders.forEach(h => {
        m3u += `${h}\n`;
      });

      m3u += `${ch.streamUrl}\n\n`;
    }

    res.status(200).send(m3u);
  } catch (e) {
    res.status(500).send("Error: " + e.message);
  }
}
