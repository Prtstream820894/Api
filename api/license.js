export default async function handler(req, res) {
  // Yeh file ClearKey format bna kar player ko degi
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'text/plain');

  const { id } = req.query;
  if (!id) return res.status(400).send("Missing Channel ID");

  try {
    const targetLicenseUrl = `[https://tplay.virey40690.workers.dev/key/$](https://tplay.virey40690.workers.dev/key/$){id}`;
    
    const response = await fetch(targetLicenseUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json"
      }
    });

    if (response.ok) {
      const json = await response.json();
      if (json.keys && json.keys[0]) {
        const kid = json.keys[0].kid;
        const k = json.keys[0].k;
        // Pura string return karein jo player ko chahiye
        return res.status(200).send(`${kid}:${k}`);
      }
    }
    return res.status(500).send("Failed to extract keys from JSON");
  } catch (error) {
    return res.status(500).send("Error: " + error.message);
  }
}
