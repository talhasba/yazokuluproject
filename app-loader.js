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

const [basePrograms, editorOverrides, photoSources] = await Promise.all([
  fetch("./data/programs.normalized.json", { cache: "no-store" }).then((result) => result.ok ? result.json() : []),
  fetch("./data/program-editor-overrides.json", { cache: "no-store" }).then((result) => result.ok ? result.json() : { programs: {} }).catch(() => ({ programs: {} })),
  fetch("./data/program-image-sources.json?v=20261014-2").then((result) => result.ok ? result.json() : { images: {} }).catch(() => ({ images: {} }))
]);

window.__PROGRAM_EDITOR_PROGRAMS__ = basePrograms.map((program) =>
  ({ ...mergeEditorOverride(program, editorOverrides.programs?.[program.id]), photo_source: photoSources.images?.[program.id] })
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
  "Careers & Life Skills": "Career",
  "Chemical Engineering": "Engineering",
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
  "Cybersecurity & AI": "Computer Science",
  "Engineering & Design": "Engineering",
  "English Language": "Language",
  "English Language & Culture": "Language",
  "Game Design": "Computer Science",
  "IELTS Preparation": "Language",
  "Interdisciplinary Studies": "Academic",
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
  "Psychology & Neuroscience": "Medicine & Life Sciences",
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
  '_0=["Bucksmore","Constructor University Summer Camp","Edconic","Emerald Cultural Institute","Immerse Education","InvestIN Education","MPW Summer School","Academy Royale International","Schiller International University","Sportech Academy","St Clare\'s, Oxford","Study Mind","Summer Discovery"]',
  "complete provider filter options"
);

replaceOnce(
  'src:"/logo.png"',
  'src:"./assets/summerbutwhere-logo.png"',
  "GitHub Pages logo path"
);

replaceOnce(
  'siteTitle:"Summer Programs",siteSubtitle:"Discover summer programs, camps and schools worldwide"',
  'siteTitle:"Academic Summer School Programs",siteSubtitle:"Discover academic summer school programs worldwide"',
  "English catalogue subtitle"
);

replaceOnce(
  'siteTitle:"Yaz Programları",siteSubtitle:"Dünya genelinde yaz programlarını, kampları ve okulları keşfedin"',
  'siteTitle:"Akademik Yaz Okulu Programları",siteSubtitle:"Dünyadaki akademik yaz okulu programlarını keşfedin"',
  "Turkish catalogue subtitle"
);

// Keep the catalogue header aligned with the authored home and programme headers.
// Patch only the compiled header; all filter and language callbacks remain intact.
const headerStart = source.indexOf("function Nh(");
const headerEnd = source.indexOf("function jh(", headerStart);
if (headerStart < 0 || headerEnd < 0) throw new Error("Application header patch target not found");
replaceOnce(source.slice(headerStart, headerEnd), `
function Nh({lang:m,onToggleLang:x,onToggleMobileMenu:O,mobileMenuOpen:d,t:_}) {
  return b.jsx("header", {className:"catalogue-header", children:b.jsxs("div", {
    className:"catalogue-header-inner", children:[
      b.jsxs("div", {className:"catalogue-brand", children:[
        b.jsx("button", {onClick:O,className:"catalogue-menu rounded-lg p-2 text-surface-600 hover:bg-surface-100 lg:hidden","aria-label":"Toggle menu",children:d?b.jsx(j0,{size:22}):b.jsx(Oh,{size:22})}),
        b.jsx("img", {src:"./assets/summerbutwhere-logo.png",alt:"SummerButWhere",className:"catalogue-site-logo"}),
        b.jsxs("div", {className:"catalogue-title",children:[
          b.jsx("h1", {children:_.siteTitle}),
          b.jsx("p", {children:_.siteSubtitle})
        ]}),
        b.jsxs("a", {className:"parent-brand",href:"https://asba.com.tr",children:[
          b.jsx("span", {className:"parent-brand-label",children:m==="tr"?"Bir ASBA projesi":"An ASBA project"}),
          b.jsx("img", {src:"./assets/asba-logo.png",alt:"ASBA Yurtdışı Eğitim Danışmanlık",width:738,height:237})
        ]})
      ]}),
      b.jsxs("button", {onClick:x,className:"catalogue-language flex items-center gap-1.5 rounded-lg border border-surface-200 px-3 py-1.5 text-sm font-medium text-surface-600 hover:bg-surface-100 transition-colors",children:[b.jsx(Mh,{size:16}),m==="en"?"EN":"TR"]})
    ]
  })});
}`, "ASBA catalogue header logo");

