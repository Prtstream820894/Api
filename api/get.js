export default async function handler(req, res) {
  const default_cookie = "hdntl=exp=1779193603~acl=%2f*~id=5e9e3b4f66b8c7a4ba448b0232acace5~data=hdntl~hmac=4dc8adecb0746b69e0a6f7e0f925736d2974925bf647fe4010d6261692e0c858";

  const url = "https://server.vodep39240327.workers.dev/channel/raw?=m3u";

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "*/*"
      }
    });

    const text = await response.text();
    let cookie_found = false;

    const lines = text.split("\n");

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes("JC_ColorsHD.m3u8")) {
        const extinf = lines[i - 1] || "";

        const match = extinf.match(/"Cookie":"([^"]+)"/);

        if (match) {
          res.status(200).send(`
            <h3>🍪 Live Cookie:</h3>
            ${match[1]}
          `);
          cookie_found = true;
        }
        break;
      }
    }

    if (!cookie_found) {
      res.status(200).send(`
        <h3>⚠️ Default Cookie (Fallback):</h3>
        ${default_cookie}
      `);
    }

  } catch (err) {
    res.status(500).send(`
      <h3>❌ Error:</h3>
      ${default_cookie}
    `);
  }
}
