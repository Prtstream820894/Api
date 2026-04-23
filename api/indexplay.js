export default async function handler(req, res) {
  // Sirf ?prtstream check - nahi hai to block
  if (!('prtstream' in req.query)) {
    return res.status(403).send("Access Denied Yah Link Sirf Prtstream App Me Chalenga Copy Karo Link Ko Or PrtStream Me jake Paste Karo");
  }

  try {
    const url1 = "https://project-lc4mz.vercel.app/api/main";
    const url2 = "https://bold-bird-0854.poonamchouhan076.workers.dev/";

    const fetchWithTimeout = async (url, ms = 7000) => {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), ms);

      try {
        const response = await fetch(url + "?t=" + Date.now(), {
          signal: controller.signal,
          headers: { "Cache-Control": "no-cache", "Pragma": "no-cache" }
        });
        return await response.text();
      } catch (err) {
        return "";
      } finally {
        clearTimeout(id);
      }
    };

    const [data1, data2Raw] = await Promise.all([
      fetchWithTimeout(url1),
      fetchWithTimeout(url2)
    ]);

    if (!data1) {
      return res.status(500).send("Main playlist failed");
    }

    let data2 = "";
    if (data2Raw) {
      data2 = data2Raw.replace("#EXTM3U", "").replace(/\r/g, "").trim();
    }

    const finalPlaylist = data1.trim() + "\n" + data2;

    res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
    res.setHeader("Cache-Control", "no-store");
    res.status(200).send(finalPlaylist);

  } catch (error) {
    res.status(500).send("Server Error");
  }
}
