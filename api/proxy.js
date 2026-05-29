export default async function handler(req, res) {
  try {
    let target = req.query.url;

    if (!target) {
      return res.status(400).send("Missing URL");
    }

    if (!target.startsWith("http")) {
      target = "https://" + target;
    }

    const urlObj = new URL(target);
    const base = urlObj.origin;

    const response = await fetch(target, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
        "referer": base,
        "origin": base,
      },
    });

    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("text/html")) {
      let html = await response.text();

      // Base tag
      html = html.replace(/<head>/i, `<head><base href="${base}/">`);

      const rewrite = (attr) => {
        const regex = new RegExp(`${attr}="(.*?)"`, "gi");
        html = html.replace(regex, (match, p1) => {
          try {
            const newUrl = new URL(p1, target).href;
            return `${attr}="/api/proxy?url=${encodeURIComponent(newUrl)}"`;
          } catch {
            return match;
          }
        });
      };

      // 🔥 All important attributes
      rewrite("href");
      rewrite("src");
      rewrite("data-src");
      rewrite("poster");

      // srcset fix
      html = html.replace(/srcset="(.*?)"/gi, (match, p1) => {
        try {
          const parts = p1.split(",");
          const newParts = parts.map(part => {
            let [url, size] = part.trim().split(" ");
            const newUrl = new URL(url, target).href;
            return `/api/proxy?url=${encodeURIComponent(newUrl)} ${size || ""}`;
          });
          return `srcset="${newParts.join(", ")}"`;
        } catch {
          return match;
        }
      });

      res.setHeader("Content-Type", "text/html");
      return res.send(html);
    }

    // 🔥 Binary files (images, css, js)
    const buffer = await response.arrayBuffer();

    res.setHeader("Content-Type", contentType);
    return res.send(Buffer.from(buffer));

  } catch (err) {
    return res.status(500).send("Proxy Error: " + err.toString());
  }
}