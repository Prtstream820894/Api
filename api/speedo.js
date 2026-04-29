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
    const { play } = req.query;
    const host = `https://${req.headers.host}`;

    try {
        // --- PLAY MODE (Jab App video request karega) ---
        if (play) {
            const officialSite = await getLiveDomain(["https://prmovies.pizza/", "https://prmovies.to/"]);
            const streamBase = await getLiveDomain(["https://speedostream1.com/", "https://speedostream.com/"]);
            const targetHost = new URL(streamBase).host;
            const embedUrl = `${streamBase.replace(/\/$/, "")}/embed-${play}.html`;

            const streamRes = await fetch(embedUrl, {
                headers: { "User-Agent": "Mozilla/5.0", "Referer": officialSite },
                timeout: 5000
            });

            const source = await streamRes.text();
            const decoded = unpack(source);
            const m3u8Regex = /(https?[:\/\/\w\.\-\%\!\?\&\=\,]+?\.m3u8[^\s"']*)/i;
            const match = decoded.match(m3u8Regex) || source.match(m3u8Regex);

            if (match) {
                const directUrl = match[1].replace(/\\/g, '');
                // Apps ke liye Referer aur Origin zaroori hain
                const finalUrl = `${directUrl}|Referer=https://${targetHost}/&Origin=https://${targetHost}`;
                
                // Hum direct redirect karenge, agar player smart hai toh uthalega
                res.redirect(302, finalUrl);
                return;
            }
            return res.status(404).send("Stream Link Not Found");
        }

        // --- LIST MODE (M3U8 Playlist generate karega) ---
        const jsonRes = await fetch("https://ipl2020-46d2f.firebaseio.com/Json.json");
        const data = await jsonRes.json();

        let playlist = "#EXTM3U\n";
        data.forEach(item => {
            const cleanId = item.id.replace(/[^a-zA-Z0-9]/g, '');
            // Aapka Vercel URL jo play mode ko trigger karega
            const playLink = `${host}/api/speedo?play=${cleanId}`;
            
            playlist += `#EXTINF:-1 tvg-id="${item.id}" tvg-logo="${item.logo}" group-title="${item.group}",${item.name}\n${playLink}\n`;
        });

        res.setHeader('Content-Type', 'application/x-mpegurl'); // Correct M3U Type
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.status(200).send(playlist);

    } catch (err) {
        res.status(500).send("#EXTM3U\n#ERROR: " + err.message);
    }
};
