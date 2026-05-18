// Server memory me data save rakhne ke liye cache object
let playlistCache = {
  data2: "",
  data3: "",
  lastFetched: 0 // Timestamp milliseconds me
};

export default async function handler(req, res) {
  // Sirf ?prtstream check
  if (!('prtstream' in req.query)) {
    return res.status(403).send("❌ Access Denied ! Yah Link Sirf Prtstream App Me Chalenga Copy Karo Link Ko Or PrtStream Me jake Paste Karo");
  }

  try {
    const url1 = "https://mainplaylist.poonamchouhan076.workers.dev/";
    const url2 = "https://project-lc4mz.vercel.app/api/tp_";
    const url3 = "https://allmovieslist.poonamchouhan076.workers.dev/";
    const url4 = "https://new-j-tv9filr.poonamchouhan076.workers.dev/";

    const fetchWithTimeout = async (url, ms = 7000) => {
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
        return "";
      } finally {
        clearTimeout(id);
      }
    };

    // Clean function (header remove + trim)
    const cleanM3U = (data) => {
      if (!data) return "";
      return data
        .replace("#EXTM3U", "")
        .replace(/\r/g, "")
        .trim();
    };

    const currentTime = Date.now();
    const twelveHours = 12 * 60 * 60 * 1000; // 12 ghante milliseconds me

    let data2 = "";
    let data3 = "";

    // Check karo kya 12 ghante ho gaye hain ya cache khali hai?
    if (!playlistCache.data2 || !playlistCache.data3 || (currentTime - playlistCache.lastFetched > twelveHours)) {
      
      // Agar cache purana hai, toh sirf url2 aur url3 ko fetch karo
      const [raw2, raw3] = await Promise.all([
        fetchWithTimeout(url2),
        fetchWithTimeout(url3)
      ]);

      // Agar fetch successfully data lata hai tabhi cache update karo (taaki khali data save na ho)
      if (raw2) playlistCache.data2 = cleanM3U(raw2);
      if (raw3) playlistCache.data3 = cleanM3U(raw3);
      
      playlistCache.lastFetched = currentTime; // Time reset karo
    }

    // data2 aur data3 ab memory (cache) se aayenge
    data2 = playlistCache.data2;
    data3 = playlistCache.data3;

    // url1 aur url4 ko HAR BAAR fresh fetch karenge kyunki inme cookies update hoti hain
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
      data2 +
      "\n" +
      data3 +
      "\n" +
      data4;

    res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
    res.setHeader("Cache-Control", "no-store");
    res.status(200).send(finalPlaylist);

  } catch (error) {
    res.status(500).send("Server Error");
  }
}
