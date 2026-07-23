export default {
async fetch(request, env, ctx) {
const playlistUrl = "https://project-lc4mz.vercel.app/api/indexplay?prtstream";
const fifaPlaylistUrl = "https://server.vodep39240327.workers.dev/channel/raw?=m3u";

const fetchOptions = {  
  headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },  
};  

try {  
  const [res1, res2] = await Promise.all([  
    fetch(playlistUrl, fetchOptions).catch(() => null),  
    fetch(fifaPlaylistUrl, fetchOptions).catch(() => null)  
  ]);  

  if (!res1 || !res1.ok) {  
    return new Response("Failed to fetch original playlist", { status: res1 ? res1.status : 500 });  
  }  

  const [text, fifaText] = await Promise.all([  
    res1.text(),  
    res2 && res2.ok ? res2.text() : Promise.resolve("")  
  ]);  

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
      currentChannel = { extinf: line, groupTitle: groupMatch ? groupMatch[1] : "", extraMetadata: [], url: "" };  
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

  if (fifaText) {  
    const fifaLines = fifaText.split(/\r?\n/);  
    let fifaChannel = null;  

    for (let i = 0; i < fifaLines.length; i++) {  
      const line = fifaLines[i].trim();  
      if (!line) continue;  

      if (line.startsWith("#EXTINF:")) {  
        if (fifaChannel) channels.push(fifaChannel);  

        const match = line.match(/group-title="([^"]+)"/i);  
        const group = match ? match[1].toLowerCase() : "";  

        if (!group.includes("fifa wc 2026")) {  
          fifaChannel = null;  
          continue;  
        }  

        fifaChannel = {  
          extinf: line.replace(/group-title="[^"]+"/, 'group-title="✨✦ʟɪᴠᴇ ᴇᴠᴇɴᴛꜱ✦✨"'),  
          groupTitle: "✨✦ʟɪᴠᴇ ᴇᴠᴇɴᴛꜱ✦✨",  
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
    if (fifaChannel) channels.push(fifaChannel);  
  }  

  const groupOrder = [
    "✨✦ʟɪᴠᴇ ᴇᴠᴇɴᴛꜱ✦✨",
    "latest movies",
    "highlights",
    "✨Upcoming Events✨",
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

  const targetLiveKey = "✨✦ʟɪᴠᴇ ᴇᴠᴇɴᴛꜱ✦✨";  

  let groupedChannels = {};  
  for (let j = 0; j < groupOrder.length; j++) {  
    groupedChannels[groupOrder[j]] = [];  
  }  
  let otherChannels = [];  

  let sportsCount = 0;  

  const getMetadata = (extinf) => {  
    const commaIdx = extinf.lastIndexOf(",");  
    const title = commaIdx !== -1 ? extinf.substring(commaIdx + 1).trim().toLowerCase() : "";  
    const logoMatch = extinf.match(/tvg-logo="([^"]+)"/i);  
    return {  
      title,  
      logo: logoMatch ? logoMatch[1].trim().toLowerCase() : ""  
    };  
  };  

  for (let i = 0; i < channels.length; i++) {  
    const ch = channels[i];  
    const originalGroup = ch.groupTitle.trim();  
    const groupLower = originalGroup.toLowerCase();  
    const meta = getMetadata(ch.extinf);  

    // Duplicate check yahan se hata diya gaya hai taaki saare channels aayein
    if (groupLower.includes("sonyliv") || groupLower.includes("fancode") || originalGroup === targetLiveKey || groupLower.includes("live event")) {  
      ch.extinf = ch.extinf.replace(/group-title="[^"]+"/, `group-title="${targetLiveKey}"`);  
      ch.groupTitle = targetLiveKey;  
      groupedChannels[targetLiveKey].push(ch);  
    }   
    else if (originalGroup === "✨Upcoming Events✨" || groupLower.includes("upcoming event")) {  
      ch.extinf = ch.extinf.replace(/group-title="[^"]+"/, 'group-title="✨Upcoming Events✨"');  
      ch.groupTitle = "✨Upcoming Events✨";  
      groupedChannels["✨Upcoming Events✨"].push(ch);  
    }  
    else if (groupLower === "sports") {  
      if (sportsCount < 0) {   
        ch.extinf = ch.extinf.replace(/group-title="[^"]+"/, `group-title="${targetLiveKey}"`);  
        ch.groupTitle = targetLiveKey;  
        groupedChannels[targetLiveKey].push(ch);  
        sportsCount++;  
      } else {  
        groupedChannels["sports"].push(ch);  
      }  
    }   
    else if (groupLower.includes("latest movies")) {
      groupedChannels["latest movies"].push(ch);
    }
    else {  
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
