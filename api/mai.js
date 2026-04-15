export default async function handler(req, res) {
  try {
    const url1 = "https://fancy-morning-a287.poonamchouhan076.workers.dev/";
    const url2 = "https://tight-firefly-ecdd.poonamchouhan076.workers.dev/";
    const url3 = "https://ekjhirastreaming.42web.io/zee3.php";

    // Fetch all playlists
    const [p1, p2, p3] = await Promise.all([
      fetch(url1).then(r => r.text()),
      fetch(url2).then(r => r.text()),
      fetch(url3).then(r => r.text())
    ]);

    // Clean headers (#EXTM3U remove)
    const cleanP1 = p1.replace("#EXTM3U", "").trim();
    const cleanP2 = p2.replace("#EXTM3U", "").trim();
    const cleanP3 = p3.replace("#EXTM3U", "").trim();

    // Final merged playlist (Top → Bottom → Last)
    const finalPlaylist = `#EXTM3U\n${cleanP1}\n${cleanP2}\n${cleanP3}`;

    res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
    res.status(200).send(finalPlaylist);

  } catch (e) {
    res.status(500).send("Error: " + e.message);
  }
}