const fetch = require('node-fetch');

export default async function handler(req, res) {
  // Aapka Firebase URL
  const jsonUrl = 'https://ipl2020-46d2f.firebaseio.com/Webplalist.json';

  try {
    const response = await fetch(jsonUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch JSON: ${response.statusText}`);
    }

    const data = await response.json();

    // M3U Playlist Start
    let m3u = '#EXTM3U\n';

    // JSON Array parse karna
    // Aapke data mein: id = link, name = title, logo = image, group = category
    data.forEach((item) => {
      const title = item.name || "Untitled";
      const thumbnail = item.logo || "";
      const category = item.group || "Movies";
      const streamLink = item.id || "";

      if (streamLink) {
        // M3U Standard Format
        m3u += `#EXTINF:-1 group-title="${category}" tvg-logo="${thumbnail}",${title}\n`;
        m3u += `${streamLink}\n`;
      }
    });

    // Headers set karein taaki players ise as a playlist accept karein
    res.setHeader('Content-Type', 'application/x-mpegurl');
    res.setHeader('Access-Control-Allow-Origin', '*'); // Sabhi players ke liye access allow
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate'); // 1 minute caching taaki fast chale

    return res.status(200).send(m3u);

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal Server Error", message: error.message });
  }
}
