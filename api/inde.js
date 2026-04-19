export default async function handler(req, res) {
  try {
    const url1 = "https://project-lc4mz.vercel.app/api/main";
    const url2 = "https://bold-bird-0854.poonamchouhan076.workers.dev/";

    // ⚡ Ultra fast fetch with timeout + no cache
    const fetchWithTimeout = async (url, ms = 7000) => {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), ms);

      try {
        const response = await fetch(url + "?t=" + Date.now(), {
          signal: controller.signal,
          headers: {
            "Cache-Control": "no-cache",
            "Pragma": "no-cache"
          }
        });

        return await response.text();
      } catch (err) {
        return ""; // fail-safe (empty return)
      } finally {
        clearTimeout(id);
      }
    };

    // ⚡ Parallel fetch
    const [data1, data2Raw] = await Promise.all([
      fetchWithTimeout(url1),
      fetchWithTimeout(url2)
    ]);

    // ❌ Agar main playlist hi fail ho jaye
    if (!data1) {
      return res.status(500).send("Main playlist failed");
    }

    // ⚡ Clean second playlist
    let data2 = "";
    if (data2Raw) {
      data2 = data2Raw
        .replace("#EXTM3U", "")
        .replace(/\r/g, "")
        .trim();
    }

    // ⚡ Final merge
    const finalPlaylist = data1.trim() + "\n" + data2;

    // 🎯 Headers
    res.setHeader("Content-Type", "application/vnd.apple.mpegurl");

    // ⚡ Very fast + fresh update (no stale issue)
    res.setHeader(
      "Cache-Control",
      "public, s-maxage=30, stale-while-revalidate=60"
    );

    res.status(200).send(finalPlaylist);

  } catch (error) {
    res.status(500).send("Server Error");
  }
}
