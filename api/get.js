export default async function handler(req, res) {
  let current_cookie = ""; 

  // Fallback server URL jisme cookies listener/parser laga diya hai
  const fallback_url = "https://serv.vodep39240327.workers.dev/channel/raw?=m3u";
  const default_fallback_cookie = "hdntl=exp=1785499260~acl=%2f*~id=f4259cda851c7a4eaf1a3a64027227b0~data=hdntl~hmac=75637db8b9691f231d00d9095e1c7961ed59c3fc371020edcc7fe373c7b5ba08";

  // Agar pre-configured cookie hai toh direct bhej do
  if (current_cookie && current_cookie.trim() !== "") {
    return res.status(200).send(`
      <h3>🍪 Pre-configured Cookie:</h3>
      ${current_cookie}
    `);
  }

  let extracted_cookie = null;
  let debug_status = "";

  try {
    // Fallback server par cookies listener / smart parser hit karega
    const response = await fetch(fallback_url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
        "Accept": "application/x-mpegURL, text/plain, */*",
        "Cache-Control": "no-cache"
      }
    });

    debug_status += `Fallback HTTP Status: ${response.status} | `;

    if (response.ok) {
      const text = await response.text();
      debug_status += `Text Length: ${text.length} | `;

      if (text.length > 0) {
        const lines = text.split("\n");

        // Smart Cookies Listener: Playlist ya raw stream me se cookie dhoondne ke multi-patterns
        for (let i = 0; i < lines.length; i++) {
          const currentLine = lines[i];

          // Check for channel/stream identifiers or direct cookie keys
          if (currentLine.includes("JC_ColorsHD") || currentLine.includes("jcevent") || currentLine.includes("hdntl=")) {
            
            // Pattern 1: Direct Cookie=... ya hdntl=... match
            let match = currentLine.match(/Cookie=([^&\s]+)/i) || currentLine.match(/(hdntl=[^&\s"]+)/i);

            // Pattern 2: Agar usi line me nahi mila toh EXTVLCOPT ya JSON attributes check karo
            if (!match) {
              for (let j = i - 1; j >= Math.max(0, i - 3); j--) {
                const upperLine = lines[j];
                match = upperLine.match(/http-cookie=(.+)/i) || 
                        upperLine.match(/"Cookie":"([^"]+)"/i) || 
                        upperLine.match(/Cookie=([^&\s]+)/i) ||
                        upperLine.match(/(hdntl=[^&\s"]+)/i);
                if (match) break;
              }
            }

            if (match) {
              extracted_cookie = match[1].trim();
              break;
            }
          }
        }
      }
    }
  } catch (err) {
    debug_status += `Fallback Error: ${err.message} | `;
  }

  // Final Output Selection
  const final_cookie = extracted_cookie || default_fallback_cookie;
  const source_label = extracted_cookie ? "Live Extracted Cookie (Listener Active)" : "Default Cookie (Fallback)";

  res.status(200).send(`
    <h3>🍪 ${source_label}:</h3>
    ${final_cookie}
    <hr>
    <p style="font-size: 11px; color: gray;"><b>Debug Info:</b> ${debug_status}</p>
  `);
}
