const fetch = require('node-fetch');

const USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2.1 Safari/605.1.15"
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
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    
    let { play } = req.query;
    const host = `https://${req.headers.host}`;

    try {
        // --- DEBUG MODE: SHOW RAW EMBED SOURCE CODE ---
        if (play) {
            play = play.replace('.m3u8', '').replace('.html', '');
            const officialSite = await getLiveDomain(["https://prmovies.locker/", "https://yomovies.foundation/"]);
            const streamBase = await getLiveDomain(["https://speedostream1.com/", "https://speedostream.com/"]);
            const embedUrl = `${streamBase.replace(/\/$/, "")}/embed-${play}.html`;

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);

            const streamRes = await fetch(embedUrl, {
                headers: { 
                    "User-Agent": getRandomUserAgent(), 
                    "Referer": officialSite 
                },
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!streamRes.ok) {
                return res.status(404).send(`Stream source not reachable. Status: ${streamRes.status}`);
            }

            const source = await streamRes.text();
            
            // Yahan hum .m3u8 extract nahi kar rahe, balki seedha HTML code browser par text format me dikha rahe hain
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            return res.status(200).send(`=== EMBED URL: ${embedUrl} ===\n\n=== SOURCE CODE BELOW ===\n\n${source}`);
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
                const playLink = `${host}/api/speedo/${cleanId}.m3u8`;
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
