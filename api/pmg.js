// Node.js native fetch use karega (Node 18+ built-in)
export default async function handler(request, response) {
  const FIREBASE_URL = "https://ipl2020-46d2f.firebaseio.com/Sport/channels.json";

  try {
    const res = await fetch(FIREBASE_URL);
    if (!res.ok) {
      return response.status(500).json({ error: "Firebase se data fetch nahi ho paya!" });
    }

    const channels = await res.json();
    
    if (!channels || !Array.isArray(channels)) {
      return response.status(400).json({ error: "Invalid format or empty data in Firebase" });
    }

    let m3uString = "#EXTM3U\n";

    for (const ch of channels) {
      if (!ch || !ch.url) continue;

      // Agar channel metadata exist karta hai
      if (ch.name) {
        let extinfLine = `#EXTINF:-1`;
        
        // 1. tvg-id handling
        if (ch.tvgId && ch.tvgId.trim() !== "") {
          extinfLine += ` tvg-id="${ch.tvgId}"`;
        }
        
        // 2. Extra attributes (tvg-chno, tvg-name, etc.)
        if (ch.tvgChno) extinfLine += ` tvg-chno="${ch.tvgChno}"`;
        if (ch.tvgName) extinfLine += ` tvg-name="${ch.tvgName}"`;
        if (ch.tvgCountry) extinfLine += ` tvg-country="${ch.tvgCountry}"`;
        
        // 3. group-title
        extinfLine += ` group-title="${ch.group || "Uncategorized"}"`;
        
        // 4. tvg-logo
        if (ch.logo && ch.logo.trim() !== "") {
          extinfLine += ` tvg-logo="${ch.logo}"`;
        }
        
        // 5. Comma aur Channel Name
        extinfLine += `,${ch.name}\n`;
        m3uString += extinfLine;

        // TERE RULES: Pehle type, fir key (Aur aakhri me underscore '_' hi rahega)
        if (ch.drm) {
          const getRestoredKey = (rawKey) => {
            if (rawKey.includes('inputstream_adaptive_license_type')) {
              return 'inputstream.adaptive.license_type';
            }
            if (rawKey.includes('inputstream_adaptive_license_key')) {
              return 'inputstream.adaptive.license_key';
            }
            return rawKey.replace(/_/g, '.'); // Fallback baaki keys ke liye
          };

          // Step A: Print license_type pehle
          for (const [key, value] of Object.entries(ch.drm)) {
            if (key.includes('license_type')) {
              m3uString += `#KODIPROP:${getRestoredKey(key)}=${value}\n`;
            }
          }
          // Step B: Print license_key baad me
          for (const [key, value] of Object.entries(ch.drm)) {
            if (key.includes('license_key')) {
              m3uString += `#KODIPROP:${getRestoredKey(key)}=${value}\n`;
            }
          }
          // Baaki bache hue properties ke liye
          for (const [key, value] of Object.entries(ch.drm)) {
            if (!key.includes('license_type') && !key.includes('license_key')) {
              m3uString += `#KODIPROP:${getRestoredKey(key)}=${value}\n`;
            }
          }
        }

        // EXTVLCOPT
        if (ch.vlcOptions) {
          for (const [key, value] of Object.entries(ch.vlcOptions)) {
            const restoredKey = key.replace(/_/g, '.');
            m3uString += `#EXTVLCOPT:${restoredKey}=${value}\n`;
          }
        }

        // EXTHTTP (Headers & Cookies restore as it is)
        if (ch.httpHeaders) {
          m3uString += `#EXTHTTP:${JSON.stringify(ch.httpHeaders)}\n`;
        }
      }

      // URL bina kisi extra gap ke direct add hoga
      m3uString += `${ch.url}\n`;
    }

    // Vercel Headers Configuration (Auto-download IPTV Players ke liye)
    response.setHeader("Content-Type", "application/x-mpegurl; charset=utf-8");
    response.setHeader("Content-Disposition", "attachment; filename=\"live_playlist.m3u\"");
    response.setHeader("Access-Control-Allow-Origin", "*");
    response.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

    // Send final M3U string response
    return response.status(200).send(m3uString.trim());

  } catch (error) {
    return response.status(500).json({ error: error.message });
  }
}
