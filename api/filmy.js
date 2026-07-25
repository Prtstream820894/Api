export default async function handler(req, res) {
  try {
    const targetUrl = 'https://filmyfly.faith/';
    
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      }
    });

    if (!response.ok) {
      return res.status(502).json({ success: false, error: `HTTP error! status: ${response.status}` });
    }

    const html = await response.text();
    const movies = [];
    const aTagRegex = /<a\s+(?:[^>]*?\s+)?href="([^"]*)"([^>]*)>([\s\S]*?)<\/a>/gi;
    
    let match;
    while ((match = aTagRegex.exec(html)) !== null) {
      const href = match[1];
      const innerContent = match[3];
      const cleanText = innerContent.replace(/<[^>]*>?/gm, '').trim();
      
      if (cleanText && (cleanText.includes('2026') || cleanText.includes('2021')) && (cleanText.includes('Dual Audio') || cleanText.includes('Movie'))) {
        let imgMatch = innerContent.match(/src="([^"]+)"/i);
        
        if (!imgMatch) {
          const index = match.index;
          const precedingHtml = html.substring(Math.max(0, index - 300), index);
          imgMatch = precedingHtml.match(/src="([^"]+)"/i);
        }

        let img = imgMatch ? imgMatch[1] : '';
        if (img && !img.startsWith('http')) {
          img = new URL(img, targetUrl).href;
        }
        
        const fullHref = href.startsWith('http') ? href : new URL(href, targetUrl).href;
        
        if (!movies.some(m => m.href === fullHref)) {
          movies.push({
            title: cleanText,
            img: img,
            href: fullHref
          });
        }
      }
    }

    // Limiting to first 3 movies for Step 2 execution to prevent serverless timeout
    const limitedMovies = movies.slice(0, 3);
    const results = [];

    for (const movie of limitedMovies) {
      try {
        const movieRes = await fetch(movie.href, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36' }
        });
        
        if (!movieRes.ok) continue;
        const movieHtml = await movieRes.text();
        
        // Extract resolution download page links (<center><div><div class="dlink dl"><a href="...">)
        let selectedLink = null;
        let candidateLinks = [];
        
        const linkRegex = /<a\s+[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
        let linkMatch;
        while ((linkMatch = linkRegex.exec(movieHtml)) !== null) {
          const linkHref = linkMatch[1];
          const linkText = linkMatch[2].replace(/<[^>]*>?/gm, '').trim();
          
          if (linkHref && linkText) {
            const fullLinkHref = linkHref.startsWith('http') ? linkHref : new URL(linkHref, movie.href).href;
            
            if (linkText.includes('1080p') || linkText.includes('1.2Gb') || linkText.includes('2.6Gb')) {
              candidateLinks.push({ priority: 1, href: fullLinkHref, text: linkText });
            } else if (linkText.includes('720p') || linkText.includes('730Mb')) {
              candidateLinks.push({ priority: 2, href: fullLinkHref, text: linkText });
            }
          }
        }

        candidateLinks.sort((a, b) => a.priority - b.priority);
        if (candidateLinks.length > 0) {
          selectedLink = candidateLinks[0].href;
        }

        if (!selectedLink) continue;

        // Open intermediate download page
        const intermediateRes = await fetch(selectedLink, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36' }
        });

        if (!intermediateRes.ok) continue;
        const intermediateHtml = await intermediateRes.text();
        
        let finalStreamUrl = null;

        // Check for Cloud Direct or Pixeldrain link pattern
        if (intermediateHtml.includes('window.viewer_data')) {
          const match = intermediateHtml.match(/window\.viewer_data\s*=\s*(\{.*?\});/);
          if (match && match[1]) {
            try {
              const viewerData = JSON.parse(match[1]);
              if (viewerData.api_response && viewerData.api_response.id) {
                finalStreamUrl = `https://pixeldrain.com/api/file/${viewerData.api_response.id}`;
              }
            } catch (e) {}
          }
        }

        if (!finalStreamUrl) {
          const interLinkRegex = /<a\s+[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
          let imMatch;
          while ((imMatch = interLinkRegex.exec(intermediateHtml)) !== null) {
            const h = imMatch[1];
            const t = imMatch[2].replace(/<[^>]*>?/gm, '').trim();
            if (t && (t.includes('Cloud Direct') || t.includes('Pixeldrain')) && h) {
              finalStreamUrl = h.startsWith('http') ? h : new URL(h, selectedLink).href;
              break;
            }
          }
        }

        results.push({
          movieTitle: movie.title,
          poster: movie.img,
          sourcePage: movie.href,
          downloadPage: selectedLink,
          finalDirectUrl: finalStreamUrl || 'Direct link pending secondary resolution'
        });

      } catch (err) {
        continue;
      }
    }

    return res.status(200).json({
      success: true,
      step: 2,
      totalProcessed: results.length,
      data: results
    });

  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
