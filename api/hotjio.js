export default async function handler(req, res) {
  const targetUrl = "https://host.cloudplay.me/app/icc/hstr.php";

  try {
    const response = await fetch(targetUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch source: ${response.status}`);
    }

    const data = await response.json();

    let m3uContent = "#EXTM3U\n\n";

    data.forEach(item => {
      const name = item.name || "";
      const logo = item.logo || "";
      const group = item.group || "Others";
      const id = item.id || "";
      const finalUrl = item.mpd_url || item.m3u8_url || "";
      
      const cookie = item.headers?.Cookie || "";
      const origin = item.headers?.Origin || "https://www.hotstar.com";
      const referer = item.headers?.Referer || "https://www.hotstar.com/";
      const ua = item.user_agent || "Hotstar;in.startv.hotstar/25.01.27.5.3788 (Android/13)";

      // 1. Info Line
      m3uContent += `#EXTINF:-1 tvg-id="${id}" tvg-name="${name}" tvg-logo="${logo}" group-title="${group}", ${name}\n`;
      
      // 2. HTTP Header
      m3uContent += `#EXTHTTP:{"cookie":"${cookie}"}\n`;

      // 3. Logic for DASH/MPD with License Extraction
      if (finalUrl.includes(".mpd")) {
          m3uContent += `#EXTVLCOPT:referrer=${referer}\n`;
          m3uContent += `#EXTVLCOPT:origin=${origin}\n`;
          m3uContent += `#EXTVLCOPT:user-agent=${ua}\n`;
          m3uContent += `#KODIPROP:inputstream.adaptive.manifest_type=mpd\n`;
          m3uContent += `#KODIPROP:inputstream.adaptive.license_type=clearkey\n`;

          const licenseUrl = item.license_url || "";
          const keyIdMatch = licenseUrl.match(/keyid=([a-fA-F0-9]+)/);
          const keyMatch = licenseUrl.match(/key=([a-fA-F0-9]+)/);

          if (keyIdMatch && keyMatch) {
              m3uContent += `#KODIPROP:inputstream.adaptive.license_key=${keyIdMatch[1]}:${keyMatch[1]}\n`;
          }
      } else {
          m3uContent += `#EXTVLCOPT:origin=${origin}\n`;
          m3uContent += `#EXTVLCOPT:referrer=${referer}\n`;
          m3uContent += `#EXTVLCOPT:user-agent=${ua}\n`;
      }

      m3uContent += `${finalUrl}\n\n`;
    });

    // Headers set karna
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Disposition', 'attachment; filename=hotstar.m3u');

    // Response bhejna
    return res.status(200).send(m3uContent);

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
