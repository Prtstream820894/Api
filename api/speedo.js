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
            // node-fetch mein timeout handle karne ke liye AbortSignal ka use karein ya bina timeout ke test karein
            const res = await fetch(url, { method: 'HEAD' });
            if (res.ok) return new URL(res.url).origin + "/";
        } catch (e) {}
    }
    return testUrls[0];
}

module.exports = async (req, res) => {
    // CORS headers basic allow-all
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    
    let { play } = req.query;
    const host = `https://${req.headers.host}`;

    try {
        // --- PLAY MODE ---
        if (play) {
            play = play.replace('.m3u8', '');
            const officialSite = await getLiveDomain(["https://prmovies.recipes/", "https://yomovies.foundation/"]);
            const streamBase = await getLiveDomain(["https://speedostream1.com/", "https://speedostream.com/"]);
            const embedUrl = `${streamBase.replace(/\/$/, "")}/embed-${play}.html`;

            const streamRes = await fetch(embedUrl, {
                headers: { 
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", 
                    "Referer": officialSite 
                }
            });

            const source = await streamRes.text();
            const decoded = unpack(source);
            const m3u8Regex = /(https?[:\/\/\w\.\-\%\!\?\&\=\,]+?\.m3u8[^\s"']*)/i;
            const match = decoded.match(m3u8Regex) || source.match(m3u8Regex);

            if (match) {
                const finalM3u8 = match[1].replace(/\\/g, '');
                return res.redirect(302, finalM3u8);
            }
            return res.status(404).send("Link not found");
        }

        // --- LIST MODE ---
        const jsonRes = await fetch("https://ipl2020-46d2f.firebaseio.com/Json.json");
        if (!jsonRes.ok) {
            throw new Error(`Firebase returned status ${jsonRes.status}`);
        }
        
        let text = await jsonRes.text();
        
        // Trailing commas remove karne ke liye safe cleaner
        try {
            text = text.replace(/,[ \t\r\n]*([\]}])/g, '$1');
        } catch(err) {}

        let data;
        try {
            data = JSON.parse(text);
        } catch (parseErr) {
            return res.status(500).send("#EXTM3U\n#ERROR: JSON Parsing Failed. Check database response.");
        }

        const headersuffix = "|Referer=https://speedostream1.com/&Origin=https://speedostream1.com";
        let playlist = "#EXTM3U\n";

        if (Array.isArray(data)) {
            data.forEach(item => {
                if (item && item.id) {
                    const cleanId = item.id.replace(/[^a-zA-Z0-9]/g, '');
                    const playLink = `${host}/api/speedo/${cleanId}.m3u8${headersuffix}`;
                    playlist += `#EXTINF:-1 tvg-id="${item.id}" tvg-logo="${item.logo || ''}" group-title="${item.group || 'Movies'}",${item.name || 'No Name'}\n${playLink}\n`;
                }
            });
        } else if (data && typeof data === 'object') {
            // Agar Firebase ka data object roop mein aa raha hai toh:
            Object.keys(data).forEach(key => {
                const item = data[key];
                if (item && item.id) {
                    const cleanId = item.id.replace(/[^a-zA-Z0-9]/g, '');
                    const playLink = `${host}/api/speedo/${cleanId}.m3u8${headersuffix}`;
                    playlist += `#EXTINF:-1 tvg-id="${item.id}" tvg-logo="${item.logo || ''}" group-title="${item.group || 'Movies'}",${item.name || 'No Name'}\n${playLink}\n`;
                }
            });
        }

        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        return res.status(200).send(playlist);

    } catch (err) {
        // Taaki crash hone par error message M3U ke andhar saaf dikhe
        return res.status(200).send("#EXTM3U\n#ERROR: " + err.message);
    }
};
