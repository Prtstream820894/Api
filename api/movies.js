export default async function handler(req, res) {
    const sources = [
        "https://old-shape-1bd3.poonamchouhan076.workers.dev/",
        "https://hdhub4u-lake-f103.poonamchouhan076.workers.dev/",
        "https://allmovieslist.poonamchouhan076.workers.dev/"
    ];

    // Aapka bataya hua exact group priority order
    const priorityGroups = [
        "✨ New movies",
        "✨ Latest hub movies",
        "Latest movies",
        "Bollywood",
        "South",
        "Hollywood"
    ];

    try {
        let allItems = [];

        // 1. Teeno workers se M3U text fetch karke parse karna
        for (let url of sources) {
            try {
                let response = await fetch(url);
                let text = await response.text();
                let parsedItems = parseM3U(text);
                allItems = allItems.concat(parsedItems);
            } catch (err) {
                console.error("Error fetching source:", url, err);
            }
        }

        // 2. Group mapping aur ordering
        let groupedItems = {};
        priorityGroups.forEach(group => {
            groupedItems[group.toLowerCase()] = {
                originalName: group,
                items: []
            };
        });

        // Baki bache hue groups ke liye ek 'Other' bucket
        let otherItems = [];

        allItems.forEach(item => {
            let itemGroup = (item.groupTitle || "").trim();
            let matchedKey = Object.keys(groupedItems).find(key => 
                itemGroup.toLowerCase().includes(key.replace(/✨/g, "").trim())
            );

            if (matchedKey) {
                groupedItems[matchedKey].items.push(item);
            } else {
                // Agar group match nahi hua toh original group maintain rakhenge ya other mein daalenge
                otherItems.push(item);
            }
        });

        // 3. Wapas M3U format generate karna
        let finalM3U = "#EXTM3U\n";

        // Pehle priority groups ke items daalna
        priorityGroups.forEach(group => {
            let key = group.toLowerCase();
            if (groupedItems[key]) {
                groupedItems[key].items.forEach(item => {
                    finalM3U += `#EXTINF:-1 tvg-logo="${item.logo}" group-title="${group}",${item.title}\n${item.url}\n`;
                });
            }
        });

        // Baaki bache hue items ko bhi add kar dena taaki kuch chhute nahi
        otherItems.forEach(item => {
            let gTitle = item.groupTitle || "General";
            finalM3U += `#EXTINF:-1 tvg-logo="${item.logo}" group-title="${gTitle}",${item.title}\n${item.url}\n`;
        });

        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Content-Type', 'audio/x-mpegurl'); // M3U content type
        return res.status(200).send(finalM3U);

    } catch (error) {
        return res.status(500).send("#EXTM3U\n# Error generating playlist");
    }
}

// Helper function to parse M3U text into objects
function parseM3U(m3uText) {
    let lines = m3uText.split(/\r?\n/);
    let items = [];
    let currentItem = {};

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        if (line.startsWith("#EXTINF:")) {
            currentItem = {};
            // Extract logo
            let logoMatch = line.match(/tvg-logo="([^"]*)"/);
            if (logoMatch) currentItem.logo = logoMatch[1];

            // Extract group-title
            let groupMatch = line.match(/group-title="([^"]*)"/);
            if (groupMatch) currentItem.groupTitle = groupMatch[1];

            // Extract Title (after comma)
            let commaIndex = line.lastIndexOf(',');
            if (commaIndex !== -1) {
                currentItem.title = line.substring(commaIndex + 1);
            }
        } else if (line && !line.startsWith("#")) {
            currentItem.url = line;
            if (currentItem.title && currentItem.url) {
                items.push(currentItem);
            }
            currentItem = {};
        }
    }
    return items;
}
