// /api/playlist.js

export default async function handler(req, res) {
  // Aapka Cloudflare Worker URL
  const WORKER_URL = "https://webplaylst-dawn-b30b.poonamchouhan076.workers.dev/";

  try {
    // Fresh data ke liye caching ko destroy (bypass) karein
    const response = await fetch(WORKER_URL, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

    if (!response.ok) {
      return res.status(500).send("Worker se data fetch nahi ho paya.");
    }

    const m3uPlaylist = await response.text();

    // Sahi M3U aur CORS headers lagayein taaki player me live chale aur cache na ho
    res.setHeader('Content-Type', 'application/x-mpegurl');
    res.setHeader('Content-Disposition', 'attachment; filename="playlist.m3u"');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

    // Same to same playlist output bina badle return karein
    return res.status(200).send(m3uPlaylist);

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
