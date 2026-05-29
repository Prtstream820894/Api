import stream from 'stream';
import { promisify } from 'util';

const pipeline = promisify(stream.pipeline);

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

    // 1. 🔥 iframe ब्लॉक करने वाले सिक्योरिटी हेडर्स को हटाना
    const badHeaders = ['content-security-policy', 'x-frame-options', 'cross-origin-resource-policy', 'clear-site-data'];
    response.headers.forEach((value, key) => {
      if (!badHeaders.includes(key.toLowerCase())) {
        res.setHeader(key, value);
      }
    });

    // iFrames को हर जगह अलाउ करने के लिए हेडर ओवरराइड करें
    res.setHeader("X-Frame-Options", "ALLOWALL");
    res.setHeader("Access-Control-Allow-Origin", "*");

    const contentType = response.headers.get("content-type") || "";

    // 2. HTML प्रोसेसिंग (इसमें Regex रिप्लेसमेंट जरूरी है)
    if (contentType.includes("text/html")) {
      let html = await response.text();

      // Base tag injection
      html = html.replace(/<head>/i, `<head><base href="${base}/">`);

      const rewrite = (attr) => {
        const regex = new RegExp(`${attr}="(.*?)"`, "gi");
        html = html.replace(regex, (match, p1) => {
          try {
            // अगर पहले से प्रॉक्सी है या एब्सोल्यूट पाथ है तो ठीक करें
            if (p1.startsWith('/api/proxy') || p1.startsWith('data:')) return match;
            const newUrl = new URL(p1, target).href;
            return `${attr}="/api/proxy?url=${encodeURIComponent(newUrl)}"`;
          } catch {
            return match;
          }
        });
      };

      rewrite("href");
      rewrite("src");
      rewrite("data-src");
      rewrite("poster");

      // Srcset फिक्स
      html = html.replace(/srcset="(.*?)"/gi, (match, p1) => {
        try {
          return `srcset="${p1.split(",").map(part => {
            let [url, size] = part.trim().split(/\s+/);
            if (!url || url.startsWith('data:')) return part;
            const newUrl = new URL(url, target).href;
            return `/api/proxy?url=${encodeURIComponent(newUrl)} ${size || ""}`;
          }).join(", ")}"`;
        } catch {
          return match;
        }
      });

      return res.send(html);
    }

    // 3. 🔥 सुपर फ़ास्ट लोडिंग: बाइनरी फाइल्स (Images, CSS, JS) के लिए STREAMS का उपयोग
    // इससे सर्वर को पूरी फाइल डाउनलोड होने का इंतजार नहीं करना पड़ता
    if (response.body) {
      await pipeline(response.body, res);
    } else {
      res.end();
    }

  } catch (err) {
    console.error(err);
    if (!res.headersSent) {
      return res.status(500).send("Proxy Error: " + err.toString());
    }
  }
}
