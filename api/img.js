export default async function handler(req, res) {

  const SOURCE =
    "https://server.vodep39240327.workers.dev/channel/raw?=m3u";

  // ===== 24 HR CACHE =====
  global.cachedPlaylist ??= null;
  global.cacheTime ??= 0;

  const now = Date.now();

  // ===== RETURN CACHE =====
  if (
    global.cachedPlaylist &&
    (now - global.cacheTime) < 86400000
  ) {

    res.setHeader("Content-Type", "text/plain");
    return res.status(200).send(global.cachedPlaylist);
  }

  try {

    // ===== FETCH SOURCE =====
    const response = await fetch(SOURCE);

    const text = await response.text();

    // ===== START / END SECTION =====
    const start =
      text.indexOf(
        "# ----------=== VT OTT | TP ===--------------"
      );

    const end =
      text.indexOf(
        "# ----------=== Other Channels ===--------------"
      );

    const section =
      text.substring(start, end);

    const lines =
      section.split("\n");

    let output = "#EXTM3U\n\n";

    // ===== LOOP =====
    for (let i = 0; i < lines.length; i++) {

      // ONLY CHANNEL ROW
      if (lines[i].includes("#EXTINF")) {

        const extinf = lines[i];

        let licenseUrl = "";
        let vlc = "";
        let http = "";
        let mpd = "";

        // ===== NEXT LINES =====
        for (let j = i + 1; j < i + 12; j++) {

          const line = lines[j] || "";

          // LICENSE URL
          if (
            line.includes(
              "inputstream.adaptive.license_key="
            )
          ) {

            licenseUrl =
              line
                .split("license_key=")[1]
                ?.trim() || "";
          }

          // VLC
          if (
            line.includes("#EXTVLCOPT")
          ) {
            vlc = line;
          }

          // HTTP
          if (
            line.includes("#EXTHTTP")
          ) {
            http = line;
          }

          // MPD
          if (
            line.startsWith("http") &&
            line.includes(".mpd")
          ) {
            mpd = line;
          }
        }

        // SKIP INVALID
        if (!licenseUrl || !mpd)
          continue;

        // ===== FETCH KEY =====
        let finalKey = "";

        try {

          const keyRes =
            await fetch(licenseUrl, {
              headers: {
                "user-agent":
                  "Mozilla/5.0"
              }
            });

          const keyJson =
            await keyRes.json();

          if (
            !keyJson.keys ||
            !keyJson.keys.length
          ) {
            continue;
          }

          const kid =
            keyJson.keys[0].kid;

          const key =
            keyJson.keys[0].k;

          finalKey =
            `${kid}:${key}`;

        } catch (e) {

          continue;
        }

        // ===== LOGO =====
        const logo =
          extinf.match(
            /tvg-logo="([^"]+)"/
          )?.[1] || "";

        // ===== CHANNEL NAME =====
        const name =
          extinf
            .split(",")
            .pop()
            .trim();

        // ===== FINAL OUTPUT =====
        output +=
`#EXTINF:-1 tvg-logo="${logo}" group-title="Sports", ${name}
#KODIPROP:inputstream.adaptive.license_type=clearkey
#KODIPROP:inputstream.adaptive.license_key=${finalKey}
${vlc}
${http}
${mpd}

`;
      }
    }

    // ===== SAVE CACHE =====
    global.cachedPlaylist =
      output;

    global.cacheTime = now;

    // ===== RESPONSE =====
    res.setHeader(
      "Content-Type",
      "text/plain"
    );

    return res
      .status(200)
      .send(output);

  } catch (err) {

    return res
      .status(500)
      .send("Playlist Error");
  }
}