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
        // --- PLAY MODE ---
        if (play) {
            play = play.replace('.m3u8', '');
            const officialSite = await getLiveDomain(["https://prmovies.pizza/", "https://prmovies.to/"]);
            const streamBase = await getLiveDomain(["https://speedostream1.com/", "https://speedostream.com/"]);
            const embedUrl = `${streamBase.replace(/\/$/, "")}/embed-${play}.html`;

            const streamRes = await fetch(embedUrl, {
                headers: { 
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", 
                    "Referer": officialSite 
                },
                timeout: 5000
            });

            const source = await streamRes.text();
            const decoded = unpack(source);
            const m3u8Regex = /(https?[:\/\/\w\.\-\%\!\?\&\=\,]+?\.m3u8[^\s"']*)/i;
            const match = decoded.match(m3u8Regex) || source.match(m3u8Regex);

            if (match) {
                const finalM3u8 = match[1].replace(/\\/g, '');
                res.redirect(302, finalM3u8);
                return;
            }
            return res.status(404).send("Link not found");
        }

        // --- LIST MODE (Yahan headers add kiye gaye hain) ---
        const jsonRes = await fetch("https://ipl2020-46d2f.firebaseio.com/Json.json");
        let text = await jsonRes.text();
        text = text.replace(/,[ \t\r\n]*([\]}])/g, '$1');
        const data = JSON.parse(text);

        // Header constant (aap chahein toh ise getLiveDomain se dynamic bhi bana sakte hain)
        const headersuffix = "|Referer=https://speedostream1.com/&Origin=https://speedostream1.com";

        let playlist = "#EXTM3U\n";
        if (Array.isArray(data)) {
            data.forEach(item => {
                if (item && item.id) {
                    const cleanId = item.id.replace(/[^a-zA-Z0-9]/g, '');
                    // Link ke peeche headers suffix add kar diya
                    const playLink = `${host}/api/speedo/${cleanId}.m3u8${headersuffix}`;
                    
                    playlist += `#EXTINF:-1 tvg-id="${item.id}" tvg-logo="${item.logo || ''}" group-title="${item.group || 'Movies'}",${item.name || 'No Name'}\n${playLink}\n`;
                }
            });
        }

        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.status(200).send(playlist);

    } catch (err) {
        res.status(500).send("#EXTM3U\n#ERROR: " + err.message);
    }
};
