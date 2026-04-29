const fetch = require('node-fetch');

function unpack(code) {
    try {
        const evalPattern = /eval\(function\(p,a,c,k,e,d\).+?\}\('(.+?)',(\d+),(\d+),'(.+?)'\.split\('\|'\)\)\)/;
        const evalContent = code.match(evalPattern);
        if (evalContent) {
            let [_, p, a, c, k] = evalContent;
            a = parseInt(a);
            c = parseInt(c);
            k = k.split('|');
            while (c--) {
                if (k[c]) {
                    p = p.replace(new RegExp('\\b' + c.toString(a) + '\\b', 'g'), k[c]);
                }
            }
            return p;
        }
    } catch (e) {}
    return code;
}

async function getLiveDomain(testUrls) {
    for (let url of testUrls) {
        try {
            const res = await fetch(url, { method: 'HEAD', timeout: 3000 });
            if (res.ok) return new URL(res.url).origin + "/";
        } catch (e) {}
    }
    return testUrls[0];
}

module.exports = async (req, res) => {
    try {
        const jsonResponse = await fetch("https://ipl2020-46d2f.firebaseio.com/Json.json");
        const data = await jsonResponse.json();

        // Limit data to prevent Vercel Timeout (Pehle 50 items check karte hain)
        const limitedData = data.slice(0, 60);

        const officialSite = await getLiveDomain(["https://prmovies.pizza/", "https://prmovies.to/"]);
        const streamBase = await getLiveDomain(["https://speedostream1.com/", "https://speedostream.com/"]);
        const targetHost = new URL(streamBase).host;

        const results = await Promise.all(limitedData.map(async (item) => {
            try {
                const cleanId = item.id.replace(/[^a-zA-Z0-9]/g, '');
                const embedUrl = `${streamBase.replace(/\/$/, "")}/embed-${cleanId}.html`;

                const streamRes = await fetch(embedUrl, {
                    headers: {
                        "User-Agent": "Mozilla/5.0",
                        "Referer": officialSite
                    },
                    timeout: 5000
                });

                const source = await streamRes.text();
                const decoded = unpack(source);
                const m3u8Regex = /(https?[:\/\/\w\.\-\%\!\?\&\=\,]+?\.m3u8[^\s"']*)/i;
                const match = decoded.match(m3u8Regex) || source.match(m3u8Regex);

                if (match) {
                    const m3u8 = match[1].replace(/\\/g, '');
                    const originHost = `https://${targetHost}`;
                    return `#EXTINF:-1 tvg-id="${item.id}" tvg-logo="${item.logo}" group-title="${item.group}",${item.name}\n${m3u8}|Referer=${originHost}&Origin=${originHost}\n`;
                }
            } catch (e) {}
            return "";
        }));

        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.status(200).send("#EXTM3U\n" + results.join(""));

    } catch (err) {
        res.status(500).send("Server Error: " + err.message);
    }
};
