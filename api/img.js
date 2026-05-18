export default async function handler(req, res) {
  // CORS Headers set karein taaki kisi bhi player me play ho sake
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Content-Type', 'application/mpegurl');

  // SMART CACHE: Vercel Edge Network par is playlist ko 24 ghante (86400 seconds) ke liye cache karega.
  // Agle 24 ghante tak koi bhi user request karega toh Vercel bina original server ko hit kiye direct playlist de dega.
  res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=3600');

  try {
    const m3uUrl = "https://server.vodep39240327.workers.dev/channel/raw?=m3u";
    
    // 1. Source M3U fetch karein ek achhe User-Agent ke sath
    const m3uResponse = await fetch(m3uUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36"
      }
    });

    if (!m3uResponse.ok) throw new Error("Source M3U fetch failed");
    const rawText = await m3uResponse.text();

    // 2. Section Filter (OTT | TP se lekar -------=== tak)
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

    // 3. Sabhi channels ko parallel process karne ke liye promises array
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

      // Original channel name extract karna
      let channelName = extinfLine.split(",").pop() || "Unknown Channel";
      channelName = channelName.trim();

      // 4. License URL se JSON fetch karke ClearKey (kid:k) banana
      let clearkeyPair = "";
      if (licenseUrl && licenseUrl.startsWith("http")) {
        try {
          // 3 second ka timeout laga rhe hain taaki dead links par script hang na ho
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000);

          const licenseRes = await fetch(licenseUrl, {
            signal: controller.signal,
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36",
              "Accept": "application/json"
            }
          });
          
          clearTimeout(timeoutId);

          if (licenseRes.ok) {
            const json = await licenseRes.json();
            if (json.keys && json.keys[0]) {
              const kid = json.keys[0].kid;
              const k = json.keys[0].k;
              clearkeyPair = `${kid}:${k}`;
            }
          }
        } catch (e) {
          // Fetch fail hone par error nahi dega, channel bina key ke add ho jayega
          console.error(`License fetch failed for ${channelName}:`, e.message);
        }
      }

      // 5. Aapke bataye gaye exact format me row banana
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

    // Output send karein
    return res.status(200).send(finalPlaylist);

  } catch (error) {
    return res.status(500).send(`#EXTM3U\n#ERROR: ${error.message}`);
  }
}
