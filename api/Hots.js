const axios = require('axios');

module.exports = async (req, res) => {
  // Tera Cloudflare Worker ka URL
  const workerUrl = "https://nameless-wood-7d2f.prtstream.workers.dev/";

  try {
    // 1. Worker se M3U Data fetch karna
    const response = await axios.get(workerUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000 // 10 seconds timeout
    });

    // 2. Response Headers set karna (M3U format ke liye)
    res.setHeader('Content-Type', 'application/x-mpegurl');
    res.setHeader('Content-Disposition', 'attachment; filename=playlist.m3u');
    res.setHeader('Access-Control-Allow-Origin', '*');

    // 3. Data send karna
    res.status(200).send(response.data);

  } catch (error) {
    console.error("Error fetching worker:", error.message);
    res.status(500).json({ error: "Failed to fetch playlist from worker" });
  }
};

