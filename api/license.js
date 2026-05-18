export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { url } = req.query;
  if (!url) return res.status(400).send("Missing URL");

  try {
    const response = await fetch(decodeURIComponent(url));
    const jsonData = await response.json();

    if (jsonData.keys && jsonData.keys.length > 0) {
      const kid = jsonData.keys[0].kid;
      const k = jsonData.keys[0].k;
      
      // Player ko standard kid:k format dena
      res.setHeader('Content-Type', 'text/plain');
      return res.status(200).send(`${kid}:${k}`);
    } else {
      return res.status(404).send("Keys not found");
    }
  } catch (error) {
    return res.status(500).send("Error: " + error.message);
  }
}
