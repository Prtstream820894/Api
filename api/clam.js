export default async function handler(req, res) {
  try {
    const response = await fetch("https://calm-art-fcf9.prtstream.workers.dev/");
    const data = await response.text();

    res.setHeader("Content-Type", "text/plain");
    res.status(200).send(data);
  } catch (e) {
    res.status(500).send("Error fetching playlist");
  }
}