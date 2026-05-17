export default async function handler(req, res) {
  const default_cookie = "hdntl=exp=1779062452~acl=%2f*~id=18e1c4a3f60c5b14f96603aaf31ce07d~data=hdntl~hmac=a1fe9a9edf4ba0a4d44d84664b3c0c3e301845382b9a80b24a2e6260c9e5b2da";

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
