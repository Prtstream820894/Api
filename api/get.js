export default async function handler(req, res) {
  // 1. Agar yahan pehle se hi cookie dali hui hai, toh yeh direct wahi use kar lega
  let current_cookie = ""; 

  const fallback_url = "https://serv.vodep39240327.workers.dev/channel/raw?=m3u";
  const default_fallback_cookie = "hdntl=exp=1785499260~acl=%2f*~id=f4259cda851c7a4eaf1a3a64027227b0~data=hdntl~hmac=75637db8b9691f231d00d9095e1c7961ed59c3fc371020edcc7fe373c7b5ba08";

  // Agar code ke andar pehle se cookie set hai toh wahi bhej do
  if (current_cookie && current_cookie.trim() !== "") {
    return res.status(200).send(`
      <h3>🍪 Pre-configured Cookie:</h3>
      ${current_cookie}
    `);
  }

  let extracted_cookie = null;

  // 2. Step 2: Fallback server se fetch karke cookie listener / parser ke zariye cookie uthao
  try {
    const response = await fetch(fallback_url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "*/*"
      }
    });

    const text = await response.text();
    const lines = text.split("\n");

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes("JC_ColorsHD.m3u8") || lines[i].includes("JC_ColorsHD") || lines[i].includes("jcevent")) {
        const line = lines[i];
        const extinf = lines[i - 1] || "";
        const optLine = lines[i - 2] || "";

        // Multi-pattern cookie listener to catch cookie from various formats
        let match = line.match(/Cookie=([^&]+)/i) || 
                    extinf.match(/"Cookie":"([^"]+)"/i) || 
                    optLine.match(/http-cookie=(.+)/i) ||
                    line.match(/(hdntl=[^&\s"]+)/i);

        if (match) {
          extracted_cookie = (match[1] || match[0]).trim();
          break;
        }
      }
    }
  } catch (err) {
    console.log("Fallback server fetch failed.");
  }

  // Final Output: Agar fallback server se cookie mil gayi toh wo do, warna hardcoded default do
  const final_cookie = extracted_cookie || default_fallback_cookie;
  const source_label = extracted_cookie ? "Live Extracted Cookie (Fallback Listener)" : "Default Cookie (Fallback)";

  res.status(200).send(`
    <h3>🍪 ${source_label}:</h3>
    ${final_cookie}
  `);
}
