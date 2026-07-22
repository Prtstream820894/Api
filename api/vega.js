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

    const playParam = req.query.play;

    // =========================================================================
    // KHEL STEP 1: Agar User/Player ne kisi Movie Link par click kiya hai
    // =========================================================================
    if (playParam) {
        let movieUrl;
        try {
            movieUrl = Buffer.from(decodeURIComponent(playParam), 'base64').toString('utf8');
            new URL(movieUrl); // Validate URL format
        } catch (e) {
            res.status(400).send("Invalid Target URL String.");
            return;
        }

        const singlePageSource = await viewSourceFetch(movieUrl);
        let imdbId = "tt33764258"; // Fallback ID
        let dynamicDomain = "https://gemma416okl.com"; // Fallback Domain

        if (singlePageSource) {
            // A. Asli IMDb ID extract karo (src: 'tt...')
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

        // Direct Video Player Server par redirect patak do!
        const finalRedirectUrl = `${dynamicDomain}/play/${imdbId}`;
        res.setHeader('Location', finalRedirectUrl);
        res.status(302).end();
        return;
    }

    // =========================================================================
    // KHEL STEP 2: Normal execution me (Instant M3U Generation)
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
            // Strip tags and trim whitespace equivalent to PHP
            titleText = titleMatch[2].replace(/<\/?[^>]+(>|$)/g, "").trim();
        }

        if (titleText && imgUrl && movieUrl) {
            const encodedUrl = encodeURIComponent(Buffer.from(movieUrl).toString('base64'));
            const finalPlayUrl = `${localBaseUrl}?play=${encodedUrl}`;

            m3uOutput += `#EXTINF:-1 tvg-logo="${imgUrl}" group-title="Latest Movies",${titleText}\n`;
            m3uOutput += `${finalPlayUrl}\n`;
        }
    }

    res.status(200).send(m3uOutput);
}
