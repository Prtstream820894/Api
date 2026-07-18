export default async function handler(req, res) {
  if (!('prtstream' in req.query)) {
    return res.status(403).send("❌ Access Denied ! Yah Link Sirf Prtstream App Me Chalenga Copy Karo Link Ko Or PrtStream Me jake Paste Karo");
  }

  try {
    const url1 = "https://mainplaylist.poonamchouhan076.workers.dev/";
    const url2 = "https://allmovieslist.poonamchouhan076.workers.dev/";
    const url3 = "https://wandering-morning-5534.poonamchouhan076.workers.dev/";
    const url4 = "https://upcominge-dawn-7c6bve.poonamchouhan076.workers.dev/";
    const url5 = "https://fancode-art-c9de.poonamchouhan076.workers.dev/";
    const url6 = "https://sonyliv-event-5e05.poonamchouhan076.workers.dev/";

    const fetchWithTimeout = async (url, ms = 8000) => {
      if (!url) return "";
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), ms);

      try {
        const isUrl3 = url === url3;
        const cacheBuster = isUrl3 
          ? `?nocache=${Date.now()}&r=${Math.random()}` 
          : `?t=${Date.now()}`;
        
        const response = await fetch(url + cacheBuster, {
          signal: controller.signal,
          headers: { 
            "Cache-Control": "no-cache, no-store, max-age=0", 
            "Pragma": "no-cache",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
          },
          ...(isUrl3 && { cf: { cacheTtl: 0, cacheEverything: false } })
        });
        
        return await response.text();
      } catch (err) {
        console.error(`Fetch failed for ${url}:`, err.message);
        return "";
      } finally {
        clearTimeout(id);
      }
    };

    // Sabhi 6 URLs ko ek saath live fetch kar rahe hain parallelly
    const responses = await Promise.all([
      fetchWithTimeout(url1, 8000),
      fetchWithTimeout(url2, 8000),
      fetchWithTimeout(url3, 15000),
      fetchWithTimeout(url4, 8000),
      fetchWithTimeout(url5, 8000),
      fetchWithTimeout(url6, 8000)
    ]);

    if (!responses[0]) {
      return res.status(500).send("Main playlist failed");
    }

    // Pehle block ka logic fast processing ke liye optimized string array me setup kiya
    let finalPlaylist = responses[0].trim();

    // Loop directly run karega bina cleanM3U dynamic overhead function ke
    for (let i = 1; i < responses.length; i++) {
      const rawData = responses[i];
      if (rawData) {
        // Bina function invoke kiye yahan fast direct replace kiya hai
        const cleaned = rawData.replace("#EXTM3U", "").replace(/\r/g, "").trim();
        if (cleaned) {
          finalPlaylist += "\n" + cleaned;
        }
      }
    }

    // Response Headers setup jo laggy applications me video buffer rokti hai
    res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Cloudflare-CDN-Cache-Control", "no-store");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    
    res.status(200).send(finalPlaylist.trim());

  } catch (error) {
    res.status(500).send("Server Error");
  }
}
