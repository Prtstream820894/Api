export default async function handler(req, res) {
  try {
    // 🎯 Ab sirf do hi playlist fetch hongi (zeehdk ko remove kar diya hai)
    const urls = [
      "https://fancy-morning-a287.poonamchouhan076.workers.dev/",
      "https://tight-firefly-ecdd.poonamchouhan076.workers.dev/"
    ];

    // ⚡ Hamesha latest data lene ke liye cache bypass
    const timestamp = Date.now();

    const responses = await Promise.all(
      urls.map(url => {
        const freshUrl = url.includes('?') ? `${url}&_t=${timestamp}` : `${url}?_t=${timestamp}`;
        
        return fetch(freshUrl, {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        })
          .then(r => {
            if (!r.ok) throw new Error(`HTTP error! status: ${r.status}`);
            return r.text();
          })
          .catch(err => {
            console.error(`Failed to fetch ${url}:`, err);
            return ""; 
          });
      })
    );

    const seen = new Set();
    let finalChannels = [];

    for (let text of responses) {
      if (!text) continue; 
      
      const lines = text.replace("#EXTM3U", "").trim().split("\n");
      let tempBlock = [];

      for (let line of lines) {
        if (line.startsWith("#EXTINF")) {
          if (tempBlock.length) {
            processAndAddBlock(tempBlock, seen, finalChannels);
            tempBlock = [];
          }
        }
        if (line.trim() !== "") {
          tempBlock.push(line);
        }
      }

      if (tempBlock.length) {
        processAndAddBlock(tempBlock, seen, finalChannels);
      }
    }

    const finalPlaylist = "#EXTM3U\n" + finalChannels.join("\n");

    // Live streaming ke liye strong cache control headers
    res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    
    res.status(200).send(finalPlaylist);

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

// 🛠️ ZeeHD filter aur duplicate remover function
function processAndAddBlock(block, seen, finalChannels) {
  const extinfLine = block[0];
  const urlLine = block.find(line => line && !line.startsWith("#")); 

  // 1. Agar bache hue do links mein bhi koi ZeeHD ka channel ho toh remove ho jaye
  const blockString = block.join(" ").toLowerCase();
  if (blockString.includes("zeehd") || blockString.includes("zee hd")) {
    return; 
  }

  // 2. Duplicate remove karne ke liye URL key check
  const key = urlLine ? urlLine.trim() : extinfLine;
  
  if (key && !seen.has(key)) {
    seen.add(key);
    finalChannels.push(...block);
  }
}
