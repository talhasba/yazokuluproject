const response = await fetch("./script.js");

if (!response.ok) {
  throw new Error(`Unable to load the application bundle (${response.status})`);
}

let source = await response.text();

function mergeEditorOverride(base, override) {
  if (override === undefined) return base;
  if (Array.isArray(override) || !override || typeof override !== "object") return override;
  const result = base && typeof base === "object" && !Array.isArray(base) ? { ...base } : {};
  for (const [key, value] of Object.entries(override)) result[key] = mergeEditorOverride(result[key], value);
  return result;
}

const [basePrograms, editorOverrides] = await Promise.all([
  fetch("./data/programs.normalized.json", { cache: "no-store" }).then((result) => result.ok ? result.json() : []),
  fetch("./data/program-editor-overrides.json", { cache: "no-store" }).then((result) => result.ok ? result.json() : { programs: {} }).catch(() => ({ programs: {} }))
]);

window.__PROGRAM_EDITOR_PROGRAMS__ = basePrograms.map((program) =>
  mergeEditorOverride(program, editorOverrides.programs?.[program.id])
);

const additionalSubjectBuckets = {
  "STEM & English": "Science & Mathematics",
  "English & Leadership": "Language",
  "Academic Research": "Online Research Program",
  "Art Business & Art History": "Arts & Design",
  "Art and Design": "Arts & Design",
  "Biology & Research": "Medicine & Life Sciences",
  "Business, Finance and Economics": "Business",
  "Business, Leadership & Entrepreneurship": "Business",
  "Chemistry & Research": "Medicine & Life Sciences",
  "Computer Science & Technology": "Computer Science",
  "Computing, Robotics and AI": "Computer Science",
  "Creative Arts": "Arts & Design",
  "Design": "Arts & Design",
  "Economics and Finance": "Business",
  "Fashion": "Arts & Design",
  "Fashion Business & Media": "Arts & Design",
  "Health & Life Sciences": "Medicine & Life Sciences",
  "Human Behavior & Society": "Medicine & Life Sciences",
  "Humanities": "Arts & Design",
  "Innovation & Design Thinking": "Business",
  "Journalism & Writing": "Arts & Design",
  "Law & Government": "Law & Politics",
  "Mathematics & Modeling": "Mathematics",
  "Medicine & Health": "Medicine & Life Sciences",
  "Medicine & Health Sciences": "Medicine & Life Sciences",
  "Medicine and Sciences": "Medicine & Life Sciences",
  "Music": "Arts & Design",
  "Neural Networks & Robotics": "Computer Science",
  "Physics & Research": "Medicine & Life Sciences",
  "Physics and Engineering": "Engineering",
  "Politics and Law": "Law & Politics",
  "Programming & Algorithms": "Computer Science",
  "Psychology & Social Science": "Medicine & Life Sciences",
  "Psychology and Sociology": "Medicine & Life Sciences",
  "Science & Mathematics": "Science & Mathematics",
  "Sports": "Sports",
  "Sports Management": "Sports",
  "Transportation Design": "Architecture & Design"
};

const additionalBucketTranslations = {
  "Online Research Program": {
    en: "Online Research Program",
    tr: "Çevrimiçi Araştırma Programı"
  },
  "Science & Mathematics": {
    en: "Science & Mathematics",
    tr: "Fen Bilimleri ve Matematik"
  },
  Sports: {
    en: "Sports",
    tr: "Spor"
  }
};

function objectPrefix(value) {
  return JSON.stringify(value).slice(0, -1) + ",";
}

function replaceOnce(search, replacement, description) {
  const firstMatch = source.indexOf(search);
  const lastMatch = source.lastIndexOf(search);

  if (firstMatch === -1) {
    throw new Error(`Application patch target not found: ${description}`);
  }

  if (firstMatch !== lastMatch) {
    throw new Error(`Application patch target is ambiguous: ${description}`);
  }

  source = source.replace(search, replacement);
}

replaceOnce(
  "const Uh={",
  `const Uh=${objectPrefix(additionalSubjectBuckets)}`,
  "complete additional subject categories"
);

replaceOnce(
  "hf={",
  `hf=${objectPrefix(additionalBucketTranslations)}`,
  "additional subject category translations"
);

replaceOnce(
  '_0=["Bucksmore","Immerse Education","InvestIN Education","Oxford Royale","St Clare\'s, Oxford"]',
  '_0=["Bucksmore","Constructor University Summer Camp","Edconic","Emerald Cultural Institute","Immerse Education","InvestIN Education","MPW Summer School","Oxford Royale","Sportech Academy","St Clare\'s, Oxford","Summer Discovery"]',
  "complete provider filter options"
);

