export default async function handler(req, res) {
    const userAgent = "Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36";

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

    const movieId = req.query.id || req.query.play;

    if (movieId) {
        let movieUrl = "";

        if (/^\d+$/.test(movieId)) {
            // 1. Pehle main page se check karo
            const mainHtml = await viewSourceFetch("https://vega-bio.com/");
            if (mainHtml) {
                const regex = new RegExp(`href="([^"]*\\/${movieId}[^"]*)"`, 'i');
                const matchUrl = mainHtml.match(regex);
                if (matchUrl) {
                    movieUrl = matchUrl[1];
                }
            }

            // 2. Agar main page par nahi mila, toh search page se fetch karo (Ye ensure karega ki purane IDs bhi fail na ho)
            if (!movieUrl) {
                const searchHtml = await viewSourceFetch(`https://vega-bio.com/?s=${movieId}`);
                if (searchHtml) {
                    const searchMatch = searchHtml.match(new RegExp(`href="([^"]*\\/${movieId}[^"]*)"`, 'i'));
                    if (searchMatch) {
                        movieUrl = searchMatch[1];
                    }
                }
            }
        } else {
            try {
                movieUrl = Buffer.from(decodeURIComponent(movieId), 'base64').toString('utf8');
                new URL(movieUrl);
            } catch (e) {
                res.status(400).send("Invalid Target ID/URL String.");
                return;
            }
        }

        if (!movieUrl) {
            res.status(404).send("Movie URL could not be resolved from ID.");
            return;
        }

        const singlePageSource = await viewSourceFetch(movieUrl);
        let imdbId = "tt33764258"; 
        let dynamicDomain = "https://gemma416okl.com"; 

        if (singlePageSource) {
            const idMatch = singlePageSource.match(/src:\s*'([^']+)'/);
            if (idMatch) {
                imdbId = idMatch[1];
            }

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

        const finalRedirectUrl = `${dynamicDomain}/play/${imdbId}`;
        res.setHeader('Location', finalRedirectUrl);
        res.status(302).end();
        return;
    }

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

    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers.host;
    const cleanPath = req.url.split('?')[0].replace(/\/[^\/]+$/, '');
    const baseUrl = `${protocol}://${host}${cleanPath}`;

    for (let i = 1; i < articleParts.length; i++) {
        const part = articleParts[i];
        if (!part.includes('class="post-item')) continue;

        let imgUrl = "";
        const imgMatch = part.match(/src="([^"]+)"/);
        if (imgMatch) {
            imgUrl = imgMatch[1];
            if (imgUrl.startsWith('/')) imgUrl = "https://vega-no.com" + imgUrl;
        }

        let movieUrl = "";
        let titleText = "";
        const titleMatch = part.match(/post-title">\s*<a[^>]+href="([^"]+)"[^>]*>(.*?)<\/a>/s);
        if (titleMatch) {
            movieUrl = titleMatch[1];
            titleText = titleMatch[2].replace(/<\/?[^>]+(>|$)/g, "").trim();
        }

        if (titleText && imgUrl && movieUrl) {
            const idMatch = movieUrl.match(/\/(\d+)-/);
            const shortId = idMatch ? idMatch[1] : Buffer.from(movieUrl).toString('base64').substring(0, 8);
            
            const finalPlayUrl = `${baseUrl}?id=${shortId}`;

            m3uOutput += `#EXTINF:-1 tvg-logo="${imgUrl}" group-title="Latest Movies",${titleText}\n`;
            m3uOutput += `${finalPlayUrl}\n`;
        }
    }

    res.status(200).send(m3uOutput);
}
