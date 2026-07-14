export default async function handler(req, res) {
  try {
    const urls = [
      "https://zeehdk.poonamchouhan076.workers.dev/",
      "https://fancy-morning-a287.poonamchouhan076.workers.dev/",
      "https://tight-firefly-ecdd.poonamchouhan076.workers.dev/"
    ];

    // ⚡ फ़ास्ट पैरेलल फ़ेच विथ टाइमआउट (अगर कोई एक वर्कर स्लो है तो पूरी API नहीं रुकेगी)
    const fetchWithTimeout = async (url) => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000); // 4 सेकंड का टाइमआउट
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);
        return res.ok ? await res.text() : "";
      } catch (e) {
        console.error(`Failed to fetch ${url}:`, e.message);
        return "";
      }
    };

    const responses = await Promise.all(urls.map(url => fetchWithTimeout(url)));

    const seenChannels = new Set();
    let finalChannels = [];

    for (let text of responses) {
      if (!text) continue;

      // गंदे कैरिज रिटर्न (\r) हटाकर सिर्फ लाइन्स में स्प्लिट करें
      const lines = text.replace(/\r/g, "").split("\n");
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        if (line.startsWith("#EXTINF")) {
          // अगला लाइन ही स्ट्रीम URL होगा
          const streamUrl = lines[i + 1] ? lines[i + 1].trim() : "";
          
          if (streamUrl && !streamUrl.startsWith("#")) {
            // यूनिक की बनाने के लिए चैनल का नाम निकालें (Comma ',' के बाद वाला हिस्सा)
            const commaIndex = line.lastIndexOf(",");
            const channelName = commaIndex !== -1 ? line.substring(commaIndex + 1).trim() : line;
            
            // अगर नाम खाली है तो स्ट्रीम URL को ही की बना लें
            const uniqueKey = channelName || streamUrl;

            // अगर यह चैनल पहले नहीं आया है, तो ही ऐड करें
            if (!seenChannels.has(uniqueKey)) {
              seenChannels.add(uniqueKey);
              finalChannels.push(line);      // #EXTINF लाइन
              finalChannels.push(streamUrl); // Stream URL लाइन
            }
            
            i++; // URL वाली लाइन को स्किप करें क्योंकि उसे प्रोसेस कर लिया है
          }
        }
      }
    }

    const finalPlaylist = "#EXTM3U\n" + finalChannels.join("\n");

    // ⚡ ब्राउज़र और प्लेयर को सही फॉर्मेट बताना
    res.setHeader("Content-Type", "application/vnd.apple.mpegurl");

    // ⚡ एक्सट्रीम फ़ास्ट लोडिंग के लिए रिस्पॉन्स कैशे (Browser 10 min, Edge CDN 30 min तक होल्ड करेगा)
    res.setHeader("Cache-Control", "public, max-age=600, s-maxage=1800, stale-while-revalidate=3600");

    res.status(200).send(finalPlaylist);

  } catch (e) {
    res.status(500).send("Error: " + e.message);
  }
}
