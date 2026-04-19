export default async function handler(req, res) {
    // Hotstar ka asli URL (Token ke saath)
    const targetUrl = "https://livetv.hotstar.com/mp1/gec-india-1540065788/fa6a4f0005ef4f90ab24484d165b0aaf/index.mpd?hdntl=exp=1776675371~acl=%2f*~id=827ee1057d2da0d5a5dd45c84517057f~data=hdntl~hmac=92c835cb5ea2581756c5401dea24c006996270fdc17e9c6360297a4633e46792";

    const headers = {
        'User-Agent': 'Hotstar;in.startv.hotstar/25.02.24.8.11169 (Android/15)',
        'Origin': 'https://www.hotstar.com',
        'Referer': 'https://www.hotstar.com/',
        'Cookie': 'hdntl=exp=1776675371~acl=%2f*~id=827ee1057d2da0d5a5dd45c84517057f~data=hdntl~hmac=92c835cb5ea2581756c5401dea24c006996270fdc17e9c6360297a4633e46792'
    };

    try {
        const response = await fetch(targetUrl, { headers });
        const data = await response.text();

        // Player ko batana ki ye DASH file hai
        res.setHeader('Content-Type', 'application/dash+xml');
        // Kisi bhi player se access karne ke liye allow karna
        res.setHeader('Access-Control-Allow-Origin', '*');
        
        res.status(200).send(data);
    } catch (error) {
        res.status(500).send("Error fetching stream");
    }
}

