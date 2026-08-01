export default async function handler(req, res) {
  const new_playlist_url = "https://game.denver69.fun/Jtv/8qpUVH/Playlist.m3u";

  try {
    const response = await fetch(new_playlist_url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "*/*"
      }
    });

    const text = await response.text();
    
    // Agar playlist khali hai ya error page hai
    if (!text || text.length < 50) {
      return res.status(200).send(`<h3>❌ Error: Playlist empty or blocked! Response:</h3><pre>${text}</pre>`);
    }

    // Pehli 15 lines dikha dega taaki pata chale andar kya hai
    const firstLines = text.split("\n").slice(0, 15).join("\n");

    res.status(200).send(`
      <h3>🔍 Denver Playlist Raw Preview (First 15 lines):</h3>
      <pre style="background:#f4f4f4; padding:10px;">${firstLines}</pre>
    `);

  } catch (err) {
    res.status(200).send(`<h3>❌ Fetch Exception:</h3> ${err.message}`);
  }
}
