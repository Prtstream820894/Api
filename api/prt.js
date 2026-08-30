export default {
  async fetch(request, env, ctx) {
    const playlistUrl = "https://project-lc4mz.vercel.app/api/indexplay?prtstream";
    const fetchOptions = {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
      },
    };

    try {
      const res1 = await fetch(playlistUrl, fetchOptions).catch(() => null);

      if (!res1 || !res1.ok) {
        return new Response("Failed to fetch original playlist", { 
          status: res1 ? res1.status : 500 
        });
      }

      const text = await res1.text();
      const lines = text.split(/\r?\n/);
      let headerLines = [];
      let channels = [];
      let currentChannel = null;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
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
          if (currentChannel) channels.push(currentChannel);
          const groupMatch = line.match(/group-title="([^"]+)"/i);
          currentChannel = {
            extinf: line,
            groupTitle: groupMatch ? groupMatch[1] : "",
            extraMetadata: [],
            url: ""
          };
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

      const targetLiveKey = "✨✦ʟɪᴠᴇ ᴇᴠᴇɴᴛꜱ✦✨";
      
      const groupOrder = [
        targetLiveKey,
        "new movies",
        "✨ Lastest Hub Movies",
        "latest movies",
        "🔥18+",
        "filmyfy latest",
        "highlights",
        "✨Upcoming Events✨",
        "sports",
        "infotainment",
        "devotional",
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
      for (let j = 0; j < groupOrder.length; j++) {
        groupedChannels[groupOrder[j]] = [];
      }
      let otherChannels = [];

      for (let i = 0; i < channels.length; i++) {
        const ch = channels[i];
        const originalGroup = ch.groupTitle.trim();
        const groupLower = originalGroup.toLowerCase();

        if (groupLower.includes("upcoming")) {
          ch.extinf = ch.extinf.replace(/group-title="[^"]+"/, 'group-title="✨Upcoming Events✨"');
          ch.groupTitle = "✨Upcoming Events✨";
          groupedChannels["✨Upcoming Events✨"].push(ch);
        } else if (groupLower.includes("live") || groupLower.includes("event") || groupLower.includes("ʟɪᴠᴇ") || groupLower.includes("ᴇᴠᴇɴᴛ")) {
          ch.extinf = ch.extinf.replace(/group-title="[^"]+"/, `group-title="${targetLiveKey}"`);
          ch.groupTitle = targetLiveKey;
          groupedChannels[targetLiveKey].push(ch);
        } else if (groupLower === "sports") {
          groupedChannels["sports"].push(ch);
        } else if (groupLower.includes("infotainment") || groupLower.includes("knowledge") || groupLower.includes("nat geo") || groupLower.includes("history") || groupLower.includes("bbc earth")) {
          groupedChannels["infotainment"].push(ch);
        } else if (groupLower.includes("devot") || groupLower.includes("bhakti") || groupLower.includes("satsang") || groupLower.includes("shraddha") || groupLower.includes("spiritual")) {
          groupedChannels["devotional"].push(ch);
        } else if (groupLower.includes("new movies")) {
          groupedChannels["new movies"].push(ch);
        } else if (groupLower.includes("lastest hub movies") || groupLower.includes("hub movies")) {
          ch.extinf = ch.extinf.replace(/group-title="[^"]+"/, 'group-title="✨ Lastest Hub Movies"');
          ch.groupTitle = "✨ Lastest Hub Movies";
          groupedChannels["✨ Lastest Hub Movies"].push(ch);
        } else if (groupLower.includes("latest movies")) {
          groupedChannels["latest movies"].push(ch);
        } else if (groupLower.includes("18+") || groupLower.includes("adult")) {
          ch.extinf = ch.extinf.replace(/group-title="[^"]+"/, 'group-title="🔥18+"');
          ch.groupTitle = "🔥18+";
          groupedChannels["🔥18+"].push(ch);
        } else if (groupLower.includes("filmyfy latest")) {
          groupedChannels["filmyfy latest"].push(ch);
        } else {
          if (groupLower.includes("highlights")) groupedChannels["highlights"].push(ch);
          else if (groupLower.includes("south")) groupedChannels["south"].push(ch);
          else if (groupLower.includes("bollywood")) groupedChannels["bollywood movies"].push(ch);
          else if (groupLower.includes("hollywood")) groupedChannels["hollywood movies"].push(ch);
          else if (groupLower.includes("web series")) groupedChannels["web series"].push(ch);
          else if (groupLower.includes("tv show") || groupLower.includes("tv shows")) groupedChannels["tv show"].push(ch);
          else if (groupLower.includes("entertainment")) groupedChannels["entertainment"].push(ch);
          else if (groupLower.includes("movies")) groupedChannels["movies"].push(ch);
          else if (groupLower.includes("music")) groupedChannels["music"].push(ch);
          else if (groupLower.includes("news")) groupedChannels["news"].push(ch);
          else if (groupLower.includes("kids")) groupedChannels["kids"].push(ch);
          else otherChannels.push(ch);
        }
      }

      let output = [headerLines.length > 0 ? headerLines.join("\n") : "#EXTM3U"];

      for (let i = 0; i < groupOrder.length; i++) {
        const chList = groupedChannels[groupOrder[i]];
        for (let j = 0; j < chList.length; j++) {
          const ch = chList[j];
          output.push(ch.extinf);
          if (ch.extraMetadata.length > 0) output.push(ch.extraMetadata.join("\n"));
          output.push(ch.url);
        }
      }

      for (let i = 0; i < otherChannels.length; i++) {
        const ch = otherChannels[i];
        output.push(ch.extinf);
        if (ch.extraMetadata.length > 0) output.push(ch.extraMetadata.join("\n"));
        output.push(ch.url);
      }

      return new Response(output.join("\n"), {
        headers: {
          "Content-Type": "application/x-mpegurl",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "public, max-age=120"
        },
      });

    } catch (error) {
      return new Response("Error: " + error.message, { status: 500 });
    }
  }
};
