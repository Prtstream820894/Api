export default async function handler(req, res) {
  try {
    const url = "https://ipl2020-46d2f.firebaseio.com/Webplalist.json";

    const response = await fetch(url);
    const data = await response.json();

    let m3u = "#EXTM3U\n\n";

    const items = Array.isArray(data) ? data : Object.values(data);

    items.forEach(item => {
      // Skip agar url nahi hai
      if (!item.url) return;

      m3u += `#EXTINF:-1 group-title="${item.group || "Other"}" tvg-logo="${item.logo || ""}",${item.name || "No Name"}\n`;
      m3u += `${item.url}\n\n`;
    });

    res.setHeader("Content-Type", "application/x-mpegURL");
    res.status(200).send(m3u);

  } catch (error) {
    res.status(500).send("Error generating playlist");
  }
}