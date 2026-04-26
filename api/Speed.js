export default async function handler(req, res) {
  try {
    // 🔗 JSON URL (tumhara)
    const jsonUrl = "https://ipl2020-46d2f.firebaseio.com/Json.json";

    // Fetch JSON
    const response = await fetch(jsonUrl);
    let text = await response.text();

    // Fix JSON format (agar trailing comma ho)
    text = text.replace(/,\s*([\]}])/g, '$1');

    let json = JSON.parse(text);

    // 🔥 IMPORTANT: structure handle
    let data;
    if (Array.isArray(json)) {
      data = json;
    } else if (json.data) {
      data = json.data;
    } else {
      return res.status(500).send("#EXTM3U\n#EXTINF:-1,No Data Found");
    }

    // 🌐 Domains
    const prmoviesDomains = [
      "https://prmovies.pizza/",
      "https://prmovies.to/",
      "https://prmovies.vc/"
    ];

    const speedoDomains = [
      "https://speedostream1.com/",
      "https://speedostream2.com/",
      "https://speedostream.com/"
    ];

    // ✅ Live domain finder
    async function getLiveDomain(domains) {
      for (let url of domains) {
        try {
          const r = await fetch(url, { method: "HEAD" });
          if (r.ok) return url;
        } catch {}
      }
      return domains[0];
    }

    const officialSite = await getLiveDomain(prmoviesDomains);
    const streamBase = await getLiveDomain(speedoDomains);

    let playlist = "#EXTM3U\n";

    // 🔁 Loop
    for (let item of data) {
      try {
        if (!item.id || !item.title) continue;

        const id = item.id.toString().replace(/[^a-zA-Z0-9]/g, "");
        const embedUrl = `${streamBase}play/${id}`;

        const streamRes = await fetch(embedUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0",
            "Referer": officialSite,
            "Origin": officialSite
          }
        });

        let source = await streamRes.text();

        // 🎯 Extract m3u8
        const match = source.match(/(https?:\/\/[^"' ]+\.m3u8[^"' ]*)/);

        if (match) {
          const m3u8 = match[1];
          const finalUrl = `${m3u8}|Referer=${officialSite}`;

          playlist += `#EXTINF:-1 tvg-id="${id}" group-title="Movies",${item.title}\n`;
          playlist += finalUrl + "\n";
        }

      } catch (e) {
        // skip error
      }
    }

    // ⚠️ Agar empty hua
    if (playlist.trim() === "#EXTM3U") {
      playlist += "#EXTINF:-1,No Data Found\nhttps://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8";
    }

    // 📤 Response
    res.setHeader("Content-Type", "text/plain");
    res.setHeader("Access-Control-Allow-Origin", "*");

    res.status(200).send(playlist);

  } catch (err) {
    res.status(500).send("#EXTM3U\n#EXTINF:-1,Error\n" + err.message);
  }
      }
