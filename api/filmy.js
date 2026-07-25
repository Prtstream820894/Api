import { parse } from 'node-html-parser';

export default async function handler(req, res) {
  try {
    const targetUrl = 'https://filmyfly.faith/';
    
    // Step 1: Fetch main index page
    const mainResponse = await fetch(targetUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 10)' }
    });
    const mainHtml = await mainResponse.text();
    const mainRoot = parse(mainHtml);

    // Target specific movie blocks under "Trending Movies"
    // Extracting titles, images, and href links
    const movies = [];
    mainRoot.querySelectorAll('a').forEach(a => {
      const text = a.text;
      if (text && (text.includes('2026') || text.includes('2021')) && text.includes('Dual Audio')) {
        const href = a.getAttribute('href');
        const img = a.querySelector('img')?.getAttribute('src') || '';
        if (href) {
          movies.push({ title: text.trim(), href, img });
        }
      }
    });

    const results = [];

    // Step 2: Iterate through each movie href link in the background
    for (const movie of movies) {
      try {
        const movieRes = await fetch(movie.href, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 10)' }
        });
        const movieHtml = await movieRes.text();
        const movieRoot = parse(movieHtml);

        // Find resolution links (1080p HD priority, fallback to 720p)
        let selectedLink = null;
        let candidateLinks = [];

        movieRoot.querySelectorAll('a').forEach(el => {
          const linkText = el.text;
          const linkHref = el.getAttribute('href');
          if (linkHref && linkText) {
            if (linkText.includes('1080p') || linkText.includes('1.2Gb') || linkText.includes('2.6Gb')) {
              candidateLinks.push({ priority: 1, href: linkHref, text: linkText });
            } else if (linkText.includes('720p') || linkText.includes('730Mb')) {
              candidateLinks.push({ priority: 2, href: linkHref, text: linkText });
            }
          }
        });

        // Sort by priority (1080p first)
        candidateLinks.sort((a, b) => a.priority - b.priority);
        if (candidateLinks.length > 0) {
          selectedLink = candidateLinks[0].href;
        }

        if (!selectedLink) continue;

        // Step 3: Open the intermediate download page link
        const intermediateRes = await fetch(selectedLink, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 10)' }
        });
        const intermediateHtml = await intermediateRes.text();
        
        // Check for Cloud Direct link or Pixeldrain link pattern
        let finalStreamUrl = null;
        
        if (intermediateHtml.includes('Cloud Direct') || intermediateHtml.includes('Fast Direct Download')) {
          // Extract direct file link if available in the text structure
          const interRoot = parse(intermediateHtml);
          interRoot.querySelectorAll('a').forEach(el => {
            const t = el.text;
            const h = el.getAttribute('href');
            if (t && (t.includes('Cloud Direct') || t.includes('Pixeldrain')) && h) {
              finalStreamUrl = h;
            }
          });
        }

        // Fallback or explicit check for Pixeldrain window.viewer_data script pattern
        if (!finalStreamUrl && intermediateHtml.includes('window.viewer_data')) {
          const match = intermediateHtml.match(/window\.viewer_data\s*=\s*(\{.*?\});/);
          if (match && match[1]) {
            const viewerData = JSON.parse(match[1]);
            if (viewerData.api_response && viewerData.api_response.id) {
              const fileId = viewerData.api_response.id;
              finalStreamUrl = `https://pixeldrain.com/api/file/${fileId}`;
            }
          }
        }

        results.push({
          movieTitle: movie.title,
          poster: movie.img,
          sourcePage: movie.href,
          downloadPage: selectedLink,
          finalDirectUrl: finalStreamUrl || 'Not found / Pixeldrain direct embedded id needed'
        });

      } catch (err) {
        console.error(`Error processing movie ${movie.title}:`, err.message);
      }
    }

    return res.status(200).json({
      success: true,
      totalProcessed: results.length,
      data: results
    });

  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
