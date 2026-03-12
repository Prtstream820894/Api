export default async function handler(req, res) {

  const workerUrl = "https://raspy-firefly-02ff.prtstream.workers.dev/";

  try {

    const r = await fetch(workerUrl);
    const text = await r.text();

    res.setHeader("Content-Type","text/plain");
    res.status(200).send(text);

  } catch (e) {

    res.status(500).send("Error");

  }

}
