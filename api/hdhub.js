export default async function handler(req, res) {
  const targetUrl = req.query.url;

  if (targetUrl) {
    try {
      const response = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        },
        redirect: 'follow'
      });
      
      const html = await response.text();
      // Simple regex to find a watch link in the HTML
      const match = html.match(/<a[^>]+href="(https?:\-?[^"]+)"[^>]*>[\s\S]*?(?:watch|WATCH)[\s\S]*?<\/a>/i) ||
                    html.match(/<a[^>]+href="(https?:\/\/[^"]+)"[^>]*>[\s\S]*?<\/a>/i);

      if (match && match[1]) {
        res.writeHead(302, { Location: match[1] });
        res.end();
        return;
      }

      res.writeHead(302, { Location: targetUrl });
      res.end();
      return;
    } catch (error) {
      res.writeHead(302, { Location: targetUrl });
      res.end();
      return;
    }
  }

  res.setHeader('Content-Type', 'audio/x-mpegurl; charset=utf-8');

  try {
    const hubRes = await fetch('https://project-lc4mz.vercel.app/api/hub');
    const hubData = await hubRes.text();

    if (!hubData) {
      res.status(200).send('#EXTM3U\n');
      return;
    }

    const lines = hubData.split('\n');
    let output = '#EXTM3U\n';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const currentUrl = `${protocol}://${host}${req.url.split('?')[0]}`;

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      if (line.startsWith('#EXTINF:')) {
        let extinf = line;

        if (/group-title="[^"]*"/i.test(extinf)) {
          extinf = extinf.replace(/group-title="[^"]*"/i, 'group-title="✨ Lastest Hub Movies"');
        } else {
          extinf = extinf.replace('#EXTINF:-1', '#EXTINF:-1 group-title="✨ Lastest Hub Movies"');
        }

        const mediaUrl = lines[i + 1] ? lines[i + 1].trim() : '';

        if (mediaUrl) {
          const proxyUrl = `${currentUrl}?url=${encodeURIComponent(mediaUrl)}`;
          output += `${extinf}\n${proxyUrl}\n`;
        }
      }
    }

    res.status(200).send(output);
  } catch (error) {
    res.status(500).send('#EXTM3U\n');
  }
}
