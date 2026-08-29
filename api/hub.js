module.exports = async (req, res) => {
    try {
        const targetUrl = 'https://new5.hdhub4u.cl/';
        
        // Native fetch ka use
        const response = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch website: ${response.status}`);
        }

        const html = await response.text();
        let m3uContent = '#EXTM3U\n';

        // Extracting thumb blocks using Regex
        const thumbRegex = /<li class="thumb[^"]*">([\s\S]*?)<\/li>/g;
        let match;

        while ((match = thumbRegex.exec(html)) !== null) {
            const thumbContent = match[1];

            // Extract image src and alt/title
            const imgMatch = thumbContent.match(/<img[^>]*src="([^"]+)"[^>]*alt="([^"]*)"/i) || thumbContent.match(/<img[^>]*alt="([^"]*)"[^>]*src="([^"]+)"/i);
            const hrefMatch = thumbContent.match(/<a\s+href="([^"]+)"/i);

            if (imgMatch && hrefMatch) {
                // Determine which group matched for alt and src
                let imageUrl = '';
                let title = '';
                
                if (imgMatch[1].startsWith('http')) {
                    imageUrl = imgMatch[1];
                    title = imgMatch[2];
                } else {
                    imageUrl = imgMatch[2];
                    title = imgMatch[1];
                }

                const hrefUrl = hrefMatch[1];
                const lowerTitle = title.toLowerCase();

                // Strict filtering: Exclude series, seasons, shows, episodes
                const isSeriesOrShow = 
                    lowerTitle.includes('season') || 
                    lowerTitle.includes('series') || 
                    lowerTitle.includes('show') || 
                    lowerTitle.includes('ep') || 
                    lowerTitle.includes('episode');

                if (title && hrefUrl && !isSeriesOrShow) {
                    // Decode HTML entities if any basic ones exist
                    const cleanTitle = title
                        .replace(/&#8217;/g, "'")
                        .replace(/&#8230;/g, "...")
                        .replace(/&amp;/g, "&")
                        .replace(/"/g, "'");

                    m3uContent += `#EXTINF:-1 tvg-logo="${imageUrl}" group-title="Movies",${cleanTitle}\n`;
                    m3uContent += `${hrefUrl}\n`;
                }
            }
        }

        // Set response headers for M3U playlist download/stream
        res.setHeader('Content-Type', 'audio/x-mpegurl');
        res.setHeader('Content-Disposition', 'inline; filename="movies_playlist.m3u"');
        
        return res.status(200).send(m3uContent);

    } catch (error) {
        res.setHeader('Content-Type', 'text/plain');
        return res.status(500).send(`#EXTM3U\n# Error: ${error.message}`);
    }
};
