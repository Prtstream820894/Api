export default async function handler(req, res) {
  let current_cookie = ""; 

  const new_playlist_url = "https://game.denver69.fun/Jtv/8qpUVH/Playlist.m3u";
  const fallback_url = "https://serv.vodep39240327.workers.dev/channel/raw?=m3u";
  const default_fallback_cookie = "hdntl=exp=1785499260~acl=%2f*~id=f4259cda851c7a4eaf1a3a64027227b0~data=hdntl~hmac=75637db8b9691f231d00d9095e1c7961ed59c3fc371020edcc7fe373c7b5ba08";

  if (current_cookie && current_cookie.trim() !== "") {
    return res.status(200).send(`
      <h3>🍪 Pre-configured Cookie:</h3>
      ${current_cookie}
    `);
  }

  let extracted_cookie = null;

  try {
    // Browser jaisa realistic header bhejna zaroori hai taaki server empty response na de
    const response = await fetch(new_playlist_url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Referer": "https://game.denver69.fun/"
      }
    });

    if (response.ok) {
      const text = await response.text();
      const lines = text.split("\n");

      for (let i = 0; i < lines.length; i++) {
        const currentLine = lines[i];

        if (currentLine.toLowerCase().includes("jcevent")) {
          let match = currentLine.match(/Cookie=([^&\s]+)/i);

          if (!match) {
            for (let j = i - 1; j >= Math.max(0, i - 4); j--) {
              const upperLine = lines[j];
              match = upperLine.match(/http-cookie=(.+)/i) || 
                      upperLine.match(/"Cookie":"([^"]+)"/i) || 
                      upperLine.match(/Cookie=([^&\s]+)/i);
              if (match) break;
            }
          }

          if (match) {
            extracted_cookie = match[1].trim();
            break;
          }
        }
      }
    }
  } catch (err) {
    console.log("New playlist fetch failed, trying fallback...");
  }

  // Agar Denver se na mile toh fallback server try karo
  if (!extracted_cookie) {
    try {
      const response = await fetch(fallback_url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
      });

      if (response.ok) {
        const text = await response.text();
        const lines = text.split("\n");

        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes("JC_ColorsHD.m3u8")) {
            const extinf = lines[i - 1] || "";
            const match = extinf.match(/"Cookie":"([^"]+)"/);
            if (match) {
              extracted_cookie = match[1];
            }
            break;
          }
        }
      }
    } catch (err) {
      console.log("Fallback server also failed.");
    }
  }

  const final_cookie = extracted_cookie || default_fallback_cookie;
  const source_label = extracted_cookie ? "Live Extracted Cookie (Denver)" : "Default Cookie (Fallback)";

  res.status(200).send(`
    <h3>🍪 ${source_label}:</h3>
    ${final_cookie}
  `);
}
