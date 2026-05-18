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
  const CACHE_DURATION = 12 * 60 * 60 * 1000; // 12 Hours in milliseconds

  // 1. Check karo agar is specific URL ka unexpired license cache me maujood hai
  if (global.licenseCache[targetUrl] && currentTime < global.licenseCache[targetUrl].expiry) {
    console.log(`Serving Fresh License from Cache for URL: ${targetUrl}`);
    res.setHeader('Content-Type', 'text/plain');
    return res.status(200).send(global.licenseCache[targetUrl].keyString);
  }

  try {
    console.log(`Cache miss or expired. Fetching live license for URL: ${targetUrl}`);
    
    // Fetch with an 8-second timeout so it doesn't get stuck
    const response = await fetch(targetUrl, { signal: AbortSignal.timeout(8000) });
    
    if (!response.ok) {
      throw new Error(`License source responded with status: ${response.status}`);
    }

    const rawText = await response.text();

    // Check agar Cloudflare ka rate limit ya blocking page return hua ho
    if (rawText.includes("error code:") || rawText.includes("1027") || rawText.includes("Cloudflare")) {
      throw new Error("Cloudflare error/blocking detected on license source.");
    }

    // Text ko JSON me parse karo
    const jsonData = JSON.parse(rawText);

    if (jsonData.keys && jsonData.keys.length > 0) {
      const kid = jsonData.keys[0].kid;
      const k = jsonData.keys[0].k;
      const clearKeyString = `${kid}:${k}`;
      
      // 2. License ko map me store karo uski 12-hour expiry ke sath
      global.licenseCache[targetUrl] = {
        keyString: clearKeyString,
        expiry: currentTime + CACHE_DURATION
      };

      console.log(`Successfully cached new license for URL: ${targetUrl}`);
      res.setHeader('Content-Type', 'text/plain');
      return res.status(200).send(clearKeyString);
    } else {
      throw new Error("Keys array is empty or invalid structure in JSON response.");
    }

  } catch (error) {
    console.error(`Error fetching license for ${targetUrl}:`, error.message);

    // --- SMART FALLBACK LOGIC FOR LICENSE ---
    // Agar live fetch fail ho gaya, par is URL ka PURANA license memory me pada hai
    if (global.licenseCache[targetUrl]) {
      console.log(`Source failed! Serving expired license as fallback for URL: ${targetUrl}`);
      
      // Is specific key ki expiry ko temporary 5 min aage badha do taaki baar-baar hit na kare
      global.licenseCache[targetUrl].expiry = Date.now() + (5 * 60 * 1000);
      
      res.setHeader('Content-Type', 'text/plain');
      return res.status(200).send(global.licenseCache[targetUrl].keyString);
    }

    // Agar cache me bilkul kuch nahi hai (pehli baar load ho raha hai) tabhi error do
    return res.status(500).send("Error: " + error.message);
  }
}
