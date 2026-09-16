const response = await fetch("./script.js");

if (!response.ok) {
  throw new Error(`Unable to load the application bundle (${response.status})`);
}

let source = await response.text();

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
  'const Uh={"Academic Research":"Online Research Program",',
  "online research subject category"
);

replaceOnce(
  "hf={",
  'hf={"Online Research Program":{en:"Online Research Program",tr:"Çevrimiçi Araştırma Programı"},',
  "online research category translation"
);

replaceOnce(
  'O0=["Cambridge","London","New Haven","New Haven / New York","New York","Online","Oxford","San Francisco","Toronto"],U0={Cambridge:{en:"Cambridge",tr:"Cambridge"},London:{en:"London",tr:"Londra"},"New Haven":{en:"New Haven",tr:"New Haven"},"New Haven / New York":{en:"New Haven / New York",tr:"New Haven / New York"},"New York":{en:"New York",tr:"New York"},Online:{en:"Online",tr:"Çevrimiçi"},Oxford:{en:"Oxford",tr:"Oxford"},"San Francisco":{en:"San Francisco",tr:"San Francisco"},Toronto:{en:"Toronto",tr:"Toronto"}}',
  'O0=["Canada","United Kingdom","United States"],U0={Canada:{en:"Canada",tr:"Kanada"},"United Kingdom":{en:"United Kingdom",tr:"Birleşik Krallık"},"United States":{en:"United States",tr:"Amerika Birleşik Devletleri"}}',
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
  String.raw`function codexEscapeRegExp(m){return m.replace(/[|\\{}()[\]^$+*?.-]/g,function(x){return "\\"+x})}function codexCleanTitle(m,x,O){if(!m)return m;let d=m;const _={London:"Londra","New York":"New York",Oxford:"Oxford",Cambridge:"Cambridge",Toronto:"Toronto","San Francisco":"San Francisco","New Haven":"New Haven","New Haven / New York":"New Haven ve New York",Online:"Çevrimiçi"},N=O?[(x.location_tr||"").split(",")[0],_[x.city],x.location,x.city]:[x.location,x.city];return[...new Set(N.filter(Boolean))].sort((X,J)=>J.length-X.length).forEach(X=>{const J=codexEscapeRegExp(X),M=O?new RegExp("\\s*[-–]\\s*"+J,"gi"):new RegExp("\\s+in\\s+"+J,"gi");d=d.replace(M," ")}),d.replace(/\s+/g," ").replace(/\s+([,:])/g,"$1").trim()}function codexDecoratedProvider(m,x){const O=m.provider_label||m.provider||"Unknown",d=x?(m.location_tr||"").split(",")[0]:m.location||m.city;return d&&!O.toLowerCase().endsWith(", "+d.toLowerCase())?O+" ("+d+")":O}function codexCleanProgram(m){const x=m.provider_label||m.provider||"Unknown",O=codexDecoratedProvider(m,!1),d=codexDecoratedProvider(m,!0),_=m.detail_facts?{...m.detail_facts,school:O}:m.detail_facts,N=m.detail_facts_tr?{...m.detail_facts_tr,school:d}:m.detail_facts_tr;return{...m,title:codexCleanTitle(m.title,m,!1),title_tr:codexCleanTitle(m.title_tr,m,!0),providerLabel:O,providerFilter:x,detail_facts:_,detail_facts_tr:N}}function Xh(m){const x=codexCleanProgram(m);return{...x,subjectBucket:Uh[x.subject]||"Other"}}`,
  "program title and provider normalization"
);

replaceOnce(
  "d.includes(H.providerLabel)",
  "d.includes(H.providerFilter)",
  "base provider filter matching"
);

const blob = new Blob([source], { type: "text/javascript" });
const bundleUrl = URL.createObjectURL(blob);

try {
  await import(bundleUrl);
} finally {
  URL.revokeObjectURL(bundleUrl);
}
