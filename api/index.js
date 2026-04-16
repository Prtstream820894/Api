export default async function handler(req, res) {
  try {
    const url1 = "https://project-lc4mz.vercel.app/api/main";
    const url2 = "https://bold-bird-0854.poonamchouhan076.workers.dev/";

    // Fetch both playlists
    const [res1, res2] = await Promise.all([
      fetch(url1),
      fetch(url2)
    ]);

    let data1 = await res1.text();
    let data2 = await res2.text();

    // Remove duplicate #EXTM3U from second playlist
    data2 = data2.replace("#EXTM3U", "").trim();

    // Final merged playlist (first always on top)
    const finalPlaylist = `${data1.trim()}\n\n${data2}`;

    res.setHeader("Content-Type", "application/x-mpegURL");
    res.status(200).send(finalPlaylist);

  } catch (error) {
    res.status(500).send("Error loading playlist");
  }
}