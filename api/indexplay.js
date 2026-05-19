// Global cache object
if (!global.masterCache) {
  global.masterCache = { data2: "", data3: "", lastFetched: 0 };
}

export default async function handler(req, res) {
  if (!('prtstream' in req.query)) {
    return res.status(403).send("❌ Access Denied!");
  }

  const currentTime = Date.now();
  const twelveHours = 12 * 60 * 60 * 1000;

  try {
    const url1 = "https://mainplaylist.poonamchouhan076.workers.dev/";
    const url2 = "https://project-lc4mz.vercel.app/api/tp";
    const url3 = "https://allmovieslist.poonamchouhan076.workers.dev/";
    const url4 = "https://new-j-tv9filr.poonamchouhan076.workers.dev/";

    // Common function to fetch and clean data
    const fetchAndClean = async (url) => {
      try {
        const resp = await fetch(url + (url.includes('?') ? '&' : '?') + "t=" + Date.now());
        if (!resp.ok) return "";
        let text = await resp.text();
        if (text.includes("error code:") || text.includes("1027")) return "";
        // Har list se #EXTM3U hata do aur extra spaces saaf karo
        return text.replace("#EXTM3U", "").replace(/\r/g, "").trim();
      } catch (e) { return ""; }
    };

    // --- URL 2 & 3: Cache Logic (12 Hours) ---
    if (!global.masterCache.data2 || !global.masterCache.data3 || (currentTime - global.masterCache.lastFetched > twelveHours)) {
      console.log("Updating Cache for URL 2 & 3...");
      const [r2, r3] = await Promise.all([fetchAndClean(url2), fetchAndClean(url3)]);
      
      if (r2 && r2.length > 100) global.masterCache.data2 = r2;
      if (r3 && r3.length > 100) global.masterCache.data3 = r3;
      
      global.masterCache.lastFetched = currentTime;
    }

    // --- URL 1 & 4: Always Fresh (For Cookies) ---
    const [data1, data4] = await Promise.all([fetchAndClean(url1), fetchAndClean(url4)]);

    // --- FINAL MERGE (Sahi sequence me) ---
    let finalPlaylist = "#EXTM3U\n"; // Header sirf ek baar

    if (data1) finalPlaylist += "\n" + data1;
    if (global.masterCache.data2) finalPlaylist += "\n" + global.masterCache.data2;
    if (global.masterCache.data3) finalPlaylist += "\n" + global.masterCache.data3;
    if (data4) finalPlaylist += "\n" + data4;

    // Response set karo
    res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
    res.setHeader("Cache-Control", "no-store");
    
    // Final check: agar playlist khali hai toh error do
    if (finalPlaylist.length < 50) {
      return res.status(500).send("Playlist Merge Failed - No Data Found");
    }

    return res.status(200).send(finalPlaylist);

  } catch (error) {
    return res.status(500).send("Master Server Error: " + error.message);
  }
}
