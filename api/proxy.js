export default async function handler(req, res) {
  try {
    const base = "https://www.watch-movies.com.pk";

    const response = await fetch(base, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
      },
    });

    let html = await response.text();

    // 🔥 Fix relative URLs
    html = html.replace(/href="\//g, `href="${base}/`);
    html = html.replace(/src="\//g, `src="${base}/`);

    res.setHeader("Content-Type", "text/html");
    res.status(200).send(html);

  } catch (err) {
    res.status(500).send(err.toString());
  }
}