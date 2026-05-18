export default async function handler(req, res) {
  // Dittoo JSON format ke liye headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: "Missing Channel ID" });

  try {
    const targetUrl = `https://tplay.virey40690.workers.dev/key/${id}`;
    
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      }
    });

    if (!response.ok) throw new Error("Source JSON fetch failed");

    const data = await response.json();

    // Poora ka poora JSON waisa ka waisa hi return kar rahe hain
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
