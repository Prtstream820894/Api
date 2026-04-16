export default async function handler(req, res) {
  try {
    const urls = [
      "https://fancy-morning-a287.poonamchouhan076.workers.dev/", // 1st
      "https://tight-firefly-ecdd.poonamchouhan076.workers.dev/", // 2nd
      "https://late-hat-1b4a.poonamchouhan076.workers.dev/",      // 3rd
      "https://iptv-org.github.io/iptv/index.m3u"                // 4th (new)
    ];

    const seen = new Set();
    let finalChannels = [];

    for (let url of urls) {
      const text = await fetch(url).then(r => r.text());

      const lines = text.replace("#EXTM3U", "").trim().split("\n");

      let tempBlock = [];

      for (let line of lines) {
        if (line.startsWith("#EXTINF")) {

          if (tempBlock.length) {
            const key = tempBlock[0];

            if (!seen.has(key)) {
              seen.add(key);
              finalChannels.push(...tempBlock);
            }

            tempBlock = [];
          }
        }
        tempBlock.push(line);
      }

      // last block
      if (tempBlock.length) {
        const key = tempBlock[0];
        if (!seen.has(key)) {
          seen.add(key);
          finalChannels.push(...tempBlock);
        }
      }
    }

    const finalPlaylist = "#EXTM3U\n" + finalChannels.join("\n");

    res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
    res.setHeader("Cache-Control", "s-maxage=300");
    res.status(200).send(finalPlaylist);

  } catch (e) {
    res.status(500).send("Error: " + e.message);
  }
}