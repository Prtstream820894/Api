export default async function handler(req, res) {
  try {
    const url = "https://ipl2020-46d2f.firebaseio.com/Webplalist.json";

    const response = await fetch(url);
    const text = await response.text(); // raw response

    console.log("Firebase Raw:", text);

    const data = JSON.parse(text);

    let m3u = "#EXTM3U\n\n";

    const items = Array.isArray(data) ? data : Object.values(data || {});

    items.forEach(item => {
      if (!item.url) return;

      m3u += `#EXTINF:-1 group-title="${item.group || "Other"}" tvg-logo="${item.logo || ""}",${item.name || "No Name"}\n`;
      m3u += `${item.url}\n\n`;
    });

    res.setHeader("Content-Type", "text/plain");
    res.status(200).send(m3u || "EMPTY PLAYLIST");

  } catch (err) {
    res.status(500).send("ERROR: " + err.message);
  }
}
