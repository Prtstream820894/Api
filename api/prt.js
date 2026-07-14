export default {
  async fetch(request, env, ctx) {
    const playlistUrl = "https://project-lc4mz.vercel.app/api/indexplay?prtstream";
    const fifaPlaylistUrl = "https://server.vodep39240327.workers.dev/channel/raw?=m3u";

    try {
      // 1. Original playlist fetch karo
      const response = await fetch(playlistUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        },
      });
      if (!response.ok) {
        return new Response("Failed to fetch original playlist", { status: response.status });
      }

      const text = await response.text();
      const fifaResponse = await fetch(fifaPlaylistUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        },
      });

      const fifaText = fifaResponse.ok ? await fifaResponse.text() : "";

      const lines = text.split("\n");
      let headerLines = [];
      let channels = [];
      let currentChannel = null;

      // 2. Playlist parsing shuru karo
      for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        if (!line) continue;

        if (line.startsWith("#EXTM3U")) {
          headerLines.push(line);
          continue;
        }

        if (line.startsWith("#") && !line.startsWith("#EXTINF") && !line.startsWith("#EXTVLCOPT") && !line.startsWith("#EXTHTTP") && !line.startsWith("#KODIPROP") && channels.length === 0) {
          headerLines.push(line);
          continue;
        }

        if (line.startsWith("#EXTINF:")) {
          if (currentChannel) {
            channels.push(currentChannel);
          }
          let groupMatch = line.match(/group-title="([^"]+)"/i);
          let groupTitle = groupMatch ? groupMatch[1] : "";
          currentChannel = { extinf: line, groupTitle: groupTitle, extraMetadata: [], url: "" };
        } else if (currentChannel) {
          if (line.startsWith("#")) {
            currentChannel.extraMetadata.push(line);
          } else {
            currentChannel.url = line;
            channels.push(currentChannel);
            currentChannel = null;
          }
        }
      }
      if (currentChannel) channels.push(currentChannel);

      // FIFA playlist parse
      if (fifaText) {
        const fifaLines = fifaText.split("\n");
        let fifaChannel = null;

        for (const rawLine of fifaLines) {
          const line = rawLine.trim();
          if (!line) continue;

          if (line.startsWith("#EXTINF:")) {
            if (fifaChannel) {
              channels.push(fifaChannel);
            }

            const match = line.match(/group-title="([^"]+)"/i);
            const group = match ? match[1].toLowerCase() : "";

            // Sirf FIFA WC 2026 group import hoga
            if (!group.includes("fifa wc 2026")) {
              fifaChannel = null;
              continue;
            }

            fifaChannel = {
              extinf: line.replace(
                /group-title="[^"]+"/,
                'group-title="✨✦⚽ FIFA WC✦✨"'
              ),
              groupTitle: "✨✦⚽ FIFA WC✦✨",
              extraMetadata: [],
              url: ""
            };
          } else if (fifaChannel) {
            if (line.startsWith("#")) {
              fifaChannel.extraMetadata.push(line);
            } else {
              fifaChannel.url = line;
              channels.push(fifaChannel);
              fifaChannel = null;
            }
          }
        }
        if (fifaChannel) {
          channels.push(fifaChannel);
        }
      }

      // 3. Naya Group Order Setup
      const groupOrder = [
        "✨✦ʟɪᴠᴇ ᴇᴠᴇɴᴛꜱ✦✨", 
        "✨✦⚽ FIFA WC✦✨",     // 1
        "highlights",        // 2
        "sports",            // 3
        "south",             // 4
        "bollywood movies",  // 5
        "hollywood movies",  // 6
        "web series",        // 7
        "tv show",           // 8
        "entertainment",     // 9
        "movies",            // 10
        "music",             // 11
        "news",              // 12
        "kids"               // 13
      ];

      let groupedChannels = {};
      groupOrder.forEach(g => groupedChannels[g] = []);
      let otherChannels = []; 

      let sportsCount = 0;
      
      let uniqueUrls = new Set();
      let uniqueTitles = new Set();
      let uniqueLogos = new Set();

      const getMetadata = (extinf) => {
        let titleMatch = extinf.match(/,(.+)$/);
        let logoMatch = extinf.match(/tvg-logo="([^"]+)"/i);
        return {
          title: titleMatch ? titleMatch[1].trim().toLowerCase() : "",
          logo: logoMatch ? logoMatch[1].trim().toLowerCase() : ""
        };
      };

      // 4. Processing channels based on your rules
      for (let ch of channels) {
        let originalGroup = ch.groupTitle.trim();
        let groupLower = originalGroup.toLowerCase();
        let streamUrl = ch.url.trim().toLowerCase();
        let meta = getMetadata(ch.extinf);

        // RULE 1: SonyLiv, FanCode aur Live Events ke saare channels
        if (groupLower.includes("sonyliv") || groupLower.includes("fancode") || groupLower === "✨✦ʟɪᴠᴇ ᴇᴠᴇɴᴛꜱ✦✨") {
          
          // FIX 1: Agar duplicate milta hai, toh use playlist se poora drop karne ki jagah "sports" ya "other" group me safely bhej denge!
          if (uniqueUrls.has(streamUrl) || uniqueTitles.has(meta.title) || (meta.logo && uniqueLogos.has(meta.logo))) {
            if (groupLower.includes("sonyliv") || groupLower.includes("fancode")) {
              groupedChannels["sports"].push(ch); // Sports group me safe rakha
            } else {
              otherChannels.push(ch); // Safe backup stack me daal diya
            }
            continue; 
          }

          uniqueUrls.add(streamUrl);
          uniqueTitles.add(meta.title);
          if (meta.logo) uniqueLogos.add(meta.logo);

          ch.extinf = ch.extinf.replace(/group-title="[^"]+"/, 'group-title="✨✦ʟɪᴠᴇ ᴇᴠᴇɴᴛꜱ✦✨"');
          ch.groupTitle = "✨✦ʟɪᴠᴇ ᴇᴠᴇɴᴛꜱ✦✨";
          groupedChannels["✨✦ʟɪᴠᴇ ᴇᴠᴇɴᴛꜱ✦✨"].push(ch);
        }
        // FIFA WC check
        else if (groupLower === "✨✦⚽ fifa wc✦✨") {
          groupedChannels["✨✦⚽ FIFA WC✦✨"].push(ch);
        }
        // Agar group exactly "sports" hai
        else if (groupLower === "sports") {
          if (sportsCount < 1) { // Pehle 2 channels ke liye filter check
            
            // FIX 2: Agar ye pehle do sports channel duplicate check me faste hain, toh direct regular sports me push kar do (drop mat karo!)
            if (uniqueUrls.has(streamUrl) || uniqueTitles.has(meta.title) || (meta.logo && uniqueLogos.has(meta.logo))) {
              groupedChannels["sports"].push(ch);
              continue;
            }
            uniqueUrls.add(streamUrl);
            uniqueTitles.add(meta.title);
            if (meta.logo) uniqueLogos.add(meta.logo);

            ch.extinf = ch.extinf.replace(/group-title="[^"]+"/, 'group-title="✨✦ʟɪᴠᴇ ᴇᴠᴇɴᴛꜱ✦✨"');
            ch.groupTitle = "✨✦ʟɪᴠᴇ ᴇᴠᴇɴᴛꜱ✦✨";
            groupedChannels["✨✦ʟɪᴠᴇ ᴇᴠᴇɴᴛꜱ✦✨"].push(ch);
            sportsCount++;
          } else {
            // Baaki ke normal sports channels chupchap sports group me chale jayenge
            groupedChannels["sports"].push(ch);
          }
        }
        // Baaki saare normal channels ki sorting
        else {
          if (groupLower.includes("highlights")) {
            groupedChannels["highlights"].push(ch);
          } else if (groupLower.includes("south")) {
            groupedChannels["south"].push(ch);
          } else if (groupLower.includes("bollywood")) {
            groupedChannels["bollywood movies"].push(ch);
          } else if (groupLower.includes("hollywood")) {
            groupedChannels["hollywood movies"].push(ch);
          } else if (groupLower.includes("web series")) {
            groupedChannels["web series"].push(ch);
          } else if (groupLower.includes("tv show") || groupLower.includes("tv shows")) {
            groupedChannels["tv show"].push(ch);
          } else if (groupLower.includes("entertainment")) {
            groupedChannels["entertainment"].push(ch);
          } else if (groupLower === "movies" || groupLower.includes("movies")) {
            groupedChannels["movies"].push(ch);
          } else if (groupLower.includes("music")) {
            groupedChannels["music"].push(ch);
          } else if (groupLower.includes("news")) {
            groupedChannels["news"].push(ch);
          } else if (groupLower.includes("kids")) {
            groupedChannels["kids"].push(ch);
          } else {
            otherChannels.push(ch);
          }
        }
      }

      // 5. Nayi playlist string construct karo (Sahi Order Me)
      let output = [];
      if (headerLines.length > 0) {
        output.push(headerLines.join("\n"));
      } else {
        output.push("#EXTM3U");
      }

      for (let groupKey of groupOrder) {
        let chList = groupChannels[groupKey] || groupedChannels[groupKey];
        for (let ch of chList) {
          output.push(ch.extinf);
          if (ch.extraMetadata.length > 0) output.push(ch.extraMetadata.join("\n"));
          output.push(ch.url);
        }
      }

      for (let ch of otherChannels) {
        output.push(ch.extinf);
        if (ch.extraMetadata.length > 0) output.push(ch.extraMetadata.join("\n"));
        output.push(ch.url);
      }

      return new Response(output.join("\n"), {
        headers: {
          "Content-Type": "application/x-mpegurl",
          "Access-Control-Allow-Origin": "*",
        },
      });
    } catch (error) {
      return new Response("Error: " + error.message, { status: 500 });
    }
  }
};
