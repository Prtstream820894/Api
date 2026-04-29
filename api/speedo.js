const fetch = require('node-fetch');

function unpack(code) {
    try {
        const evalPattern = /eval\(function\(p,a,c,k,e,d\).+?\}\('(.+?)',(\d+),(\d+),'(.+?)'\.split\('\|'\)\)\)/;
        const evalContent = code.match(evalPattern);
        if (evalContent) {
            let [_, p, a, c, k] = evalContent;
            a = parseInt(a); c = parseInt(c); k = k.split('|');
            while (c--) { if (k[c]) p = p.replace(new RegExp('\\b' + c.toString(a) + '\\b', 'g'), k[c]); }
            return p;
        }
    } catch (e) {}
    return code;
}

async function getLiveDomain(testUrls) {
    for (let url of testUrls) {
        try {
            const res = await fetch(url, { method: 'HEAD', timeout: 2000 });
            if (res.ok) return new URL(res.url).origin + "/";
        } catch (e) {}
    }
    return testUrls[0];
}

module.exports = async (req, res) => {
    let { play } = req.query;
    const host = `https://${req.headers.host}`;

    try {
        if (play) {
            play = play.replace('.m3u8', '');

            const officialSite = await getLiveDomain(["https://prmovies.pizza/", "https://prmovies.to/"]);
            const streamBase = await getLiveDomain(["https://speedostream1.com/", "https://speedostream.com/"]);
            const targetHost = new URL(streamBase).origin;
            const embedUrl = `${streamBase.replace(/\/$/, "")}/embed-${play}.html`;

            // 1. Pehle page fetch karo
            const streamRes = await fetch(embedUrl, {
                headers: { "User-Agent": "Mozilla/5.0", "Referer": officialSite },
                timeout: 5000
            });

            const source = await streamRes.text();
            const decoded = unpack(source);
            const m3u8Regex = /(https?[:\/\/\w\.\-\%\!\?\&\=\,]+?\.m3u8[^\s"']*)/i;
            const match = decoded.match(m3u8Regex) || source.match(m3u8Regex);

            if (match) {
                const finalM3u8 = match[1].replace(/\\/g, '');
                
                // 2. AB PROXY: Player ko redirect karne ke bajaye, hum link ka content mangwayenge
                const videoRes = await fetch(finalM3u8, {
                    headers: {
                        "User-Agent": "Mozilla/5.0",
                        "Referer": targetHost + "/",
                        "Origin": targetHost
                    }
                });

                const m3u8Content = await videoRes.text();

                // 3. Sabse zaruri: .m3u8 content ke andar ke paths ko fix karna
                // Hum content wahi bhejenge jo link ke andar hai
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
                return res.status(200).send(m3u8Content);
            }
            return res.status(404).send("Link Not Found");
        }

        // --- LIST MODE (Playlist) ---
        const jsonRes = await fetch("https://ipl2020-46d2f.firebaseio.com/Json.json");
        let data = await jsonRes.json();

        let playlist = "#EXTM3U\n";
        data.forEach(item => {
            if (item && item.id) {
                const cleanId = item.id.replace(/[^a-zA-Z0-9]/g, '');
                const playLink = `${host}/api/speedo/${cleanId}.m3u8`;
                playlist += `#EXTINF:-1 tvg-id="${item.id}" tvg-logo="${item.logo || ''}" group-title="${item.group || 'Movies'}",${item.name || 'No Name'}\n${playLink}\n`;
            }
        });

        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.status(200).send(playlist);

    } catch (err) {
        res.status(500).send("Error: " + err.message);
    }
};
