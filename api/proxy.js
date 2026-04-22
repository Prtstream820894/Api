export default async function handler(req, res) {
  try {
    const { url, device, ts } = req.query;
    if (!url || !device || !ts) {
      return res.status(403).end();
    }

    const realUrl = decodeURIComponent(url);
    const response = await fetch(realUrl, {
      headers: { "User-Agent": "PRTStream/1.0" }
    });
    
    if (!response.ok) {
      return res.status(response.status).end();
    }

    // Important headers copy karo
    const contentType = response.headers.get('content-type');
    if (contentType) res.setHeader('Content-Type', contentType);
    
    res.setHeader("Cache-Control", "no-store");
    
    // Stream pipe karo
    const arrayBuffer = await response.arrayBuffer();
    res.status(200).send(Buffer.from(arrayBuffer));

  } catch (e) {
    res.status(500).end();
  }
}