export default async function handler(req, res) {
  // Isse player ko JSON mil jayega
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: "No ID" });

  try {
    // Asli license server jahan se JSON mil raha hai
    const targetUrl = `https://tplay.virey40690.workers.dev/key/${id}`;
    
    const response = await fetch(targetUrl);
    const data = await response.json();

    // Same to same wahi JSON return kar rahe hain jo asli server ka hai
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: "License Fetch Failed" });
  }
}