replaceOnce(
  'function C0(m,x){const O=x.get(m.id);return O&&O.length>0?O[0]:m.image_url?m.image_url:null}',
  'function codexAssetUrl(m){return typeof m==="string"&&m.startsWith("/assets/")?new URL("."+m,document.baseURI).href:m}function C0(m,x){const O=x.get(m.id);return codexAssetUrl(O&&O.length>0?O[0]:m.image_url?m.image_url:null)}',
  "GitHub Pages program image paths"
);

replaceOnce(
  'O0=["Cambridge","London","New Haven","New Haven / New York","New York","Online","Oxford","San Francisco","Toronto"],U0={Cambridge:{en:"Cambridge",tr:"Cambridge"},London:{en:"London",tr:"Londra"},"New Haven":{en:"New Haven",tr:"New Haven"},"New Haven / New York":{en:"New Haven / New York",tr:"New Haven / New York"},"New York":{en:"New York",tr:"New York"},Online:{en:"Online",tr:"Çevrimiçi"},Oxford:{en:"Oxford",tr:"Oxford"},"San Francisco":{en:"San Francisco",tr:"San Francisco"},Toronto:{en:"Toronto",tr:"Toronto"}}',
  'O0=["Canada","Germany","Ireland","Italy","Spain","United Kingdom","United States"],U0={Canada:{en:"Canada",tr:"Kanada"},Germany:{en:"Germany",tr:"Almanya"},Ireland:{en:"Ireland",tr:"İrlanda"},Italy:{en:"Italy",tr:"İtalya"},Spain:{en:"Spain",tr:"İspanya"},"United Kingdom":{en:"United Kingdom",tr:"Birleşik Krallık"},"United States":{en:"United States",tr:"Amerika Birleşik Devletleri"}}',
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
function codexProgramTitle(m,x){const O=codexCleanTitle(x&&m.title_tr?m.title_tr:m.title,m,x),d=(x&&m.campus_tr)||m.campus||codexPlaceName(m,x);return d?O+" - "+d:O}
function codexDecoratedProvider(m,x){return m.provider_label||m.provider||"Unknown"}
const codexLocationMap={};
const codexFilterNames={"UCL":"University College London (UCL)","UC Berkeley":"University of California, Berkeley","UCLA":"University of California, Los Angeles (UCLA)","Dartmouth":"Dartmouth College"};
function codexFilterName(m){return codexFilterNames[m]||m}
function codexRegisterLocation(m,x,O,d){const _=codexLocationMap[m]||(codexLocationMap[m]={}),N=_[x]||(_[x]={key:x,en:codexFilterName(O),tr:codexFilterName(d||O),count:0});N.count++}
function codexSchoolFilter({title:m,items:x,selected:O,onToggle:d,lang:_}){const[N,X]=yl.useState({});return b.jsxs("div",{children:[b.jsx("h3",{className:"mb-2.5 text-xs font-bold uppercase tracking-wider text-surface-400",children:m}),b.jsx("div",{className:"space-y-1",children:x.map(J=>{const M=J.value,p=Object.values(codexLocationMap[M]||{}).sort((el,Sl)=>Sl.count-el.count||el.en.localeCompare(Sl.en)),G=p.length>1,D=O.includes(M),S=G?p.filter(el=>O.includes(M+"||"+el.key)).length:0,H=G&&S===p.length,P=G&&!D&&!H&&S>0,R=G&&(N[M]!==void 0?N[M]:S>0),F=()=>{if(D){d(M);return}if(H||P){p.forEach(el=>{O.includes(M+"||"+el.key)&&d(M+"||"+el.key)});return}d(M)};return b.jsxs("div",{children:[b.jsxs("div",{className:"codex-school-row",children:[b.jsx("div",{className:"codex-school-main",children:b.jsxs("label",{onClick:F,className:"flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm text-surface-600 hover:bg-surface-50 transition-colors",children:[b.jsx("span",{className:"flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded border transition-colors "+(D||H||P?"border-brand-600 bg-brand-600 text-white":"border-surface-300 bg-white"),children:D||H?b.jsx(zh,{size:12,strokeWidth:3}):P?b.jsx("span",{className:"codex-school-dash"}):null}),b.jsx("span",{className:"truncate",children:J.label})]})}),P&&!R?b.jsx("span",{className:"codex-school-selected",title:"Selected locations",children:S}):null,G?b.jsx("button",{type:"button","aria-expanded":R,"aria-label":J.label,className:"codex-school-toggle"+(R?" is-open":""),onClick:()=>X(el=>({...el,[M]:!R})),children:b.jsx(ph,{size:16})}):null]}),G&&R?b.jsx("div",{className:"codex-school-locations",children:p.map(el=>{const Sl=M+"||"+el.key;return b.jsxs("div",{className:"codex-school-location",children:[b.jsx("div",{className:"codex-school-main",children:b.jsx(jh,{checked:D||O.includes(Sl),onChange:()=>{if(D){d(M),p.forEach(ul=>{ul.key!==el.key&&d(M+"||"+ul.key)});return}d(Sl)},label:_==="tr"?el.tr:el.en})}),b.jsx("span",{className:"codex-school-count",children:el.count})]},Sl)})}):null]},M)})})]})}
function codexCleanProgram(m){const x=m.provider_label||m.provider||"Unknown",O=codexDecoratedProvider(m,!1),d=codexDecoratedProvider(m,!0),_=m.detail_facts?{...m.detail_facts,school:O}:m.detail_facts,N=m.detail_facts_tr?{...m.detail_facts_tr,school:d}:m.detail_facts_tr;const codexK=m.campus||codexPlaceName(m,!1);codexRegisterLocation(x,codexK,codexK,m.campus_tr||codexPlaceName(m,!0));return{...m,codexLocationKey:codexK,title:codexProgramTitle(m,!1),title_tr:codexProgramTitle(m,!0),displayLocation:codexDisplayLocation(m,!1),displayLocation_tr:codexDisplayLocation(m,!0),providerLabel:O,providerFilter:x,detail_facts:_,detail_facts_tr:N}}
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
  'fetch("data/image-candidates.json?v=20261014-2")',
  "program thumbnail cache version"
);

