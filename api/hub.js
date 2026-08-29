const axios = require('axios');
const cheerio = require('cheerio');

module.exports = async (req, res) => {
    try {
        const targetUrl = 'https://new5.hdhub4u.cl/';
        
        const { data: html } = await axios.get(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        const $ = cheerio.load(html);
        
        // Start building M3U playlist string
        let m3uContent = '#EXTM3U\n';

        $('.recent-movies .thumb').each((index, element) => {
            const imgElement = $(element).find('figure img');
            const aElement = $(element).find('figure a');
            
            const title = (imgElement.attr('alt') || imgElement.attr('title') || '').trim();
            const imageUrl = (imgElement.attr('src') || '').trim();
            const hrefUrl = (aElement.attr('href') || '').trim();

            const lowerTitle = title.toLowerCase();
            const isSeriesOrShow = 
                lowerTitle.includes('season') || 
                lowerTitle.includes('series') || 
                lowerTitle.includes('show') || 
                lowerTitle.includes('ep') || 
                lowerTitle.includes('episode');

            // Sirf movies add karo, series/shows skip kar do
            if (title && hrefUrl && !isSeriesOrShow) {
                // Escape quotes if any in title
                const cleanTitle = title.replace(/"/g, "'");
                
                // M3U format entry with logo and group title
                m3uContent += `#EXTINF:-1 tvg-logo="${imageUrl}" group-title="Movies",${cleanTitle}\n`;
                m3uContent += `${hrefUrl}\n`;
            }
        });

        // Response headers set karo taaki yeh direct M3U playlist file ki tarah download/stream ho sake
        res.setHeader('Content-Type', 'audio/x-mpegurl');
        res.setHeader('Content-Disposition', 'inline; filename="movies_playlist.m3u"');
        
        return res.status(200).send(m3uContent);

    } catch (error) {
        return res.status(500).send(`#EXTM3U\n# Error fetching playlist: ${error.message}`);
    }
};
