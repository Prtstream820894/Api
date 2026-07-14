export default {
  async fetch(request, env, ctx) {
    const playlistUrl = "https://project-lc4mz.vercel.app/api/indexplay?prtstream";
    const fifaPlaylistUrl = "https://server.vodep39240327.workers.dev/channel/raw?=m3u";
    const jtvPlaylistUrl = "https://raw.githubusercontent.com/poonamchouhan54/love-/refs/heads/main/Jtv.m3u";

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

      // 2. FIFA playlist fetch karo
      const fifaResponse = await fetch(fifaPlaylistUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        },
      });
      const fifaText = fifaResponse.ok ? await fifaResponse.text() : "";

      // 3. Nayi Jtv playlist fetch karo
      const jtvResponse = await fetch(jtvPlaylistUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        },
      });
      const jtvText = jtvResponse.ok ? await jtvResponse.text() : "";

      const lines = text.split("\n");
      let headerLines = [];
      let channels = [];
      let currentChannel = null;

      // Playlist parsing shuru karo (Main Playlist)
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

      // Jtv playlist parse (Teesri playlist ka data bina kisi check ke pure channels add honge)
      if (jtvText) {
        const jtvLines = jtvText.split("\n");
        let jtvChannel = null;

        for (const rawLine of jtvLines) {
          const line = rawLine.trim();
          if (!line) continue;

          // Skip head tag if present in loop
          if (line.startsWith("#EXTM3U")) continue;

          if (line.startsWith("#EXTINF:")) {
            if (jtvChannel) {
              channels.push(jtvChannel);
            }
            let groupMatch = line.match(/group-title="([^"]+)"/i);
            let groupTitle = groupMatch ? groupMatch[1] : "";
            jtvChannel = { extinf: line, groupTitle: groupTitle, extraMetadata: [], url: "" };
          } else if (jtvChannel) {
            if (line.startsWith("#")) {
              jtvChannel.extraMetadata.push(line);
            } else {
              jtvChannel.url = line;
              channels.push(jtvChannel);
              jtvChannel = null;
            }
          }
        }
        if (jtvChannel) {
          channels.push(jtvChannel);
        }
      }

      // 4. Group Order Setup
      const groupOrder = [
        "✨✦ʟɪᴠᴇ ᴇᴠᴇɴᴛꜱ✦✨", 
        "✨✦⚽ FIFA WC✦✨",     
        "highlights",        
        "sports",            
        "south",             
        "bollywood movies",  
        "hollywood movies",  
        "web series",        
        "tv show",           
        "entertainment",     
        "movies",            
        "music",             
        "news",              
        "kids"               
      ];

      let groupedChannels = {};
      groupOrder.forEach(g => groupedChannels[g] = []);
      let otherChannels = []; 

      let sportsCount = 0;

      // 5. Processing all channels (NO SKIPPING/FILTERING AT ALL)
      for (let ch of channels) {
        let originalGroup = ch.groupTitle.trim();
        let groupLower = originalGroup.toLowerCase();

        // RULE 1: SonyLiv, FanCode aur Live Events ke saare channels
        if (groupLower.includes("sonyliv") || groupLower.includes("fancode") || groupLower === "✨✦ʟɪᴠᴇ ᴇᴠᴇɴᴛꜱ✦✨") {
          ch.extinf = ch.extinf.replace(/group-title="[^"]+"/, 'group-title="✨✦ʟɪᴠᴇ ᴇᴠᴇɴᴛꜱ✦✨"');
          ch.groupTitle = "✨✦ʟɪᴠᴇ ᴇᴠᴇɴᴛꜱ✦✨";
          groupedChannels["✨✦ʟɪᴠᴇ ᴇᴠᴇɴᴛꜱ✦✨"].push(ch);
        }
        // FIFA WC check
        else if (groupLower === "✨✦⚽ fifa wc✦✨") {
          groupedChannels["✨✦⚽ FIFA WC✦✨"].push(ch);
        }
        // Sports check: Pehle 2 channels live events me jayenge
        else if (groupLower === "sports") {
          if (sportsCount < 1) { 
            ch.extinf = ch.extinf.replace(/group-title="[^"]+"/, 'group-title="✨✦ʟɪᴠᴇ ᴇᴠᴇɴᴛꜱ✦✨"');
            ch.groupTitle = "✨✦ʟɪᴠᴇ ᴇᴠᴇɴᴛꜱ✦✨";
            groupedChannels["✨✦ʟɪᴠᴇ ᴇᴠᴇɴᴛꜱ✦✨"].push(ch);
            sportsCount++;
          } else {
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
            // Jtv ya PRTstream ke baaki saare channels jo upar match nahi huye, wo yahan safely aa jayenge
            otherChannels.push(ch);
          }
        }
      }

      // 6. Nayi playlist string construct karo (Sahi Order Me)
      let output = [];
      if (headerLines.length > 0) {
        output.push(headerLines.join("\n"));
      } else {
        output.push("#EXTM3U");
      }

      // Priority Groups ko add karo
      for (let groupKey of groupOrder) {
        let chList = groupedChannels[groupKey];
        for (let ch of chList) {
          output.push(ch.extinf);
          if (ch.extraMetadata.length > 0) output.push(ch.extraMetadata.join("\n"));
          output.push(ch.url);
        }
      }

      // Extra normal channels ko sabse niche append karo
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
