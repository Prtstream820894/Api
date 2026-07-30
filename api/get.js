export default async function handler(req, res) {
  const default_cookie = "hdntl=exp=1785499260~acl=%2f*~id=f4259cda851c7a4eaf1a3a64027227b0~data=hdntl~hmac=75637db8b9691f231d00d9095e1c7961ed59c3fc371020edcc7fe373c7b5ba08";

  const url = "https://serv.vodep39240327.workers.dev/channel/raw?=m3u";

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
