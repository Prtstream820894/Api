export default async function handler(req, res) {
  const default_cookie = "hdntl=exp=1777939236~acl=%2f*~id=35a06b18aad46dfe25eb743560f8593f~data=hdntl~hmac=a4494d6e19f0e7cc28f05f4bc1f6ec8ef05f957e82b72d615735fff80c183c71";

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
