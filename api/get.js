export default async function handler(req, res) {
  // 1. Agar yahan pehle se hi cookie dali hui hai, toh yeh direct wahi use kar lega
  let current_cookie = ""; 

  const new_playlist_url = "https://game.denver69.fun/Jtv/8qpUVH/Playlist.m3u";
  const fallback_url = "https://serv.vodep39240327.workers.dev/channel/raw?=m3u";
  const default_fallback_cookie = "hdntl=exp=1785499260~acl=%2f*~id=f4259cda851c7a4eaf1a3a64027227b0~data=hdntl~hmac=75637db8b9691f231d00d9095e1c7961ed59c3fc371020edcc7fe373c7b5ba08";

  // Agar code ke andar pehle se cookie set hai toh wahi bhej do
  if (current_cookie && current_cookie.trim() !== "") {
    return res.status(200).send(`
      <h3>🍪 Pre-configured Cookie:</h3>
      ${current_cookie}
    `);
  }

  let extracted_cookie = null;

  try {
    // 2. Step 2: Nayi playlist se fetch karke try karo
    const response = await fetch(new_playlist_url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "*/*"
      }
    });

    const text = await response.text();
    const lines = text.split("\n");

    for (let i = 0; i < lines.length; i++) {
      // Jise 'jcevents' ya 'JC_ColorsHD' se start hone wala link mile
      if (lines[i].includes("jcevents.hotstar.com") || lines[i].includes("JC_ColorsHD")) {
        const line = lines[i];
        // URL ke and ya EXTVLCOPT se cookie nikalne ka tareeqa
        let match = line.match(/Cookie=([^&]+)/);
        if (!match) {
          // Agar EXTVLCOPT format me ho upar wali line me
          const optLine = lines[i - 2] || "";
          match = optLine.match(/http-cookie=(.+)/);
        }

        if (match) {
          extracted_cookie = match[1].trim();
          break;
        }
      }
    }
  } catch (err) {
    console.log("New playlist fetch failed, trying fallback...");
  }

  // 3. Step 3: Agar nayi playlist se na mile, toh purane raw server se try karo
  if (!extracted_cookie) {
    try {
      const response = await fetch(fallback_url, {
        headers: {
          "User-Agent": "Mozilla/5.0",
          "Accept": "*/*"
        }
      });

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
    } catch (err) {
      console.log("Fallback server also failed.");
    }
  }

  // Final Output: Agar kahin se bhi cookie mil jaye toh wo do, warna hardcoded default do
  const final_cookie = extracted_cookie || default_fallback_cookie;
  const source_label = extracted_cookie ? "Live Extracted Cookie" : "Default Cookie (Fallback)";

  res.status(200).send(`
    <h3>🍪 ${source_label}:</h3>
    ${final_cookie}
  `);
}
