export default async function handler(req, res) {
  try {
    const api = "https://www.iplt20.com/api/videos?category=highlights";

    const response = await fetch(api, {
      headers: {
        "user-agent": "Mozilla/5.0",
        "accept": "application/json"
      }
    });

    const data = await response.json();

    let m3u = "#EXTM3U\n\n";

    data.forEach(item => {
      const title = item.title;
      const img = item.image;
      const url = "https://www.iplt20.com/videos/" + item.slug;

      m3u += `#EXTINF:-1 group-title="IPL Highlights" tvg-logo="${img}",${title}\n${url}\n\n`;
    });

    res.setHeader("content-type", "text/plain");
    res.send(m3u);

  } catch (e) {
    res.send("Error: " + e.message);
  }
}