import { parse } from 'node-html-parser';

export default async function handler(req, res) {
  try {
    const targetUrl = 'https://filmyfly.faith/';
    
    const mainResponse = await fetch(targetUrl, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      }
    });

    if (!mainResponse.ok) {
      return res.status(502).json({ success: false, error: `Failed to fetch target site: ${mainResponse.status}` });
    }

    const mainHtml = await mainResponse.text();
    const mainRoot = parse(mainHtml);

    const movies = [];
    mainRoot.querySelectorAll('a').forEach(a => {
      const text = a.text?.trim();
      const href = a.getAttribute('href');
      if (text && href && (text.includes('2026') || text.includes('2021')) && text.includes('Dual Audio')) {
        const img = a.querySelector('img')?.getAttribute('src') || '';
        // Ensure absolute URL if relative
        const fullHref = href.startsWith('http') ? href : new URL(href, targetUrl).href;
        movies.push({ title: text, href: fullHref, img });
      }
    });

    // Limit to first 2-3 movies to prevent serverless execution timeout (500 Error)
    const limitedMovies = movies.slice(0, 3);
    const results = [];

    for (const movie of limitedMovies) {
      try {
        const movieRes = await fetch(movie.href, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36' }
        });
        
        if (!movieRes.ok) continue;
        const movieHtml = await movieRes.text();
        const movieRoot = parse(movieHtml);

        let selectedLink = null;
        let candidateLinks = [];

        movieRoot.querySelectorAll('a').forEach(el => {
          const linkText = el.text?.trim();
          const linkHref = el.getAttribute('href');
          if (linkHref && linkText) {
            const fullLinkHref = linkHref.startsWith('http') ? linkHref : new URL(linkHref, movie.href).href;
            if (linkText.includes('1080p') || linkText.includes('2.6Gb') || linkText.includes('1.2Gb')) {
              candidateLinks.push({ priority: 1, href: fullLinkHref, text: linkText });
            } else if (linkText.includes('720p') || linkText.includes('730Mb')) {
              candidateLinks.push({ priority: 2, href: fullLinkHref, text: linkText });
            }
          }
        });

        candidateLinks.sort((a, b) => a.priority - b.priority);
        if (candidateLinks.length > 0) {
          selectedLink = candidateLinks[0].href;
        }

        if (!selectedLink) continue;

        const intermediateRes = await fetch(selectedLink, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36' }
        });

        if (!intermediateRes.ok) continue;
        const intermediateHtml = await intermediateRes.text();
        
        let finalStreamUrl = null;

        // Check for Pixeldrain script viewer_data pattern
        if (intermediateHtml.includes('window.viewer_data')) {
          const match = intermediateHtml.match(/window\.viewer_data\s*=\s*(\{.*?\});/);
          if (match && match[1]) {
            try {
              const viewerData = JSON.parse(match[1]);
              if (viewerData.api_response && viewerData.api_response.id) {
                finalStreamUrl = `https://pixeldrain.com/api/file/${viewerData.api_response.id}`;
              }
            } catch (e) {
              // JSON parse fail fallback
            }
          }
        }

        // Fallback to text matching for direct links
        if (!finalStreamUrl) {
          const interRoot = parse(intermediateHtml);
          interRoot.querySelectorAll('a').forEach(el => {
            const t = el.text;
            const h = el.getAttribute('href');
            if (t && (t.includes('Cloud Direct') || t.includes('Pixeldrain')) && h) {
              finalStreamUrl = h.startsWith('http') ? h : new URL(h, selectedLink).href;
            }
          });
        }

        results.push({
          movieTitle: movie.title,
          poster: movie.img,
          sourcePage: movie.href,
          downloadPage: selectedLink,
          finalDirectUrl: finalStreamUrl || 'Direct link extraction pending manual cookie/header match'
        });

      } catch (innerErr) {
        // Skip individual movie error to prevent full crash
        continue;
      }
    }

    return res.status(200).json({
      success: true,
      processedCount: results.length,
      data: results
    });

  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
