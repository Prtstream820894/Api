export default async function handler(req, res) {
  if (!('prtstream' in req.query)) {
    return res.status(403).send("❌ Access Denied ! Yah Link Sirf Prtstream App Me Chalenga Copy Karo Link Ko Or PrtStream Me jake Paste Karo");
  }

  try {
    const url1 = "https://mainplaylist.poonamchouhan076.workers.dev/";
    const url2 = "https://project-lc4mz.vercel.app/api/tp";
    const url3 = "https://allmovieslist.poonamchouhan076.workers.dev/";
    const url4 = "https://new-j-tv9filr.poonamchouhan076.workers.dev/";

    const fetchWithTimeout = async (url, ms = 8000) => {
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

    // Sabhi 4 URLs ko ek saath live fetch kar rahe hain (No Cache, No Save)
    const [raw1, raw2, raw3, raw4] = await Promise.all([
      fetchWithTimeout(url1),
      fetchWithTimeout(url2),
      fetchWithTimeout(url3),
      fetchWithTimeout(url4)
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
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    
    res.status(200).send(finalPlaylist);

  } catch (error) {
    res.status(500).send("Server Error");
  }
}
