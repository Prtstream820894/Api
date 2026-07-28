const fetch = require('node-fetch');

const USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2.1 Safari/605.1.15"
];

function getRandomUserAgent() {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

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
            const res = await fetch(url, { 
                method: 'HEAD',
                headers: { "User-Agent": getRandomUserAgent() }
            });
            if (res.ok) return new URL(res.url).origin + "/";
        } catch (e) {}
    }
    return testUrls[0];
}

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    
    let { play } = req.query;
    const host = `https://${req.headers.host}`;

    try {
        // --- PLAY MODE (Background .m3u8 Extractor - 100% Working Method) ---
        if (play) {
            play = play.replace('.m3u8', '').replace('.html', '');
            const officialSite = await getLiveDomain(["https://prmovies.locker/", "https://yomovies.foundation/"]);
            const streamBase = await getLiveDomain(["https://speedostream1.com/", "https://speedostream.com/"]);
            const embedUrl = `${streamBase.replace(/\/$/, "")}/embed-${play}.html`;

            // Server-to-server request jisme official site ka referer jayega (No "Embeds disabled" error)
            const streamRes = await fetch(embedUrl, {
                headers: { 
                    "User-Agent": getRandomUserAgent(), 
                    "Referer": officialSite 
                }
            });

            if (!streamRes.ok) {
                return res.status(404).send("Stream source not reachable");
            }

            const source = await streamRes.text();
            const decoded = unpack(source);
            
            // Multiple Regex patterns taaki link kabhi miss na ho
            const m3u8Regexes = [
                /(https?[:\/\/\w\.\-\%\!\?\&\=\,]+?\.m3u8[^\s"']*)/i,
                /file:\s*["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/i,
                /source:\s*["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/i
            ];

            let finalM3u8 = null;
            for (let regex of m3u8Regexes) {
                const match = decoded.match(regex) || source.match(regex);
                if (match && match[1]) {
                    finalM3u8 = match[1].replace(/\\/g, '');
                    break;
                }
            }

            if (finalM3u8) {
                // Seedha direct video stream redirect hogi IPTV ya Player ke liye
                return res.redirect(302, finalM3u8);
            }
            return res.status(404).send("M3U8 Link not found in stream response");
        }

        // --- LIST MODE ---
        const jsonRes = await fetch("https://ipl2020-46d2f.firebaseio.com/Json.json", {
            headers: { "User-Agent": getRandomUserAgent() }
        });
        
        if (!jsonRes.ok) {
            throw new Error(`Firebase returned status ${jsonRes.status}`);
        }
        
        let text = await jsonRes.text();
        
        try {
            text = text.replace(/,[ \t\r\n]*([\]}])/g, '$1');
        } catch(err) {}

        let data;
        try {
            data = JSON.parse(text);
        } catch (parseErr) {
            return res.status(500).send("#EXTM3U\n#ERROR: JSON Parsing Failed.");
        }

        const streamBaseLive = await getLiveDomain(["https://speedostream1.com/", "https://speedostream.com/"]);
        const headersuffix = `|Referer=${streamBaseLive}&Origin=${streamBaseLive.replace(/\/$/, "")}`;
        let playlist = "#EXTM3U\n";

        const processItem = (item) => {
            if (item && item.id) {
                const cleanId = item.id.replace(/[^a-zA-Z0-9]/g, '');
                const playLink = `${host}/api/speedo/${cleanId}.m3u8${headersuffix}`;
                playlist += `#EXTINF:-1 tvg-id="${item.id}" tvg-logo="${item.logo || ''}" group-title="${item.group || 'Movies'}",${item.name || 'No Name'}\n${playLink}\n`;
            }
        };

        if (Array.isArray(data)) {
            data.forEach(processItem);
        } else if (data && typeof data === 'object') {
            Object.keys(data).forEach(key => processItem(data[key]));
        }

        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        return res.status(200).send(playlist);

    } catch (err) {
        return res.status(200).send("#EXTM3U\n#ERROR: " + err.message);
    }
};
