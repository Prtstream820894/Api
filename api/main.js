export default async function handler(req, res) {
  try {
    const urls = [
      "https://zeehdk.poonamchouhan076.workers.dev/",
      "https://fancy-morning-a287.poonamchouhan076.workers.dev/",
      "https://tight-firefly-ecdd.poonamchouhan076.workers.dev/"
    ];

    // ⚡ Parallel fetch (agar koi ek link kharab ho toh server crash nahi hoga)
    const responses = await Promise.all(
      urls.map(url => 
        fetch(url)
          .then(r => {
            if (!r.ok) throw new Error(`HTTP error! status: ${r.status}`);
            return r.text();
          })
          .catch(err => {
            console.error(`Failed to fetch ${url}:`, err);
            return ""; // Khali string bhejega taaki baaki links kaam karein
          })
      )
    );

    const seen = new Set();
    let finalChannels = [];

    for (let text of responses) {
      if (!text) continue; // Agar data khali hai toh skip karo
      
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

      // Last block ke liye
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
    res.setHeader("Cache-Control", "public, s-maxage=600, stale-while-revalidate=1200");
    res.status(200).send(finalPlaylist);

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
