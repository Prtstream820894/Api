export default async function handler(req, res) {
  try {
    const url = "https://ipl2020-46d2f.firebaseio.com/Webplalist.json";

    const response = await fetch(url);
    const data = await response.json();

    let m3u = "#EXTM3U\n\n";

    // Agar Firebase object return kare instead of array
    const items = Array.isArray(data) ? data : Object.values(data);

    items.forEach(item => {
      m3u += `#EXTINF:-1 group-title="${item.group}" tvg-logo="${item.logo}",${item.name}\n`;
      m3u += `${item.url || item.id}\n\n`;
    });

    res.setHeader("Content-Type", "application/x-mpegURL");
    res.status(200).send(m3u);

  } catch (error) {
    res.status(500).json({ error: "Failed to generate playlist" });
  }
}