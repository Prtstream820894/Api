export default async function handler(req, res) {
  try {
    // 1. Pehle purana token delete karne ki request (Simulation)
    await fetch('https://game.denver69.fun/Jtv/delete_logic', { method: 'POST' });

    // 2. Naya token generate karna
    const response = await fetch('https://game.denver69.fun/Jtv/generate_logic');
    const html = await response.text();

    // 3. JCEVENT search karna logic
    // Hum text search kar rahe hain jisme cookie aur URL dono ho
    const regex = /https:\/\/jcevents\.hotstar\.com\/bpk-tv\/.*?m3u8\?\|Cookie=(hdntl=exp=.*?)(?=&|$|\s)/;
    const match = html.match(regex);

    if (match) {
      res.status(200).json({
        success: true,
        fullUrl: match[0],
        cookie: match[1],
        expiresIn: "4 minutes"
      });
    } else {
      res.status(404).json({ error: "Token/Cookie not found in source" });
    }
  } catch (error) {
    res.status(500).json({ error: "Automation failed" });
  }
}

