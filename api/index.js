export default async function handler(req, res) {
  try {
    const url1 = "https://project-lc4mz.vercel.app/api/main";
    const url2 = "https://bold-bird-0854.poonamchouhan076.workers.dev/";

    // ⚡ Parallel + timeout protection
    const fetchWithTimeout = (url, ms = 8000) => {
      return Promise.race([
        fetch(url).then(r => r.text()),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), ms)
        )
      ]);
    };

    const [data1, data2Raw] = await Promise.all([
      fetchWithTimeout(url1),
      fetchWithTimeout(url2)
    ]);

    // ⚡ Clean 2nd playlist fast
    const data2 = data2Raw.replace("#EXTM3U", "").trim();

    // ⚡ Direct merge (no heavy processing)
    const finalPlaylist = data1.trim() + "\n" + data2;

    res.setHeader("Content-Type", "application/vnd.apple.mpegurl");

    // ⚡ Aggressive caching (VERY IMPORTANT for speed)
    res.setHeader(
      "Cache-Control",
      "public, s-maxage=900, stale-while-revalidate=1800"
    );

    res.status(200).send(finalPlaylist);

  } catch (error) {
    res.status(500).send("Fast Load Error");
  }
}