export default async function handler(req, res) {

  const workerUrl = "https://wild-snowflake-c305.poonamchouhan076.workers.dev/";

  try {

    const r = await fetch(workerUrl);
    const text = await r.text();

    res.setHeader("Content-Type","text/plain");
    res.status(200).send(text);

  } catch (e) {

    res.status(500).send("Error");

  }

}
