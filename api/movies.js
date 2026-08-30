export default async function handler(req, res) {
    const sources = [
        "https://old-shape-1bd3.poonamchouhan076.workers.dev/",
        "https://hdhub4u-lake-f103.poonamchouhan076.workers.dev/",
        "https://allmovieslist.poonamchouhan076.workers.dev/"
    ];

    const targetCategories = [
        "✨ New movies",
        "✨ Latest hub movies",
        "Latest movies",
        "Bollywood",
        "South",
        "Hollywood"
    ];

    try {
        let allItems = [];

        for (let url of sources) {
            try {
                let response = await fetch(url);
                let data = await response.json();
                if (Array.isArray(data)) {
                    allItems = allItems.concat(data);
                } else if (data && typeof data === 'object') {
                    Object.values(data).forEach(val => {
                        if (Array.isArray(val)) allItems = allItems.concat(val);
                    });
                }
            } catch (err) {
                console.error("Error fetching source:", url, err);
            }
        }

        let groupedPlaylist = {};

        targetCategories.forEach(cat => {
            let cleanCat = cat.replace(/✨/g, '').trim().toLowerCase();
            let matchedItems = allItems.filter(item => {
                let itemCat = (item.category || item.genre || item.type || '').toLowerCase();
                return itemCat.includes(cleanCat);
            });

            groupedPlaylist[cat] = matchedItems;
        });

        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Content-Type', 'application/json');
        return res.status(200).json(groupedPlaylist);

    } catch (error) {
        return res.status(500).json({ error: "Failed to process playlist", details: error.message });
    }
}
