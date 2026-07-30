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

let cachedPlaylistText = '[]'; 

async function fetchWithTimeout(url, options = {}, timeoutMs = 9000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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
            
            const match = source.match(/file:\s*["'](https?:\/\/[^"']+\/master\.m3u8[^"']*)["']/i) || 
                          source.match(/(https?:\/\/[^"']+\/master\.m3u8[^\s"']*)/i);

            if (match && match[1]) {
                const finalM3u8 = match[1].replace(/\\/g, '');
                return res.redirect(302, finalM3u8);
            }

            return res.status(404).send("Master M3U8 Link not found inside embed source");
        }

        // --- LIST MODE WITH RETRY & FALLBACK ---
        let jsonRes = null;
        let text = null;
        const targetUrl = "https://autumn-cake-618e.poonamchouhan076.workers.dev/";
        const fetchOptions = { headers: { "User-Agent": getRandomUserAgent() } };

        try {
            jsonRes = await fetchWithTimeout(targetUrl, fetchOptions, 9000);
            if (!jsonRes.ok) throw new Error(`Status ${jsonRes.status}`);
            text = await jsonRes.text();
        } catch (err1) {
            await sleep(1000);
            try {
                jsonRes = await fetchWithTimeout(targetUrl, fetchOptions, 9000);
                if (!jsonRes.ok) throw new Error(`Status ${jsonRes.status}`);
                text = await jsonRes.text();
            } catch (err2) {
                await sleep(1000);
                try {
                    jsonRes = await fetchWithTimeout(targetUrl, fetchOptions, 9000);
                    if (!jsonRes.ok) throw new Error(`Status ${jsonRes.status}`);
                    text = await jsonRes.text();
                } catch (err3) {
                    text = cachedPlaylistText;
                }
            }
        }
        
        try {
            text = text.replace(/,[ \t\r\n]*([\]}])/g, '$1');
        } catch (e) {}

        try {
            JSON.parse(text);

            if (text && text.trim() && text.trim() !== "[]") {
                cachedPlaylistText = text;
            }
        } catch (e) {
            console.log("Invalid JSON received, using cached playlist.");
            text = cachedPlaylistText;
        }

        return res.setHeader('Content-Type', 'application/json').status(200).send(text);

    } catch (error) {
        return res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
};