// Provider filter values are either "<provider>" or "<provider>||<location>"
// (see codexSchoolFilter): a program matches when either one is selected.
replaceOnce(
  "d.includes(H.providerLabel)",
  'd.includes(H.providerFilter)||d.includes(H.providerFilter+"||"+H.codexLocationKey)',
  "base provider and location filter matching"
);

replaceOnce(
  'b.jsx(_a,{title:x.school,',
  'b.jsx(codexSchoolFilter,{title:x.school,',
  "desktop school filter with locations"
);

replaceOnce(
  'b.jsx(_a,{title:d.school,',
  'b.jsx(codexSchoolFilter,{title:d.school,',
  "mobile school filter with locations"
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

// Put attribution outside the clickable programme button: links remain valid
// independent controls and never trigger course navigation.
const cardStart = source.indexOf("function Bh({program:m");
const cardEnd = source.indexOf("function qh(", cardStart);
if (cardStart < 0 || cardEnd < 0) throw new Error("Programme photo-credit patch target not found");
const cardSource = source.slice(cardStart, cardEnd);
const cardReturn = cardSource.indexOf('return b.jsxs("button"');
if (cardReturn < 0) throw new Error("Programme card return not found");
const cardExpression = cardSource.slice(cardReturn + 7, -1);
replaceOnce(cardSource, `${cardSource.slice(0, cardReturn)}
  const photo = m.photo_source && _ === codexAssetUrl(m.photo_source.local_path) ? m.photo_source : null;
  return b.jsxs("div", {className:"programme-photo-card", children:[
    ${cardExpression},
    photo ? b.jsxs("p", {className:"programme-photo-credit",children:[
      b.jsx("span", {children:photo.source_kind==="illustrative"?(x==="tr"?"Temsili fotoğraf: ":"Illustrative photo: "):(x==="tr"?"Fotoğraf: ":"Photo: ")}),
      b.jsx("a", {href:photo.source_page,target:"_blank",rel:"noopener noreferrer",title:photo.description||photo.title,children:photo.artist||m.provider_label}),
      photo.source_kind==="illustrative" ? b.jsxs("span", {children:[" · ",b.jsx("a", {href:photo.license_url||photo.source_page,target:"_blank",rel:"noopener noreferrer",children:photo.license})]}) : null
    ]}) : null
  ]});
}`, "programme photograph attribution");

// Replace the bundle's arrows-only pagination with numbered page buttons
// (1 2 3 … N) while keeping the per-page selector and prev/next arrows.
const pagerStart = source.indexOf("function Gh({currentPage:m");
const pagerTail = 'children:b.jsx(ph,{size:18})})]})]})}';
const pagerTailAt = source.indexOf(pagerTail, pagerStart);
const pagerEnd = pagerTailAt < 0 ? -1 : pagerTailAt + pagerTail.length;
if (pagerStart < 0 || pagerEnd < 0) throw new Error("Pagination patch target not found");
replaceOnce(source.slice(pagerStart, pagerEnd), `
function Gh({currentPage:m,totalPages:x,pageSize:O,totalItems:d,onPageSizeChange:_,onPageChange:N,t:X}) {
  const J=[25,50,100];
  if (d===0) return null;
  const go=p=>{ if(p<1||p>x||p===m) return; N(p); window.scrollTo({top:0,behavior:"smooth"}); };
  const nums=[];
  for (let p=1;p<=x;p++) {
    if (p===1||p===x||Math.abs(p-m)<=1||(m<=3&&p<=4)||(m>=x-2&&p>=x-3)) nums.push(p);
    else if (nums[nums.length-1]!=="…") nums.push("…");
  }
  return b.jsxs("div", {className:"catalogue-pager", children:[
    b.jsxs("div", {className:"catalogue-pager-size", children:[
      b.jsxs("span", {children:[X.showPerPage||"Show per page",":"]}),
      b.jsx("div", {className:"catalogue-pager-sizes", children:J.map(M=>b.jsx("button", {
        onClick:()=>_(M), className:O===M?"is-active":"", children:M
      }, M))})
    ]}),
    x>1 ? b.jsxs("nav", {className:"catalogue-pager-pages", "aria-label":"Pagination", children:[
      b.jsx("button", {onClick:()=>go(m-1), disabled:m===1, "aria-label":"Previous page", className:"catalogue-pager-arrow", children:b.jsx(Th,{size:18})}),
      nums.map((p,i)=>p==="…"
        ? b.jsx("span", {className:"catalogue-pager-gap", children:"…"}, "gap"+i)
        : b.jsx("button", {onClick:()=>go(p), "aria-current":p===m?"page":void 0, className:"catalogue-pager-num"+(p===m?" is-active":""), children:p}, p)),
      b.jsx("button", {onClick:()=>go(m+1), disabled:m===x, "aria-label":"Next page", className:"catalogue-pager-arrow", children:b.jsx(ph,{size:18})})
    ]}) : null
  ]});
}
`, "numbered catalogue pagination");

const blob = new Blob([source], { type: "text/javascript" });
const bundleUrl = URL.createObjectURL(blob);

try {
  await import(bundleUrl);
} finally {
  URL.revokeObjectURL(bundleUrl);
}
