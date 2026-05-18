// Global key-value cache licenses ke liye
if (!global.licenseCache) {
  global.licenseCache = {}; 
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { url } = req.query;
  if (!url) return res.status(400).send("Missing URL");

  const targetUrl = decodeURIComponent(url);
  const currentTime = Date.now();
  const CACHE_DURATION = 12 * 60 * 60 * 1000; // 12 Hours

  // 1. Check karo agar is specific URL ka license cache me maujood hai aur expired nahi hai
  if (global.licenseCache[targetUrl] && currentTime < global.licenseCache[targetUrl].expiry) {
    console.log(`Serving License from Cache for URL: ${targetUrl}`);
    res.setHeader('Content-Type', 'text/plain');
    return res.status(200).send(global.licenseCache[targetUrl].keyString);
  }

  try {
    console.log(`Cache miss. Fetching live license for URL: ${targetUrl}`);
    const response = await fetch(targetUrl);
    const jsonData = await response.json();

    if (jsonData.keys && jsonData.keys.length > 0) {
      const kid = jsonData.keys[0].kid;
      const k = jsonData.keys[0].k;
      const clearKeyString = `${kid}:${k}`;
      
      // 2. License ko map me store karo uski expiry ke sath
      global.licenseCache[targetUrl] = {
        keyString: clearKeyString,
        expiry: currentTime + CACHE_DURATION
      };

      res.setHeader('Content-Type', 'text/plain');
      return res.status(200).send(clearKeyString);
    } else {
      return res.status(404).send("Keys not found");
    }
  } catch (error) {
    return res.status(500).send("Error: " + error.message);
  }
}
