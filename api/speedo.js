const fetch = require('node-fetch');

// Alag-alag User-Agents taaki site block na kare
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
        // --- PLAY MODE ---
        if (play) {
            play = play.replace('.m3u8', '').replace('.html', '');
            const streamBase = await getLiveDomain(["https://speedostream1.com/", "https://speedostream.com/"]);
            const embedUrl = `${streamBase.replace(/\/$/, "")}/embed-${play}.html`;

            // Seedha embed URL par redirect kar diya taaki player ya browser wahi load kare
            return res.redirect(302, embedUrl);
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

        let playlist = "#EXTM3U\n";

        const processItem = (item) => {
            if (item && item.id) {
                const cleanId = item.id.replace(/[^a-zA-Z0-9]/g, '');
                // Ab yeh link seedha embed route par bhejega bina m3u8 extract kiye
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
