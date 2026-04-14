export default async function handler(req, res) {
  try {
    const url1 = "https://fancy-morning-a287.poonamchouhan076.workers.dev/";
    const url2 = "https://tight-firefly-ecdd.poonamchouhan076.workers.dev/";

    // Fetch both playlists
    const [p1, p2] = await Promise.all([
      fetch(url1).then(r => r.text()),
      fetch(url2).then(r => r.text())
    ]);

    // Remove duplicate header from second playlist
    const cleanP2 = p2.replace("#EXTM3U", "").trim();

    // Final merged playlist (Top → Bottom)
    const finalPlaylist = `#EXTM3U\n${p1.replace("#EXTM3U", "").trim()}\n${cleanP2}`;

    res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
    res.status(200).send(finalPlaylist);

  } catch (e) {
    res.status(500).send("Error: " + e.message);
  }
}