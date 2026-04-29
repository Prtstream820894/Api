const axios = require('axios');

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
            const res = await axios.head(url, { timeout: 2000, maxRedirects: 5 });
            return new URL(res.config.url).origin + "/";
        } catch (e) {}
    }
    return testUrls[0];
}

export default async function handler(req, res) {
    try {
        const jsonRes = await axios.get("https://ipl2020-46d2f.firebaseio.com/Json.json", { timeout: 5000 });
        const data = jsonRes.data;

        const officialSite = await getLiveDomain(["https://prmovies.pizza/", "https://prmovies.to/"]);
        const streamBase = await getLiveDomain(["https://speedostream1.com/", "https://speedostream.com/"]);
        const targetHost = new URL(streamBase).host;

        const fetchStream = async (item) => {
            try {
                const embedUrl = `${streamBase.replace(/\/$/, "")}/embed-${item.id.replace(/[^a-zA-Z0-9]/g, '')}.html`;
                const streamResponse = await axios.get(embedUrl, {
                    headers: {
                        "User-Agent": "Mozilla/5.0",
                        "Referer": officialSite,
                        "Origin": officialSite.replace(/\/$/, "")
                    },
                    timeout: 4000
                });

                let source = streamResponse.data;
                const decoded = unpack(source);
                const m3u8Regex = /(https?[:\/\/\w\.\-\%\!\?\&\=\,]+?\.m3u8[^\s"']*)/i;
                const match = decoded.match(m3u8Regex) || source.match(m3u8Regex);

                if (match) {
                    const originHost = `https://${targetHost}`;
                    return `#EXTINF:-1 tvg-id="${item.id}" tvg-logo="${item.logo}" group-title="${item.group}",${item.name}\n${match[1].replace(/\\/g, '')}|Referer=${originHost}&Origin=${originHost}\n`;
                }
            } catch (e) {}
            return "";
        };

        // Saare items ko ek saath fetch karenge
        const entries = await Promise.all(data.map(item => fetchStream(item)));
        
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.status(200).send("#EXTM3U\n" + entries.join(""));
    } catch (err) {
        res.status(500).send("Error: " + err.message);
    }
}
