export default function handler(req, res) {
  // CORS Headers taaki player kisi bhi domain se isko access kar sake
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Agar player pre-flight (OPTIONS) request bhejta hai
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Aapka ClearKey JSON Data
  const licenseData = {
    "keys": [
      {
        "kty": "oct",
        "kid": "ap5CBPP4V36_bnmzsYVz-A",
        "k": "eMog1vi-kE7sYcDprKPFEQ"
      }
    ],
    "type": "temporary"
  };

  // Response ko JSON format me bhejna
  res.status(200).json(licenseData);
}
