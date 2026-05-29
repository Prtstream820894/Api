export default async function handler(req, res) {
  try {
    const targetUrl = "https://www.watch-movies.com.pk/";

    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
      },
    });

    const html = await response.text();

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(200).send(html);
  } catch (err) {
    res.status(500).json({
      error: err.toString(),
    });
  }
}