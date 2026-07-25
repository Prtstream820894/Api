export default async function handler(req, res) {
  try {
    const workerApiUrl = 'https://wispy-frog-dc37.poonamchouhan076.workers.dev/';
    
    // Step 1: Fetch JSON data from your Cloudflare Worker
    const response = await fetch(workerApiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      return res.status(502).json({ success: false, error: `HTTP error! status: ${response.status}` });
    }

    const jsonResult = await response.json();
    const movies = jsonResult.data || [];
    const updatedMovies = [];

    // Step 2: Open each of the 5 links in background and extract the Cloud Direct link
    for (const movie of movies) {
      try {
        const pageRes = await fetch(movie.href, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36' }
        });

        if (!pageRes.ok) {
          updatedMovies.push(movie);
          continue;
        }

        const pageHtml = await pageRes.text();
        let cloudDirectLink = null;

        const linkRegex = /<a\s+[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
        let match;
        while ((match = linkRegex.exec(pageHtml)) !== null) {
          const h = match[1];
          const t = match[2].replace(/<[^>]*>?/gm, '').trim();
          
          // Look for the first Cloud Direct / Cloud link button
          if (t && (t.toLowerCase().includes('cloud direct') || t.toLowerCase().includes('cloud')) && h) {
            cloudDirectLink = h.startsWith('http') ? h : new URL(h, movie.href).href;
            break; // Stop at the very first cloud match
          }
        }

        // Replace movie href with final Cloud Direct link, fallback to original if not found
        updatedMovies.push({
          title: movie.title,
          poster: movie.poster,
          href: cloudDirectLink || movie.href
        });

      } catch (err) {
        updatedMovies.push(movie);
      }
    }

    // Step 3: Convert the final updated JSON data into M3U Playlist Format
    let m3uContent = '#EXTM3U\n';
    for (const item of updatedMovies) {
      m3uContent += `#EXTINF:-1 tvg-logo="${item.poster}" group-title="Trending Movies",${item.title}\n`;
      m3uContent += `${item.href}\n`;
    }

    // Return the final generated M3U file
    res.setHeader('Content-Type', 'audio/x-mpegurl; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="trending_movies.m3u"');
    return res.status(200).send(m3uContent);

  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
