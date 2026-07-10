export default async function handler(req, res) {
  if (!('prtstream' in req.query)) {
    return res.status(403).send("❌ Access Denied ! Yah Link Sirf Prtstream App Me Chalenga Copy Karo Link Ko Or PrtStream Me jake Paste Karo");
  }

  try {
    const url1 = "https://mainplaylist.poonamchouhan076.workers.dev/";
    const url2 = "https://allmovieslist.poonamchouhan076.workers.dev/";
    const url3 = "https://raw.githubusercontent.com/poonamchouhan54/love-/refs/heads/main/Jtv.m3u";
    const url4 = "https://new-j-tv9filr.poonamchouhan076.workers.dev/";
    
    // Naye FanCode aur SonyLIV Workers ke URLs yahan add kar diye
    const url5 = "https://fancode-art-c9de.poonamchouhan076.workers.dev/";
    const url6 = "https://sonyliv-event-5e05.poonamchouhan076.workers.dev/";

    const fetchWithTimeout = async (url, ms = 8000) => {
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
            "Pragma": "no-cache" 
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

    const cleanM3U = (data) => {
      if (!data) return "";
      return data.replace("#EXTM3U", "").replace(/\r/g, "").trim();
    };

    // Sabhi 6 URLs ko ek saath live fetch kar rahe hain Promise.all se (Fastest speed ke liye)
    const [raw1, raw2, raw3, raw4, raw5, raw6] = await Promise.all([
      fetchWithTimeout(url1, 8000),
      fetchWithTimeout(url2, 8000),
      fetchWithTimeout(url3, 15000), // url3 ko extra time
      fetchWithTimeout(url4, 8000),
      fetchWithTimeout(url5, 8000),  // FanCode
      fetchWithTimeout(url6, 8000)   // SonyLIV
    ]);

    if (!raw1) {
      return res.status(500).send("Main playlist failed");
    }

    const data1 = raw1.trim();
    const data2 = cleanM3U(raw2);
    const data3 = cleanM3U(raw3);
    const data4 = cleanM3U(raw4);
    const data5 = cleanM3U(raw5); // FanCode clean data
    const data6 = cleanM3U(raw6); // SonyLIV clean data

    // Final merge: Agar live match nahi chal raha hoga aur wo worker empty response dega, 
    // toh ye automatic use skip karke baki playlist bana dega, koi error nahi aayega.
    const finalPlaylist =
      data1 +
      "\n" +
      (data2 ? data2 + "\n" : "") +
      (data3 ? data3 + "\n" : "") +
      (data4 ? data4 + "\n" : "") +
      (data5 ? data5 + "\n" : "") +
      (data6 ? data6 + "\n" : "");

    // Response Headers
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
