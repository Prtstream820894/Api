export default async function handler(req, res) {

const jsonUrl = "https://ipl2020-46d2f.firebaseio.com/Json.json";

function unpack(code){
try{
const evalPattern=/eval\(function\(p,a,c,k,e,d\).+?\}\('(.*?)',(\d+),(\d+),'(.*?)'\.split\(\'\|'\)\)\)/;
const m=code.match(evalPattern);

if(m){
let p=m[1];
let a=parseInt(m[2]);
let c=parseInt(m[3]);
let k=m[4].split('|');

while(c--){
if(k[c]){
p=p.replace(new RegExp('\\b'+c.toString(a)+'\\b','g'),k[c]);
}
}

return p;
}

}catch(e){}

return code;
}

async function getLiveDomain(list){

for(const url of list){

try{

const r=await fetch(url,{method:"HEAD",redirect:"follow"});

if(r.ok){
return new URL(r.url).origin+"/";
}

}catch(e){}

}

return list[0];

}

try{

const r=await fetch(jsonUrl);
let text=await r.text();

text=text.replace(/,[ \t\r\n]*([\]}])/g,'$1');

const data=JSON.parse(text);

const prmoviesDomains=[
"https://prmovies.tours/",
"https://prmovies.to/",
"https://prmovies.vc/"
];

const speedoDomains=[
"https://speedostream1.com/",
"https://speedostream2.com/",
"https://speedostream.com/"
];

const officialSite=await getLiveDomain(prmoviesDomains);
const streamBase=await getLiveDomain(speedoDomains);

const targetHost=new URL(streamBase).host;

let m3u="#EXTM3U\n\n";

for(const item of data){

try{

const cleanId=item.id.replace(/[^a-zA-Z0-9]/g,'');

const embedUrl=`${streamBase.replace(/\/$/,"")}/embed-${cleanId}.html`;

const streamRes=await fetch(embedUrl,{
headers:{
"User-Agent":"Mozilla/5.0",
"Referer":officialSite,
"Origin":officialSite.replace(/\/$/,"")
}
});

let source=await streamRes.text();

const decoded=unpack(source);

const regex=/(https?:\/\/[^\s"'<>]+\.m3u8[^"'\s<>]*)/i;

const match=decoded.match(regex)||source.match(regex);

if(match){

const m3u8=match[1].replace(/\\/g,'');

const origin=`https://${targetHost}`;

const finalUrl=`${m3u8}|referer=${origin}/&origin=${origin}`;

m3u+=`#EXTINF:-1 tvg-id="${item.id}" tvg-logo="${item.logo}" group-title="${item.group}",${item.name}\n`;
m3u+=`${finalUrl}\n\n`;

}

}catch(e){}

}

try{

const extra=await fetch("https://raw.githubusercontent.com/Prtstream820894/prtstreams/main/mx.m3u");

if(extra.ok){

let txt=await extra.text();

txt=txt.replace(/^#EXTM3U\s*/i,'');

m3u+="\n"+txt;

}

}catch(e){}

res.setHeader("Content-Type","text/plain; charset=utf-8");

res.send(m3u);

}catch(err){

res.status(500).send("Error: "+err.message);

}

}
// update
