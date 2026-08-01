export default async function handler(req, res) {
  const new_playlist_url = "https://game.denver69.fun/Jtv/8qpUVH/Playlist.m3u";
  const default_fallback_cookie = "hdntl=exp=1785499260~acl=%2f*~id=f4259cda851c7a4eaf1a3a64027227b0~data=hdntl~hmac=75637db8b9691f231d00d9095e1c7961ed59c3fc371020edcc7fe373c7b5ba08";

  let extracted_cookie = null;
  let debug_error = null;

  try {
    const response = await fetch(new_playlist_url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "*/*"
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP Error! Status: ${response.status} ${response.statusText}`);
    }

    const text = await response.text();
    const lines = text.split("\n");

    let channelFound = false;

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes("jcevents.hotstar.com") || lines[i].includes("JC_ColorsHD")) {
        channelFound = true;
        const line = lines[i];
        let match = line.match(/Cookie=([^&]+)/);
        
        if (!match) {
          const optLine = lines[i - 2] || "";
          match = optLine.match(/http-cookie=(.+)/);
        }

        if (match) {
          extracted_cookie = match[1].trim();
          break;
        }
      }
    }

    if (!channelFound) {
      debug_error = "Playlist fetched successfully, but target channel ('jcevents.hotstar.com' or 'JC_ColorsHD') was not found inside the playlist.";
    } else if (!extracted_cookie) {
      debug_error = "Target channel found, but failed to extract the cookie from the line format.";
    }

  } catch (err) {
    debug_error = `Failed to fetch Denver playlist: ${err.message}`;
  }

  // Agar Denver se cookie mil gayi toh wo do, warna error print karke default cookie do
  if (extracted_cookie) {
    return res.status(200).send(`
      <h3>🍪 Live Extracted Cookie (Denver):</h3>
      ${extracted_cookie}
    `);
  }

  res.status(200).send(`
    <h3 style="color: red;">❌ Denver Playlist Error:</h3>
    <p>${debug_error}</p>
    <hr>
    <h3>🍪 Fallback Cookie Used:</h3>
    ${default_fallback_cookie}
  `);
}
