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
        // Agar koi aur header direct metadata hai (jaise #Generated ya x-tvg) toh header me daal do
        if (line.startsWith("#") && !line.startsWith("#EXTINF") && !line.startsWith("#EXTVLCOPT") && !line.startsWith("#EXTHTTP") && !line.startsWith("#KODIPROP") && channels.length === 0) {
          headerLines.push(line);
          continue;
        }

        if (line.startsWith("#EXTINF:")) {
          if (currentChannel) {
            channels.push(currentChannel);
          }
          
          // Group name nikaalo
          let groupMatch = line.match(/group-title="([^"]+)"/i);
          let groupTitle = groupMatch ? groupMatch[1] : "";

          currentChannel = {
            extinf: line,
            groupTitle: groupTitle,
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

      // 3. Arrays banao filtering ke liye
      let liveEventChannels = [];
      let sportsGroupChannels = [];
      let otherChannels = [];

      let sportsCount = 0;

      // 4. Processing channels based on rules
      for (let ch of channels) {
        let group = ch.groupTitle.toLowerCase();

        // Rule: SonyLiv aur FanCode ke saare channels ⚡Live Event me daalo
        if (group.includes("sonyliv") || group.includes("fancode")) {
          // Group title badal kar ⚡Live Event karo
          let updatedExtinf = ch.extinf.replace(/group-title="[^"]+"/, 'group-title="⚡Live Event"');
          ch.extinf = updatedExtinf;
          liveEventChannels.push(ch);
        } 
        // Rule: Sports group ke channels ko process karo
        else if (group === "sports") {
          // Pehle 5 channels ko ⚡Live Event me bhi add karo
          if (sportsCount < 5) {
            // Clone channel for Live Event group
            let cloneCh = {
              extinf: ch.extinf.replace(/group-title="[^"]+"/, 'group-title="⚡Live Event"'),
              extraMetadata: [...ch.extraMetadata],
              url: ch.url
            };
            liveEventChannels.push(cloneCh);
            sportsCount++;
          }
          // Original Sports channel vaise ka vaisa rahega
          sportsGroupChannels.push(ch);
        } 
        // Baaki saare groups (Movies, Entertainment, etc.)
        else {
          otherChannels.push(ch);
        }
      }

      // 5. Nayi playlist string construct karo
      let output = [];
      if (headerLines.length > 0) {
        output.push(headerLines.join("\n"));
      } else {
        output.push("#EXTM3U");
      }

      // Pehle ⚡Live Event group ke saare channels joddo
      for (let ch of liveEventChannels) {
        output.push(ch.extinf);
        if (ch.extraMetadata.length > 0) output.push(ch.extraMetadata.join("\n"));
        output.push(ch.url);
      }

      // Phir original Sports group ke channels joddo
      for (let ch of sportsGroupChannels) {
        output.push(ch.extinf);
        if (ch.extraMetadata.length > 0) output.push(ch.extraMetadata.join("\n"));
        output.push(ch.url);
      }

      // Phir baaki bache huye groups (Entertainment, Movies, etc.)
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
