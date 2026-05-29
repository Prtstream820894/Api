export default async function handler(req, res) {
  try {
    let target = req.query.url;

    if (!target) {
      return res.status(400).send("URL missing");
    }

    // अगर http नहीं है तो add कर देंगे
    if (!target.startsWith("http")) {
      target = "https://" + target;
    }

    const base = new URL(target).origin;

    const response = await fetch(target, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
      },
    });

    let contentType = response.headers.get("content-type");

    // अगर HTML है तभी rewrite करेंगे
    if (contentType && contentType.includes("text/html")) {
      let html = await response.text();

      // 🔥 सभी links proxy से गुजरेंगे
      html = html.replace(/href="(.*?)"/g, (match, p1) => {
        if (p1.startsWith("http")) {
          return `href="/api/proxy?url=${encodeURIComponent(p1)}"`;
        }
        return `href="/api/proxy?url=${encodeURIComponent(base + p1)}"`;
      });

      html = html.replace(/src="(.*?)"/g, (match, p1) => {
        if (p1.startsWith("http")) {
          return `src="/api/proxy?url=${encodeURIComponent(p1)}"`;
        }
        return `src="/api/proxy?url=${encodeURIComponent(base + p1)}"`;
      });

      res.setHeader("Content-Type", "text/html");
      return res.send(html);
    } else {
      // CSS / JS / Image direct pass
      const buffer = await response.arrayBuffer();
      res.setHeader("Content-Type", contentType || "application/octet-stream");
      return res.send(Buffer.from(buffer));
    }
  } catch (err) {
    res.status(500).send("Error: " + err.toString());
  }
}