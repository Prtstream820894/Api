export default async function handler(req, res) {
  const firebaseURL = "https://ipl2020-46d2f.firebaseio.com/Webplalist.json";

  try {
    const response = await fetch(firebaseURL);
    const data = await response.json();

    if (!data || !Array.isArray(data)) {
      return res.status(404).send("Data invalid or empty");
    }

    let m3u8 = "#EXTM3U\n";

    data.forEach((item) => {
      // Check kar rahe hain ki item null na ho aur usme id/name ho
      if (item && item.id && item.name) {
        const name = item.name;
        const logo = item.logo || "";
        
        // JSON ke "group" key se data le rahe hain
        // Agar group khali hai toh "General" dikhayega
        const groupName = item.group || "General"; 
        
        const url = item.id;

        m3u8 += `#EXTINF:-1 tvg-logo="${logo}" group-title="${groupName}",${name}\n`;
        m3u8 += `${url}\n`;
      }
    });

    // Performance aur Fast Loading ke liye headers
    res.setHeader('Content-Type', 'application/x-mpegurl');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=59');

    return res.status(200).send(m3u8);

  } catch (error) {
    return res.status(500).send("Error fetching data: " + error.message);
  }
}
