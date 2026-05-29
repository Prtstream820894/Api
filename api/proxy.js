import { Readable } from 'stream';

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
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
        "referer": base,
        "origin": base,
      },
    });

    const contentType = response.headers.get("content-type") || "";
    res.setHeader("Content-Type", contentType);

    // ⚡ अगर HTML पेज है तो URL बदलें
    if (contentType.includes("text/html")) {
      let html = await response.text();

      // Base tag जोड़ें ताकि अधूरे URL अपने आप बेस URL से लोड हों
      html = html.replace(/<head>/i, `<head><base href="${base}/">`);

      const rewrite = (attr) => {
        const regex = new RegExp(`${attr}="(.*?)"`, "gi");
        html = html.replace(regex, (match, p1) => {
          try {
            // अगर URL पहले से ही प्रॉक्सी का है या डेटा URI है तो न बदलें
            if (p1.startsWith("data:") || p1.includes("/api/proxy")) return match;
            const newUrl = new URL(p1, target).href;
            return `${attr}="/api/proxy?url=${encodeURIComponent(newUrl)}"`;
          } catch {
            return match;
          }
        });
      };

      // महत्वपूर्ण एट्रिब्यूट्स बदलें
      rewrite("href");
      rewrite("src");
      rewrite("data-src");
      rewrite("poster");

      // srcset फिक्स
      html = html.replace(/srcset="(.*?)"/gi, (match, p1) => {
        try {
          const parts = p1.split(",");
          const newParts = parts.map(part => {
            let [url, size] = part.trim().split(/\s+/);
            if (!url) return part;
            const newUrl = new URL(url, target).href;
            return `/api/proxy?url=${encodeURIComponent(newUrl)} ${size || ""}`;
          });
          return `srcset="${newParts.join(", ")}"`;
        } catch {
          return match;
        }
      });

      return res.send(html);
    }

    // ⚡ फ़ास्ट लोडिंग के लिए (इमेज/CSS/JS) को सीधे स्ट्रीम करें (ArrayBuffer की जरूरत नहीं)
    if (response.body) {
      const nodeStream = Readable.fromWeb(response.body);
      nodeStream.pipe(res);
    } else {
      const buffer = await response.arrayBuffer();
      return res.send(Buffer.from(buffer));
    }

  } catch (err) {
    console.error(err);
    return res.status(500).send("Proxy Error: " + err.toString());
  }
}
