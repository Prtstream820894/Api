export default {
  async fetch(request, env, ctx) {
    const playlistUrl = "https://project-lc4mz.vercel.app/api/indexplay?prtstream";

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
      const lines = text.split("\n");
      let headerLines = [];
      let channels = [];
      let currentChannel = null;

      // 2. Playlist parsing suru karo
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

      // 3. Naya Group Order Setup (Case-insensitive matching ke liye lowercase kiya hai)
      const groupOrder = [
        "✨✦ʟɪᴠᴇ ᴇᴠᴇɴᴛꜱ✦✨",      // 1
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

      // Sabhi groups ke channels ko hold karne ke liye ek object map
      let groupedChannels = {};
      groupOrder.forEach(g => groupedChannels[g] = []);
      let otherChannels = []; // Baki bache huye groups ke liye

      let sportsCount = 0;

      // 4. Processing channels based on your new rules
      for (let ch of channels) {
        let originalGroup = ch.groupTitle.trim();
        let groupLower = originalGroup.toLowerCase();

        // RULE 1: SonyLiv aur FanCode ke saare channels ✨✦ʟɪᴠᴇ ᴇᴠᴇɴᴛꜱ✦✨ me daalo
        if (groupLower.includes("sonyliv") || groupLower.includes("fancode")) {
          ch.extinf = ch.extinf.replace(/group-title="[^"]+"/, 'group-title="✨✦ʟɪᴠᴇ ᴇᴠᴇɴᴛꜱ✦✨"');
          ch.groupTitle = "✨✦ʟɪᴠᴇ ᴇᴠᴇɴᴛꜱ✦✨";
          groupedChannels["✨✦ʟɪᴠᴇ ᴇᴠᴇɴᴛꜱ✦✨"].push(ch);
        }
        // BADLAV 1: Agar group exactly "sports" hai
        else if (groupLower === "sports") {
          if (sportsCount < 5) {
            // Shuruati 5 channels direct ✨✦ʟɪᴠᴇ ᴇᴠᴇɴᴛꜱ✦✨ me jayenge (Sports me nahi rahenge)
            ch.extinf = ch.extinf.replace(/group-title="[^"]+"/, 'group-title="✨✦ʟɪᴠᴇ ᴇᴠᴇɴᴛꜱ✦✨"');
            ch.groupTitle = "✨✦ʟɪᴠᴇ ᴇᴠᴇɴᴛꜱ✦✨";
            groupedChannels["✨✦ʟɪᴠᴇ ᴇᴠᴇɴᴛꜱ✦✨"].push(ch);
            sportsCount++;
          } else {
            // 5 ke baad waale bache huye channels original Sports me hi rahenge
            groupedChannels["sports"].push(ch);
          }
        }
        // Baaki saare normal channels ki sorting
        else {
  if (groupLower.includes("highlights")) {
    groupedChannels["highlights"].push(ch);
  } else if (groupLower === "sports") {
    groupedChannels["sports"].push(ch);
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

      // BADLAV 2: Ek-ek karke defined 1 se 13 groups ko joddo
      for (let groupKey of groupOrder) {
        let chList = groupedChannels[groupKey];
        for (let ch of chList) {
          output.push(ch.extinf);
          if (ch.extraMetadata.length > 0) output.push(ch.extraMetadata.join("\n"));
          output.push(ch.url);
        }
      }

      // Baki jo bache huye groups hain unhe sabse niche joddo
      for (let ch of otherChannels) {
        output.push(ch.extinf);
        if (ch.extraMetadata.length > 0) output.push(ch.extraMetadata.join("\n"));
        output.push(ch.url);
      }

      // Final response send karo
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