replaceOnce(
  'src:"/logo.png"',
  'src:"./summerbutwhere-logo.png"',
  "GitHub Pages logo path"
);

replaceOnce(
  'siteSubtitle:"Discover summer programs, camps and schools worldwide"',
  'siteSubtitle:"An ASBA project · Discover summer programs worldwide"',
  "English parent-brand label"
);

replaceOnce(
  'siteSubtitle:"Dünya genelinde yaz programlarını, kampları ve okulları keşfedin"',
  'siteSubtitle:"Bir ASBA projesi · Dünyadaki yaz programlarını keşfedin"',
  "Turkish parent-brand label"
);

replaceOnce(
  'function C0(m,x){const O=x.get(m.id);return O&&O.length>0?O[0]:m.image_url?m.image_url:null}',
  'function codexAssetUrl(m){return typeof m==="string"&&m.startsWith("/assets/")?new URL("."+m,document.baseURI).href:m}function C0(m,x){const O=x.get(m.id);return codexAssetUrl(O&&O.length>0?O[0]:m.image_url?m.image_url:null)}',
  "GitHub Pages program image paths"
);

replaceOnce(
  'O0=["Cambridge","London","New Haven","New Haven / New York","New York","Online","Oxford","San Francisco","Toronto"],U0={Cambridge:{en:"Cambridge",tr:"Cambridge"},London:{en:"London",tr:"Londra"},"New Haven":{en:"New Haven",tr:"New Haven"},"New Haven / New York":{en:"New Haven / New York",tr:"New Haven / New York"},"New York":{en:"New York",tr:"New York"},Online:{en:"Online",tr:"Çevrimiçi"},Oxford:{en:"Oxford",tr:"Oxford"},"San Francisco":{en:"San Francisco",tr:"San Francisco"},Toronto:{en:"Toronto",tr:"Toronto"}}',
  'O0=["Canada","Germany","Ireland","Italy","United Kingdom","United States"],U0={Canada:{en:"Canada",tr:"Kanada"},Germany:{en:"Germany",tr:"Almanya"},Ireland:{en:"Ireland",tr:"İrlanda"},Italy:{en:"Italy",tr:"İtalya"},"United Kingdom":{en:"United Kingdom",tr:"Birleşik Krallık"},"United States":{en:"United States",tr:"Amerika Birleşik Devletleri"}}',
  "country filter options"
);

replaceOnce(
  "N.includes(H.city)",
  "N.includes(H.country)",
  "country filter matching"
);

replaceOnce(
  'location:"Location",showingResults',
  'location:"Country",showingResults',
  "English country filter title"
);

replaceOnce(
  'location:"Konum",showingResults',
  'location:"Ülke",showingResults',
  "Turkish country filter title"
);

