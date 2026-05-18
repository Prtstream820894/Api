// Serverless me ye sirf kuch der hi memory me rahega
let playlistCache = {
  data2: "",
  data3: "",
  lastFetched: 0
};

export default async function handler(req, res) {
  if (!('prtstream' in req.query)) {
    return res.status(403).send("❌ Access Denied ! Yah Link Sirf Prtstream App Me Chalenga Copy Karo Link Ko Or PrtStream Me jake Paste Karo");
  }

  try {
    const url1 = "https://mainplaylist.poonamchouhan076.workers.dev/";
    const url2 = "https://project-lc4mz.vercel.app/api/tp";
    const url3 = "https://allmovieslist.poonamchouhan076.workers.dev/";
    const url4 = "https://new-j-tv9filr.poonamchouhan076.workers.dev/";

    const fetchWithTimeout = async (url, ms = 8000) => { // Timeout badhakar 8 second kiya
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), ms);

      try {
        const response = await fetch(url + "?t=" + Date.now(), {
          signal: controller.signal,
          headers: { 
            "Cache-Control": "no-cache", 
            "Pragma": "no-cache" 
          }
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

    const currentTime = Date.now();
    const twelveHours = 12 * 60 * 60 * 1000;

    // Fail-Safe Cache Logic: Agar memory me data hai aur 12 ghante nahi hue, toh fetch skip karo
    let data2 = playlistCache.data2;
    let data3 = playlistCache.data3;

    if (!data2 || !data3 || (currentTime - playlistCache.lastFetched > twelveHours)) {
      // Background ya regular fetch
      const [raw2, raw3] = await Promise.all([
        fetchWithTimeout(url2),
        fetchWithTimeout(url3)
      ]);

      // SAFE CHECK: Agar upar wala server data dene me fail ho gaya, toh purana saved data hi chalne do (khali mat karo)
      if (raw2) {
        playlistCache.data2 = cleanM3U(raw2);
        data2 = playlistCache.data2;
      }
      if (raw3) {
        playlistCache.data3 = cleanM3U(raw3);
        data3 = playlistCache.data3;
      }
      
      if (raw2 || raw3) {
        playlistCache.lastFetched = currentTime;
      }
    }

    // URL 1 aur URL 4 hamesha fresh call honge (Cookies ke liye)
    const [data1, data4Raw] = await Promise.all([
      fetchWithTimeout(url1),
      fetchWithTimeout(url4)
    ]);

    if (!data1) {
      return res.status(500).send("Main playlist failed");
    }

    const data4 = cleanM3U(data4Raw);

    // Final merge
    const finalPlaylist =
      data1.trim() +
      "\n" +
      (data2 ? data2 + "\n" : "") + // Agar data2 khali ho toh error na aaye
      (data3 ? data3 + "\n" : "") + // Agar data3 khali ho toh error na aaye
      data4;

    res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
    res.setHeader("Cache-Control", "no-store");
    res.status(200).send(finalPlaylist);

  } catch (error) {
    res.status(500).send("Server Error");
  }
}
