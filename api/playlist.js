export default async function handler(req, res) {

const jsonUrl = "https://ipl2020-46d2f.firebaseio.com/Json.json";

function unpack(code) {
try {
const evalPattern = /evalfunction(p,a,c,k,e,d.+?}'(.?)',(\d+),(\d+),'(.?)'.split('|'))/;
const evalContent = code.match(evalPattern);

  if (evalContent) {
    let [_, p, a, c, k] = evalContent;
    a = parseInt(a);
    c = parseInt(c);
    k = k.split('|');

    while (c--) {
      if (k[c]) {
        p = p.replace(new RegExp('\\b' + c.toString(a) + '\\b','g'), k[c]);
      }
    }
    return p;
  }

} catch(e){}
return code;

}

async function getLiveDomain(testUrls) {

for (let url of testUrls) {

  try {
    const r = await fetch(url,{method:"HEAD",redirect:"follow"});
    if (r.ok) return new URL(r.url).origin + "/";
  } catch(e){}

}

return testUrls[0];

}

try {

const resJson = await fetch(jsonUrl);
let text = await resJson.text();

text = text.replace(/,[ \t\r\n]*([\]}])/g,'$1');

const data = JSON.parse(text);

const prmoviesDomains = [
  "https://prmovies.tours/",
  "https://prmovies.to/",
  "https://prmovies.vc/"
];

const speedoDomains = [
  "https://speedostream1.com/",
  "https://speedostream2.com/",
  "https://speedostream.com/"
];

const officialSite = await getLiveDomain(prmoviesDomains);
const streamBase = await getLiveDomain(speedoDomains);
const targetHost = new URL(streamBase).host;

let m3uContent = "#EXTM3U\n\n";

const promises = data.map(async (item)=>{

  try {

    const cleanId = item.id.replace(/[^a-zA-Z0-9]/g,'');

    const embedUrl = `${streamBase.replace(/\/$/,"")}/embed-${cleanId}.html`;

    const streamResponse = await fetch(embedUrl,{
      headers:{
        "User-Agent":"Mozilla/5.0",
        "Referer":officialSite,
        "Origin":officialSite.replace(/\/$/,"")
      }
    });

    let source = await streamResponse.text();

    const decoded = unpack(source);

    const m3u8Regex = /(https?[:\/\w\.\-\%\?&=\,]+?\.m3u8[^"\'\s>]*)/i;

    const match = decoded.match(m3u8Regex) || source.match(m3u8Regex);

    if(match){

      const m3u8 = match[1].replace(/\\/g,'');

      const originHost = `https://${targetHost}`;

      const finalUrl =
      `${m3u8}|referer=${originHost}/&origin=${originHost}`;

      let entry =
      `#EXTINF:-1 tvg-id="${item.id}" tvg-logo="${item.logo}" group-title="${item.group}",${item.name}\n`;

      entry += `${finalUrl}\n\n`;

      return entry;
    }

    return "";

  } catch(e){
    return "";
  }

});

const m3uEntries = await Promise.all(promises);

m3uContent += m3uEntries.join("");

res.setHeader("Content-Type","text/plain");
res.send(m3uContent);

} catch(err) {

res.status(500).send("Error: "+err.message);

}

}
