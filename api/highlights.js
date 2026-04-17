export default async function handler(req, res) {
  try {
    const url = "https://www.hotstar.com/in/browse/editorial/tata-ipl-2026-highlights/1271615359";

    const response = await fetch(url);
    const html = await response.text();

    // NEXT DATA extract
    const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/);

    if (!match) {
      return res.status(500).send("Data not found");
    }

    const json = JSON.parse(match[1]);

    // Path thoda change ho sakta hai future me
    const items =
      json?.props?.pageProps?.initialState?.content?.items || [];

    let m3u = "#EXTM3U\n\n";

    items.forEach(item => {
      const title = item?.title || "No Title";
      const img = item?.images?.horizontal?.[0]?.url || "";
      const slug = item?.slug || "";

      const link = "https://www.hotstar.com" + slug;

      m3u += `#EXTINF:-1 group-title="IPL Highlights" tvg-logo="${img}",${title}\n${link}\n\n`;
    });

    res.setHeader("Content-Type", "text/plain");
    res.send(m3u);

  } catch (e) {
    res.status(500).send("Error: " + e.message);
  }
}