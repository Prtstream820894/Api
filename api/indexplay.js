export default async function handler(req, res) {
  if (!('prtstream' in req.query)) {
    return res.status(403).send("❌ Access Denied ! Yah Link Sirf Prtstream App Me Chalenga Copy Karo Link Ko Or PrtStream Me jake Paste Karo");
  }

  try {
    const url1 = "https://allmovieslist.poonamchouhan076.workers.dev/";
    const url2 = "https://shiny-hat-32f8.poonamchouhan076.workers.dev/";
    const url3 = "https://mainplaylist.poonamchouhan076.workers.dev/";
    const url4 = "https://new-j-tv9filr.poonamchouhan076.workers.dev/";

    const fetchWithTimeout = async (url, ms = 8000) => {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), ms);

      try {
        // url3 ke liye extra strong cache buster
        const isUrl3 = url === url3;
        const cacheBuster = isUrl3 
          ? `?nocache=${Date.now()}&r=${Math.random()}` 
          : `?t=${Date.now()}`;
        
        const response = await fetch(url + cacheBuster, {
          signal: controller.signal,
          headers: { 
            "Cache-Control": "no-cache, no-store, max-age=0", 
            "Pragma": "no-cache" 
          },
          // Sirf url3 ke liye Cloudflare cache bypass
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

    const cleanM3U = (data) => {
      if (!data) return "";
      return data.replace("#EXTM3U", "").replace(/\r/g, "").trim();
    };

    // Sabhi 4 URLs ko ek saath live fetch kar rahe hain
    const [raw1, raw2, raw3, raw4] = await Promise.all([
      fetchWithTimeout(url1, 8000),
      fetchWithTimeout(url2, 8000),
      fetchWithTimeout(url3, 15000), // url3 ko extra time diya
      fetchWithTimeout(url4, 8000)
    ]);

    // URL 1 Main Playlist hai, iska hona zaroori hai
    if (!raw1) {
      return res.status(500).send("Main playlist failed");
    }

    // Baaki playlists ko clean kar rahe hain
    const data1 = raw1.trim();
    const data2 = cleanM3U(raw2);
    const data3 = cleanM3U(raw3);
    const data4 = cleanM3U(raw4);

    // Final merge: Agar koi beech me fail bhi ho jaye toh baaki ka data jud jayega
    const finalPlaylist =
      data1 +
      "\n" +
      (data2 ? data2 + "\n" : "") +
      (data3 ? data3 + "\n" : "") +
      data4;

    // Response Headers
    res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Cloudflare-CDN-Cache-Control", "no-store"); // Ye line add ki
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    
    res.status(200).send(finalPlaylist);

  } catch (error) {
    res.status(500).send("Server Error");
  }
}