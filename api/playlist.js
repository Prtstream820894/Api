import fetch from 'node-fetch';

export default async function handler(req, res) {
    const targetUrl = "https://server.vodep39240327.workers.dev/channel/raw?=m3u";

    try {
        // Target URL se playlist fetch ho rahi hai
        const response = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        if (!response.ok) {
            return res.status(response.status).send(`Failed to fetch original playlist: ${response.statusText}`);
        }

        // Raw text content ko fetch kiya bina kisi badlav ke
        const playlistData = await response.text();

        // Headers set kar rahe hain taaki format m3u file jaisa hi rahe
        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl; charset=utf-8');
        res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
        res.setHeader('Access-Control-Allow-Origin', '*');

        // Same to same response send ho raha hai
        return res.status(200).send(playlistData);

    } catch (error) {
        return res.status(500).send(`Internal Server Error: ${error.message}`);
    }
}
