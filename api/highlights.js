export default async function handler(req, res) {
  try {
    const url = "https://www.iplt20.com/videos/highlights";

    const response = await fetch(url, {
      headers: { "user-agent": "Mozilla/5.0" }
    });

    const html = await response.text();

    // ✅ Sirf "Match Highlights" section pakdo
    const sectionMatch = html.split("Match Highlights")[1];

    if (!sectionMatch) {
      return res.send("Section not found");
    }

    // ❌ Upar ka hero part already cut ho gaya
    const cleanHtml = sectionMatch;

    // 🎯 Sirf cards pakdo
    const regex = /<a[^>]+href="([^"]+)"[^>]*>[\s\S]*?<img[^>]+src="([^"]+)"[\s\S]*?<h[0-9][^>]*>(.*?)<\/h[0-9]>/gi;

    let m3u = "#EXTM3U\n\n";
    let match;

    while ((match = regex.exec(cleanHtml)) !== null) {
      let link = match[1];
      let img = match[2];
      let title = match[3].replace(/<[^>]+>/g, "").trim();

      // sirf highlights links allow
      if (!link.includes("/videos/highlights/")) continue;

      if (!link.startsWith("http")) {
        link = "https://www.iplt20.com" + link;
      }

      m3u += `#EXTINF:-1 group-title="IPL Highlights" tvg-logo="${img}",${title}\n${link}\n\n`;
    }

    res.setHeader("content-type", "text/plain");
    res.send(m3u);

  } catch (e) {
    res.send("Error: " + e.message);
  }
}