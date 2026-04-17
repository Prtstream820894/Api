export default async function handler(req, res) {
  try {
    const pageUrl = "https://www.iplt20.com/videos/highlights";

    const response = await fetch(pageUrl, {
      headers: {
        "user-agent": "Mozilla/5.0"
      }
    });

    const html = await response.text();

    // Find all highlight cards only from list section
    const cardRegex = /<a[^>]+href="([^"]*highlights[^"]*)"[^>]*>[\s\S]*?<img[^>]+src="([^"]+)"[\s\S]*?<h[0-9][^>]*>(.*?)<\/h[0-9]>/gi;

    let m3u = "#EXTM3U\n\n";
    let match;
    let count = 0;

    while ((match = cardRegex.exec(html)) !== null) {
      let url = match[1];
      let img = match[2];
      let title = match[3].replace(/<[^>]+>/g, "").trim();

      if (!url.startsWith("http")) {
        url = "https://www.iplt20.com" + url;
      }

      m3u += `#EXTINF:-1 group-title="IPL Highlights" tvg-logo="${img}",${title}\n${url}\n\n`;
      count++;
    }

    if (!count) {
      return res.status(500).send("No highlights found");
    }

    res.setHeader("content-type", "text/plain");
    res.send(m3u);

  } catch (e) {
    res.status(500).send("Error: " + e.message);
  }
}