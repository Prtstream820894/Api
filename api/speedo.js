const fetch = require('node-fetch');

const USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2.1 Safari/605.1.15",
    "Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0"
];

function getRandomUserAgent() {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

async function getLiveDomain(testUrls) {
    for (let url of testUrls) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 4000);
            const res = await fetch(url, { 
                method: 'HEAD',
                headers: { "User-Agent": getRandomUserAgent() },
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (res.ok) return new URL(res.url).origin + "/";
        } catch (e) {}
    }
    return testUrls[0];
}

module.exports = async (req, res) => {
    try {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        
        let hostHeader = (req.headers && req.headers.host) ? req.headers.host : 'localhost';
        const host = `https://${hostHeader}`;
        
        let play = req.query && req.query.play ? req.query.play : null;
        let urlPath = req.url || '';
        
        if (!play) {
            const matchId = urlPath.match(/\/([a-zA-Z0-9]+)\.m3u8/);
            if (matchId && matchId[1] && matchId[1] !== 'speedo') {
                play = matchId[1];
            }
        }

        // --- PLAY MODE ---
        if (play) {
            play = play.replace('.m3u8', '').replace('.html', '');
            const officialSite = await getLiveDomain(["https://prmovies.locker/", "https://yomovies.foundation/"]);
            const streamBase = await getLiveDomain(["https://speedostream1.com/", "https://speedostream.com/"]);
            const embedUrl = `${streamBase.replace(/\/$/, "")}/embed-${play}.html`;
            const cleanOrigin = officialSite.replace(/\/$/, "");

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);

            const streamRes = await fetch(embedUrl, {
                headers: { 
                    "Host": new URL(streamBase).host,
                    "Connection": "keep-alive",
                    "Cache-Control": "max-age=0",
                    "User-Agent": getRandomUserAgent(),
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                    "Referer": officialSite,
                    "Origin": cleanOrigin,
                    "Accept-Language": "en-US,en;q=0.9"
                },
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!streamRes.ok) {
                return res.status(403).send(`Blocked or Forbidden! Server status: ${streamRes.status}`);
            }

            const source = await streamRes.text();
            
            // Ab yeh regex is HTML ke andar se exact master.m3u8 link nikal lega
            const match = source.match(/file:\s*["'](https?:\/\/[^"']+\/master\.m3u8[^"']*)["']/i) || 
                          source.match(/(https?:\/\/[^"']+\/master\.m3u8[^\s"']*)/i);

            if (match && match[1]) {
                const finalM3u8 = match[1].replace(/\\/g, '');
                return res.redirect(302, finalM3u8);
            }

            return res.status(404).send("Master M3U8 Link not found inside embed source");
        }

        // --- LIST MODE ---
        const jsonRes = await fetch("https://il2020-46d2f.firebaseio.com/Json.json", {
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
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        return res.status(200).send("#EXTM3U\n#ERROR: " + err.message);
    }
};
