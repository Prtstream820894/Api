export default async function handler(req, res) {
  const targetUrl = "https://game.denver69.fun/Jtv/";
  
  try {
    // 1. Fetching the page with Browser-like Headers
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://game.denver69.fun/',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,'
      }
    });

    const html = await response.text();

    // 2. Debugging: Agar source empty hai toh check karein
    if (!html || html.length < 100) {
      return res.status(500).json({ error: "Site blocked the request or empty response" });
    }

    // 3. Robust Regex: Ye 'jcevents' aur 'hdntl' dono ko dhoondhega
    // Ye pattern pure line ko capture karega jisme hotstar ka link ho
    const linkRegex = /(https:\/\/jcevents\.hotstar\.com\/bpk-tv\/.*?.m3u8\?\|.*?)(?=["'\s<>])/g;
    const match = html.match(linkRegex);

    if (match && match[0]) {
      const fullUrl = match[0];
      
      // Cookie extract karne ke liye
      const cookieMatch = fullUrl.match(/hdntl=exp=[^&|\s]+/);
      const cookie = cookieMatch ? cookieMatch[0] : "Cookie not found in URL";

      res.status(200).json({
        success: true,
        extracted_url: fullUrl,
        cookie: cookie,
        raw_match: match[0]
      });
    } else {
      // Agar match nahi mila toh html ka ek chota hissa return karein debug ke liye
      res.status(404).json({ 
        error: "Token/Cookie not found in source",
        hint: "Check if 'Generate' button needs to be clicked first",
        preview: html.substring(0, 500).replace(/<[^>]*>?/gm, '') // Stripping tags for preview
      });
    }
  } catch (err) {
    res.status(500).json({ error: "Server Error", details: err.message });
  }
}
