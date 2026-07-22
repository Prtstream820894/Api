export default async function handler(req, res) {
    const userAgent = "Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36";

    // Helper function to fetch source code
    async function viewSourceFetch(url) {
        try {
            const response = await fetch(url, {
                headers: { "User-Agent": userAgent },
                redirect: "follow"
            });
            if (!response.ok) return null;
            return await response.text();
        } catch (err) {
            return null;
        }
    }

    const movieId = req.query.id || req.query.play; // Supports both 'id' and legacy 'play' parameter

    // =========================================================================
    // KHEL STEP 1: Agar User/Player ne clean ID ke sath request bheji hai
    // =========================================================================
    if (movieId) {
        let movieUrl;

        // Check if input is a raw ID (e.g., 614790) or an old Base64 string
        if (/^\d+$/.test(movieId)) {
            // If it's just numbers, we dynamically search or construct the target URL pattern
            // Alternatively, we scrape the main page or use a direct search pattern. 
            // Let's map it back by finding the URL matching this ID from the source site:
            const mainHtml = await viewSourceFetch("https://vega-bio.com/");
            const matchUrl = mainHtml ? mainHtml.match(new RegExp(`href="([^"]*${movieId}[^"]*)"`)) : null;
            
            if (matchUrl) {
                movieUrl = matchUrl[1];
            } else {
                res.status(404).send("Movie ID not found.");
                return;
            }
        } else {
            // Fallback for old base64 links if any exist
            try {
                movieUrl = Buffer.from(decodeURIComponent(movieId), 'base64').toString('utf8');
                new URL(movieUrl);
            } catch (e) {
                res.status(400).send("Invalid Target ID/URL String.");
                return;
            }
        }

        const singlePageSource = await viewSourceFetch(movieUrl);
        let imdbId = "tt33764258"; // Fallback ID
        let dynamicDomain = "https://gemma416okl.com"; // Fallback Domain

        if (singlePageSource) {
            // A. Asli IMDb ID extract karo
            const idMatch = singlePageSource.match(/src:\s*'([^']+)'/);
            if (idMatch) {
                imdbId = idMatch[1];
            }

            // B. Player JS ke andar se dynamic domain fetch karo
            const scriptMatch = singlePageSource.match(/src="([^"]+player\.js[^"]+)"/);
            if (scriptMatch) {
                let scriptUrl = scriptMatch[1];
                if (scriptUrl.startsWith('//')) scriptUrl = "https:" + scriptUrl;

                const jsSource = await viewSourceFetch(scriptUrl);
                if (jsSource) {
                    const domMatch = jsSource.match(/AwsIndStreamDomain\s*=\s*'([^']+)'/);
                    if (domMatch) {
                        dynamicDomain = domMatch[1].replace(/\/+$/, '');
                    }
                }
            }
        }

        // Direct Video Player Server par redirect
        const finalRedirectUrl = `${dynamicDomain}/play/${imdbId}`;
        res.setHeader('Location', finalRedirectUrl);
        res.status(302).end();
        return;
    }

    // =========================================================================
    // KHEL STEP 2: Instant M3U Generation with Clean IDs
    // =========================================================================
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', 'inline; filename="PRT_STREAM_MOVIES.m3u"');

    let m3uOutput = "#EXTM3U\n";

    const targetUrl = "https://vega-bio.com/";
    const html = await viewSourceFetch(targetUrl);

    if (!html) {
        m3uOutput += "#ERROR: Target resource down.\n";
        res.status(500).send(m3uOutput);
        return;
    }

    const articleParts = html.split('<article');

    // Auto-detect current host and path for Vercel
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers.host;
    const localBaseUrl = `${protocol}://${host}${req.url.split('?')[0]}`;

    for (let i = 1; i < articleParts.length; i++) {
        const part = articleParts[i];
        if (!part.includes('class="post-item')) continue;

        // Image Extract
        let imgUrl = "";
        const imgMatch = part.match(/src="([^"]+)"/);
        if (imgMatch) {
            imgUrl = imgMatch[1];
            if (imgUrl.startsWith('/')) imgUrl = "https://vega-no.com" + imgUrl;
        }

        // Title & Href URL Extract
        let movieUrl = "";
        let titleText = "";
        const titleMatch = part.match(/post-title">\s*<a[^>]+href="([^"]+)"[^>]*>(.*?)<\/a>/s);
        if (titleMatch) {
            movieUrl = titleMatch[1];
            titleText = titleMatch[2].replace(/<\/?[^>]+(>|$)/g, "").trim();
        }

        if (titleText && imgUrl && movieUrl) {
            // Extract numeric ID from the movie URL (e.g., /614790-disclosure-... -> 614790)
            const idMatch = movieUrl.match(/\/(\d+)-/);
            const shortId = idMatch ? idMatch[1] : Buffer.from(movieUrl).toString('base64').substring(0, 8);
            
            const finalPlayUrl = `${localBaseUrl}?id=${shortId}`;

            m3uOutput += `#EXTINF:-1 tvg-logo="${imgUrl}" group-title="Latest Movies",${titleText}\n`;
            m3uOutput += `${finalPlayUrl}\n`;
        }
    }

    res.status(200).send(m3uOutput);
}
