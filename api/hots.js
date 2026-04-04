const https = require('https');

export default function handler(req, res) {
  const workerUrl = "https://nameless-wood-7d2f.prtstream.workers.dev/";

  https.get(workerUrl, (workerRes) => {
    let data = '';

    // Data receive karna
    workerRes.on('data', (chunk) => {
      data += chunk;
    });

    // Jab data poora ho jaye
    workerRes.on('end', () => {
      res.setHeader('Content-Type', 'application/x-mpegurl');
      res.setHeader('Content-Disposition', 'attachment; filename=playlist.m3u');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.status(200).send(data);
    });

  }).on('error', (err) => {
    res.status(500).send("Error fetching worker: " + err.message);
  });
}
