import fetch from 'node-fetch';

export default async function handler(req, res) {
    const jsonUrl = 'https://ipl2020-46d2f.firebaseio.com/Webplalist.json';

    try {
        const response = await fetch(jsonUrl);
        const data = await response.json();

        // M3U Header start
        let m3u = '#EXTM3U\n';

        // JSON array par loop chalana
        data.forEach((item) => {
            const name = item.name || "Unknown Title";
            const logo = item.logo || "";
            const group = item.group || "Movies";
            const url = item.id || ""; // Aapke JSON mein 'id' hi link hai

            if (url) {
                // M3U Format mapping
                m3u += `#EXTINF:-1 group-title="${group}" tvg-logo="${logo}",${name}\n`;
                m3u += `${url}\n`;
            }
        });

        // Response headers for M3U file
        res.setHeader('Content-Type', 'audio/x-mpegurl');
        res.setHeader('Content-Disposition', 'inline; filename="playlist.m3u"');
        
        return res.status(200).send(m3u);

    } catch (error) {
        return res.status(500).send("Error fetching or parsing JSON: " + error.message);
    }
}