replaceOnce(
  'function Xh(m){return{...m,providerLabel:m.provider_label||m.provider||"Unknown",subjectBucket:Uh[m.subject]||"Other"}}',
  String.raw`
function codexEscapeRegExp(m){return String(m||"").replace(/[|\\{}()[\]^$+*?.-]/g,function(x){return "\\"+x})}
function codexStripCountry(m,x,O){let d=String(m||"").trim();const _={Canada:"Kanada",Germany:"Almanya",Ireland:"İrlanda","United Kingdom":"Birleşik Krallık","United States":"Amerika Birleşik Devletleri",Italy:"İtalya"},N=[x,O?_[x]:x].filter(Boolean);return N.forEach(X=>{d=d.replace(new RegExp("\\s*,\\s*"+codexEscapeRegExp(X)+"\\s*$","i"),"")}),d.trim()}
function codexCityName(m,x){const O={London:"Londra","New York City":"New York",Oxford:"Oxford",Cambridge:"Cambridge",Toronto:"Toronto","San Francisco":"San Francisco","New Haven":"New Haven","New Haven / New York":"New Haven ve New York","London & Cambridge":"Londra ve Cambridge","Cambridge & London":"Cambridge ve Londra",Milan:"Milano",Rome:"Roma",Venice:"Venedik",Online:"Çevrimiçi"};return x&&O[m.city]||m.city||""}
function codexSamePlace(m){if(["city","virtual","multi_city"].includes(m.location_type))return!0;const x=codexStripCountry(m.location,m.country,!1).toLowerCase().replace(/[^a-z0-9]+/g,""),O=String(m.city||"").toLowerCase().replace(/[^a-z0-9]+/g,"");return!!x&&x===O}
function codexPlaceName(m,x){const O=codexCityName(m,x),d=x?codexStripCountry(m.location_tr||m.location,m.country,!0):codexStripCountry(m.location,m.country,!1);return codexSamePlace(m)?O||d:d||O}
function codexDisplayLocation(m,x){const O=codexCityName(m,x),d=codexPlaceName(m,x);return!O||codexSamePlace(m)||O.toLowerCase()===d.toLowerCase()?d||O:O+" · "+d}
function codexCleanTitle(m,x,O){if(!m)return m;let d=m;const _={London:"Londra","New York City":"New York",Oxford:"Oxford",Cambridge:"Cambridge",Toronto:"Toronto","San Francisco":"San Francisco","New Haven":"New Haven","New Haven / New York":"New Haven ve New York",Online:"Çevrimiçi"},N=[x.location,codexStripCountry(x.location,x.country,!1),x.city,x.location_tr,codexStripCountry(x.location_tr,x.country,!0),_[x.city],...(x.city==="New York City"?["NYC"]:[])];return[...new Set(N.filter(Boolean))].sort((X,J)=>J.length-X.length).forEach(X=>{const J=codexEscapeRegExp(X);d=d.replace(new RegExp("\\s+in\\s+"+J+"(?=\\s|$)","gi")," ").replace(new RegExp("\\s*[-–]\\s*"+J+"(?=\\s|$)","gi")," ")}),d.replace(/\s+/g," ").replace(/\s+([,:])/g,"$1").trim()}
function codexProgramTitle(m,x){const O=codexCleanTitle(x&&m.title_tr?m.title_tr:m.title,m,x),d=codexPlaceName(m,x);return d?O+" - "+d:O}
function codexDecoratedProvider(m,x){const O=m.provider_label||m.provider||"Unknown",d=codexPlaceName(m,x);return d&&!O.toLowerCase().endsWith(", "+d.toLowerCase())?O+" ("+d+")":O}
function codexCleanProgram(m){const x=m.provider_label||m.provider||"Unknown",O=codexDecoratedProvider(m,!1),d=codexDecoratedProvider(m,!0),_=m.detail_facts?{...m.detail_facts,school:O}:m.detail_facts,N=m.detail_facts_tr?{...m.detail_facts_tr,school:d}:m.detail_facts_tr;return{...m,title:codexProgramTitle(m,!1),title_tr:codexProgramTitle(m,!0),displayLocation:codexDisplayLocation(m,!1),displayLocation_tr:codexDisplayLocation(m,!0),providerLabel:O,providerFilter:x,detail_facts:_,detail_facts_tr:N}}
function Xh(m){const x=codexCleanProgram(m);return{...x,subjectBucket:Uh[x.subject]||"Other"}}`,
  "program title and provider normalization"
);

replaceOnce(
  'fetch("data/programs.normalized.json")',
  'Promise.resolve({json:async()=>window.__PROGRAM_EDITOR_PROGRAMS__})',
  "local program editor overrides"
);

replaceOnce(
  'fetch("data/image-candidates.json")',
  'fetch("data/image-candidates.json?v=20261005-2")',
  "program thumbnail cache version"
);

replaceOnce(
  "d.includes(H.providerLabel)",
  "d.includes(H.providerFilter)",
  "base provider filter matching"
);

replaceOnce(
  'm.city&&b.jsxs("span",{className:"flex items-center gap-1",children:[b.jsx("span",{className:"text-surface-300",children:"📍"})," ",m.city]})',
  '(x==="tr"?m.displayLocation_tr:m.displayLocation)&&b.jsxs("span",{className:"flex items-center gap-1",children:[b.jsx("span",{className:"text-surface-300",children:"📍"})," ",x==="tr"?m.displayLocation_tr:m.displayLocation]})',
  "city and campus card label"
);

replaceOnce(
  'className:"mb-2 line-clamp-2 text-sm font-bold text-surface-800 leading-snug"',
  'className:"mb-2 line-clamp-3 text-sm font-bold text-surface-800 leading-snug"',
  "three-line program card titles"
);

const blob = new Blob([source], { type: "text/javascript" });
const bundleUrl = URL.createObjectURL(blob);

try {
  await import(bundleUrl);
} finally {
  URL.revokeObjectURL(bundleUrl);
}
