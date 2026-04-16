export default async function handler(req, res) {
  try {
    const urls = [
      "https://fancy-morning-a287.poonamchouhan076.workers.dev/",
      "https://tight-firefly-ecdd.poonamchouhan076.workers.dev/",
      "https://late-hat-1b4a.poonamchouhan076.workers.dev/",
      "https://iptv-org.github.io/iptv/index.m3u"
    ];

    const seen = new Set();
    let finalChannels = [];

    for (let i = 0; i < urls.length; i++) {
      const text = await fetch(urls[i]).then(r => r.text());

      const lines = text.replace("#EXTM3U", "").trim().split("\n");

      let tempBlock = [];

      for (let line of lines) {
        if (line.startsWith("#EXTINF")) {

          if (tempBlock.length) {
            const key = tempBlock[0];

            // 🔥 FILTER (only India from 4th playlist)
            if (
              i !== 3 || 
              /tvg-country="IN"|India|Hindi/i.test(key)
            ) {
              if (!seen.has(key)) {
                seen.add(key);
                finalChannels.push(...tempBlock);
              }
            }

            tempBlock = [];
          }
        }
        tempBlock.push(line);
      }

      // last block
      if (tempBlock.length) {
        const key = tempBlock[0];

        if (
          i !== 3 || 
          /tvg-country="IN"|India|Hindi/i.test(key)
        ) {
          if (!seen.has(key)) {
            seen.add(key);
            finalChannels.push(...tempBlock);
          }
        }
      }
    }

    const finalPlaylist = "#EXTM3U\n" + finalChannels.join("\n");

    res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
    res.setHeader("Cache-Control", "s-maxage=600, stale-while-revalidate=1200"); // ⚡ 10 min cache

    res.status(200).send(finalPlaylist);

  } catch (e) {
    res.status(500).send("Error: " + e.message);
  }
}