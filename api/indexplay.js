// Global cache sirf URL 2 aur URL 3 ka data pakad ke rakhega
if (!global.masterCache) {
  global.masterCache = {
    data2: "",
    data3: "",
    lastFetched: 0
  };
}

export default async function handler(req, res) {
  // Prtstream check
  if (!('prtstream' in req.query)) {
    return res.status(403).send("❌ Access Denied ! Yah Link Sirf Prtstream App Me Chalenga");
  }

  const currentTime = Date.now();
  const twelveHours = 12 * 60 * 60 * 1000;

  try {
    const url1 = "https://mainplaylist.poonamchouhan076.workers.dev/";
    const url2 = "https://project-lc4mz.vercel.app/api/tp";
    const url3 = "https://allmovieslist.poonamchouhan076.workers.dev/";
    const url4 = "https://new-j-tv9filr.poonamchouhan076.workers.dev/";

    const fetchWithTimeout = async (url) => {
      try {
        // Timestamp add kar rahe hain taaki koi purana result na mile
        const response = await fetch(url + (url.includes('?') ? '&' : '?') + "t=" + Date.now());
        if (!response.ok) return "";
        const text = await response.text();
        if (text.includes("error code:") || text.includes("1027")) return "";
        return text;
      } catch (err) {
        return "";
      }
    };

    const cleanM3U = (data) => {
      if (!data || data.length < 100) return "";
      return data.replace("#EXTM3U", "").replace(/\r/g, "").trim();
    };

    // --- STEP 1: URL 2 aur URL 3 ka logic (12 Ghante me ek baar) ---
    // Agar memory khali hai ya time khatam ho gaya, tabhi inko call karo
    if (!global.masterCache.data2 || !global.masterCache.data3 || (currentTime - global.masterCache.lastFetched > twelveHours)) {
      console.log("Fetching URL 2 & 3 (New cycle started)...");
      
      const [raw2, raw3] = await Promise.all([
        fetchWithTimeout(url2),
        fetchWithTimeout(url3)
      ]);

      // Sirf valid data milne par hi cache update karo
      if (raw2 && raw2.includes("#EXTINF")) {
        global.masterCache.data2 = cleanM3U(raw2);
      }
      if (raw3 && raw3.includes("#EXTINF")) {
        global.masterCache.data3 = cleanM3U(raw3);
      }
      
      // Update the timestamp
      global.masterCache.lastFetched = currentTime;
    }

    // --- STEP 2: URL 1 aur URL 4 (Hamesha Fresh Call - Cookies ke liye) ---
    // Ye har request par execute honge
    const [data1Raw, data4Raw] = await Promise.all([
      fetchWithTimeout(url1),
      fetchWithTimeout(url4)
    ]);

    const data1 = data1Raw.trim();
    const data4 = cleanM3U(data4Raw);

    // --- STEP 3: Final Merge ---
    let finalPlaylist = "#EXTM3U\n\n";
    
    // URL 1 (Fresh)
    if (data1) finalPlaylist += data1.replace("#EXTM3U", "").trim() + "\n";
    
    // URL 2 (From 12-hour Cache)
    if (global.masterCache.data2) finalPlaylist += global.masterCache.data2 + "\n";
    
    // URL 3 (From 12-hour Cache)
    if (global.masterCache.data3) finalPlaylist += global.masterCache.data3 + "\n";
    
    // URL 4 (Fresh)
    if (data4) finalPlaylist += data4;

    // Response send karo
    res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
    res.setHeader("Cache-Control", "no-store");
    res.status(200).send(finalPlaylist);

  } catch (error) {
    console.error("Critical Error:", error.message);
    res.status(500).send("Master Server Error");
  }
}
