import { useEffect, useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Globe2, Menu, RotateCcw, X } from "lucide-react";
import { BUCKET_LABELS, CITIES, COUNTRY_LABELS, UI } from "./constants.js";
import { displayLocation, imageFor, loadCatalogueData, programTitle } from "./programs.js";

const FORM_ENDPOINT = "";
const PAGE_SIZES = [25, 50, 100];

function getLanguage() {
  return localStorage.getItem("lang") === "tr" ? "tr" : "en";
}

function Header({ language, onLanguage, onOpenFilters }) {
  const copy = UI[language];
  return (
    <header className="catalogue-header">
      <div className="catalogue-header-inner">
        <div className="catalogue-brand">
          <button className="catalogue-menu rounded-lg p-2 text-surface-600 hover:bg-surface-100 lg:hidden" type="button" onClick={onOpenFilters} aria-label={copy.menu}>
            <Menu size={22} />
          </button>
          <a className="site-brand-link" href="/" aria-label={`SummerButWhere - ${language === "tr" ? "Ana sayfa" : "Home"}`}>
            <img className="catalogue-site-logo" src="/assets/summerbutwhere-logo.png" alt="SummerButWhere - Akademik Yaz Okulu Programları" />
          </a>
          <a className="parent-brand" href="https://asba.com.tr">
            <img src="/assets/asba-logo.png" alt="ASBA Yurtdışı Eğitim Danışmanlık" width="738" height="237" />
          </a>
        </div>
        <div className="catalogue-actions">
          <a className="site-about-link" href="/about">{copy.about}</a>
          <button className="catalogue-language flex items-center gap-1.5 rounded-lg border border-surface-200 px-3 py-1.5 text-sm font-medium text-surface-600 hover:bg-surface-100 transition-colors" type="button" onClick={onLanguage}>
            <Globe2 size={16} /> {language === "en" ? "TR" : "EN"}
          </button>
        </div>
      </div>
    </header>
  );
}

function Checkbox({ checked, partial = false, label, onChange }) {
  return (
    <button className="catalogue-checkbox" type="button" role="checkbox" aria-checked={partial ? "mixed" : checked} onClick={onChange}>
      <span className={`catalogue-checkmark${checked || partial ? " is-checked" : ""}`}>
        {checked ? <Check size={12} strokeWidth={3} /> : partial ? <span className="codex-school-dash" /> : null}
      </span>
      <span className="catalogue-checkbox-label">{label}</span>
    </button>
  );
}

function SimpleFilter({ title, items, selected, onToggle }) {
  return (
    <section className="catalogue-filter-group">
      <h3 className="mb-2.5 text-xs font-bold uppercase tracking-wider text-surface-400">{title}</h3>
      <div className="space-y-1">
        {items.map((item) => (
          <Checkbox key={item.value} checked={selected.includes(item.value)} label={item.label} onChange={() => onToggle(item.value)} />
        ))}
      </div>
    </section>
  );
}

function SchoolFilter({ providers, selected, onToggle, language }) {
  const [expanded, setExpanded] = useState({});

  function clearLocations(provider) {
    provider.locations.forEach((location) => {
      const value = `${provider.value}||${location.value}`;
      if (selected.includes(value)) onToggle(value);
    });
  }

  function toggleProvider(provider) {
    const direct = selected.includes(provider.value);
    const selectedLocations = provider.locations.filter((location) => selected.includes(`${provider.value}||${location.value}`)).length;
    if (direct) return onToggle(provider.value);
    if (selectedLocations) return clearLocations(provider);
    onToggle(provider.value);
  }

  return (
    <section className="catalogue-filter-group">
      <h3 className="mb-2.5 text-xs font-bold uppercase tracking-wider text-surface-400">{UI[language].school}</h3>
      <div className="space-y-1">
        {providers.map((provider) => {
          const direct = selected.includes(provider.value);
          const selectedLocations = provider.locations.filter((location) => selected.includes(`${provider.value}||${location.value}`)).length;
          const allLocations = provider.locations.length > 1 && selectedLocations === provider.locations.length;
          const partial = !direct && !allLocations && selectedLocations > 0;
          const open = provider.locations.length > 1 && (expanded[provider.value] ?? selectedLocations > 0);
          return (
            <div key={provider.value}>
              <div className="codex-school-row">
                <div className="codex-school-main">
                  <Checkbox checked={direct || allLocations} partial={partial} label={provider.label} onChange={() => toggleProvider(provider)} />
                </div>
                {partial && !open ? <span className="codex-school-selected" title="Selected locations">{selectedLocations}</span> : null}
                {provider.locations.length > 1 ? (
                  <button className={`codex-school-toggle${open ? " is-open" : ""}`} type="button" aria-label={provider.label} aria-expanded={open} onClick={() => setExpanded((current) => ({ ...current, [provider.value]: !open }))}>
                    <ChevronRight size={16} />
                  </button>
                ) : null}
              </div>
              {open ? (
                <div className="codex-school-locations">
                  {provider.locations.map((location) => {
                    const value = `${provider.value}||${location.value}`;
                    return (
                      <div className="codex-school-location" key={value}>
                        <div className="codex-school-main">
                          <Checkbox checked={direct || selected.includes(value)} label={language === "tr" ? location.labelTr : location.label} onChange={() => {
                            if (direct) {
                              onToggle(provider.value);
                              provider.locations.filter((item) => item.value !== location.value).forEach((item) => onToggle(`${provider.value}||${item.value}`));
                            } else {
                              onToggle(value);
                            }
                          }} />
                        </div>
                        <span className="codex-school-count">{location.count}</span>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function FilterContents({ language, subjects, countries, providers, selected, onToggle }) {
  const copy = UI[language];
  return (
    <div className="space-y-5">
      <SimpleFilter title={copy.subject} items={subjects} selected={selected.subjects} onToggle={(value) => onToggle("subjects", value)} />
      <SimpleFilter title={copy.country} items={countries} selected={selected.countries} onToggle={(value) => onToggle("countries", value)} />
      <SchoolFilter providers={providers} selected={selected.providers} onToggle={(value) => onToggle("providers", value)} language={language} />
    </div>
  );
}

function Sidebar(props) {
  const { language, selected, onClear } = props;
  const active = selected.subjects.length + selected.countries.length + selected.providers.length;
  return (
    <aside className="hidden lg:block w-72 shrink-0">
      <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto rounded-xl border border-surface-200 bg-white p-5 shadow-sm scrollbar-thin scrollbar-thumb-surface-200 scrollbar-track-transparent">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-bold text-surface-800">{UI[language].filterTitle}</h2>
          {active ? <button className="flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-700" type="button" onClick={onClear}><RotateCcw size={14} />{UI[language].clearAll}</button> : null}
        </div>
        <FilterContents {...props} />
      </div>
    </aside>
  );
}

function MobileFilters({ open, onClose, onClear, ...props }) {
  if (!open) return null;
  const { language } = props;
  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button className="fixed inset-0 bg-black/40" type="button" aria-label={UI[language].close} onClick={onClose} />
      <aside className="fixed inset-y-0 left-0 w-full max-w-sm bg-white shadow-xl overflow-y-auto">
        <div className="flex items-center justify-between border-b border-surface-200 px-4 py-4">
          <h2 className="text-lg font-bold text-surface-800">{UI[language].filterTitle}</h2>
          <button className="rounded-lg p-2 text-surface-500 hover:bg-surface-100" type="button" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="p-4"><FilterContents {...props} /></div>
        <div className="sticky bottom-0 flex gap-3 border-t border-surface-200 bg-white px-4 py-4">
          <button className="flex-1 rounded-lg border border-surface-200 px-4 py-2.5 text-sm font-medium text-surface-600" type="button" onClick={onClear}>{UI[language].clearAll}</button>
          <button className="flex-1 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white" type="button" onClick={onClose}>{UI[language].apply}</button>
        </div>
      </aside>
    </div>
  );
}

function ProgramCard({ program, candidates, language }) {
  const image = imageFor(program, candidates);
  const title = programTitle(program, language);
  const description = language === "tr" && program.description_short_tr ? program.description_short_tr : program.description_short;
  const source = program.photo_source && image === program.photo_source.local_path ? program.photo_source : null;
  return (
    <div className="programme-photo-card">
      <a className="group flex flex-col overflow-hidden rounded-xl border border-surface-200 bg-white text-left shadow-sm transition-all hover:border-brand-300 hover:shadow-md hover:-translate-y-0.5" href={`/programs/${encodeURIComponent(program.id)}`}>
        <div className="relative h-44 overflow-hidden bg-surface-100">
          {image ? <img className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" src={image} alt={title} loading="lazy" /> : <div className="flex h-full items-center justify-center text-5xl opacity-20">🎓</div>}
          <span className="absolute top-3 left-3 inline-flex items-center rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-surface-700 shadow-sm backdrop-blur-sm">{BUCKET_LABELS[program.subjectBucket]?.en || program.subjectBucket}</span>
        </div>
        <div className="flex flex-1 flex-col p-4">
          <p className="mb-1 text-xs font-semibold text-brand-600">{program.providerLabel}</p>
          <h3 className="mb-2 line-clamp-3 text-sm font-bold text-surface-800 leading-snug">{title}</h3>
          <p className="mb-4 line-clamp-2 flex-1 text-xs leading-relaxed text-surface-500">{description}</p>
          <div className="flex flex-wrap items-center gap-2 border-t border-surface-100 pt-3 text-[11px] text-surface-400">
            {program.age_ranges?.[0] ? <span className="flex items-center gap-1"><span className="text-surface-300">👥</span> {UI[language].ages} {program.age_ranges[0]}</span> : null}
            {displayLocation(program, language) ? <span className="flex items-center gap-1"><span className="text-surface-300">📍</span> {displayLocation(program, language)}</span> : null}
            {program.price?.display ? <span className="flex items-center gap-1"><span className="text-surface-300">💰</span> {program.price.display}</span> : null}
          </div>
        </div>
      </a>
      {source ? (
        <p className="programme-photo-credit">
          <span>{source.source_kind === "illustrative" ? UI[language].illustrativePhoto : UI[language].photo}: </span>
          <a href={source.source_page} target="_blank" rel="noopener noreferrer" title={source.description || source.title}>{source.artist || program.providerLabel}</a>
          {source.source_kind === "illustrative" ? <> · <a href={source.license_url || source.source_page} target="_blank" rel="noopener noreferrer">{source.license}</a></> : null}
        </p>
      ) : null}
    </div>
  );
}

function Pagination({ page, pages, pageSize, total, onPage, onPageSize, language }) {
  if (!total) return null;
  const numbers = [];
  for (let number = 1; number <= pages; number += 1) {
    if (number === 1 || number === pages || Math.abs(number - page) <= 1 || (page <= 3 && number <= 4) || (page >= pages - 2 && number >= pages - 3)) numbers.push(number);
    else if (numbers.at(-1) !== "…") numbers.push("…");
  }
  const go = (next) => {
    if (next < 1 || next > pages || next === page) return;
    onPage(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  return (
    <div className="catalogue-pager">
      <div className="catalogue-pager-size"><span>{UI[language].showPerPage}:</span><div className="catalogue-pager-sizes">{PAGE_SIZES.map((size) => <button className={size === pageSize ? "is-active" : ""} type="button" key={size} onClick={() => onPageSize(size)}>{size}</button>)}</div></div>
      {pages > 1 ? <nav className="catalogue-pager-pages" aria-label="Pagination">
        <button className="catalogue-pager-arrow" type="button" disabled={page === 1} onClick={() => go(page - 1)}><ChevronLeft size={18} /></button>
        {numbers.map((number, index) => number === "…" ? <span className="catalogue-pager-gap" key={`gap-${index}`}>…</span> : <button className={`catalogue-pager-num${number === page ? " is-active" : ""}`} type="button" aria-current={number === page ? "page" : undefined} key={number} onClick={() => go(number)}>{number}</button>)}
        <button className="catalogue-pager-arrow" type="button" disabled={page === pages} onClick={() => go(page + 1)}><ChevronRight size={18} /></button>
      </nav> : null}
    </div>
  );
}

function InformationForm({ language }) {
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("");
  const [sending, setSending] = useState(false);
  const copy = language === "tr" ? {
    eyebrow: "Size yardımcı olalım", title: "Bilgi Formu", intro: "İlgilendiğiniz programlar hakkında detaylı bilgi ve fiyat teklifi almak için formu doldurun.",
    interest: "Program veya ilgi alanı", interestPh: "Örn. Tıp, Londra, 14–17 yaş", name: "Adı Soyadı", namePh: "Adınız soyadınız", phone: "Telefon", phonePh: "05xx xxx xx xx", email: "E-posta", emailPh: "ornek@eposta.com", age: "Katılımcının yaşı", city: "Bulunduğunuz il", pick: "Lütfen seçin", abroad: "Yurt dışı", yearsOld: "yaş", submit: "Bilgi al", note: "Bilgileriniz yalnızca size dönüş yapmak için kullanılır.",
    errName: "Lütfen adınızı ve soyadınızı yazın.", errPhone: "Geçerli bir telefon numarası yazın.", errEmail: "Geçerli bir e-posta adresi yazın.", errAge: "Katılımcının yaşını seçin.", errCity: "Bulunduğunuz ili seçin.", sending: "Gönderiliyor…", done: "Talebiniz alındı. En kısa sürede size dönüş yapacağız.", notConnected: "Form henüz bir e-posta adresine bağlı değil; bilgileriniz gönderilmedi.", failed: "Gönderilemedi. Lütfen daha sonra tekrar deneyin.",
  } : {
    eyebrow: "Let us help", title: "Information form", intro: "Fill in the form to get detailed information and a price quote for programs that interest you.",
    interest: "Program or subject of interest", interestPh: "E.g. Medicine, London, ages 14–17", name: "Name / surname", namePh: "Your name and surname", phone: "Phone", phonePh: "+90 5xx xxx xx xx", email: "Email", emailPh: "name@example.com", age: "Participant's age", city: "City you live in", pick: "Please select", abroad: "Outside Türkiye", yearsOld: "years old", submit: "Request info", note: "Your details are only used to get back to you.",
    errName: "Please enter your name and surname.", errPhone: "Please enter a valid phone number.", errEmail: "Please enter a valid email address.", errAge: "Please select the participant's age.", errCity: "Please select your city.", sending: "Sending…", done: "Request received. We will get back to you shortly.", notConnected: "The form is not connected to an email address yet; your details were not sent.", failed: "Could not send. Please try again later.",
  };
  const field = (name, label, control, error, wide = false) => <div className={`cat-info-field${wide ? " is-wide" : ""}${errors[name] ? " is-invalid" : ""}`}><label htmlFor={`cat-info-${name}`}>{label}</label>{control}<p className="cat-info-error">{error}</p></div>;
  async function submit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form).entries());
    const invalid = { name: String(values.name || "").trim().length < 3, phone: String(values.phone || "").replace(/\D/g, "").length < 10, email: !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(values.email || "").trim()), age: !values.age, city: !values.city };
    setErrors(invalid); setStatus("");
    if (Object.values(invalid).some(Boolean)) return;
    if (!FORM_ENDPOINT) { setStatus(copy.notConnected); return; }
    setSending(true); setStatus(copy.sending);
    try {
      const response = await fetch(FORM_ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ ...values, language, page: location.href }) });
      if (!response.ok) throw new Error(String(response.status));
      form.reset(); setErrors({}); setStatus(copy.done);
    } catch { setStatus(copy.failed); } finally { setSending(false); }
  }
  return (
    <aside className="catalogue-info"><div className="cat-info-card">
      <div className="cat-info-head"><span className="cat-info-icon" aria-hidden="true">?</span><div><p>{copy.eyebrow}</p><h2>{copy.title}</h2></div><p className="cat-info-intro">{copy.intro}</p></div>
      <form noValidate onSubmit={submit}><div className="cat-info-fields">
        {field("interest", copy.interest, <input id="cat-info-interest" name="interest" placeholder={copy.interestPh} />, "", true)}
        {field("name", copy.name, <input id="cat-info-name" name="name" autoComplete="name" placeholder={copy.namePh} />, copy.errName)}
        {field("phone", copy.phone, <input id="cat-info-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder={copy.phonePh} />, copy.errPhone)}
        {field("email", copy.email, <input id="cat-info-email" name="email" type="email" inputMode="email" autoComplete="email" placeholder={copy.emailPh} />, copy.errEmail)}
        {field("age", copy.age, <select id="cat-info-age" name="age" defaultValue=""><option value="">{copy.pick}</option>{Array.from({ length: 15 }, (_, index) => index + 5).map((age) => <option value={age} key={age}>{age} {copy.yearsOld}</option>)}</select>, copy.errAge)}
        {field("city", copy.city, <select id="cat-info-city" name="city" defaultValue=""><option value="">{copy.pick}</option>{CITIES.map((city) => <option value={city} key={city}>{city}</option>)}<option value={copy.abroad}>{copy.abroad}</option></select>, copy.errCity)}
      </div>{status ? <div className="cat-info-status" aria-live="polite">{status}</div> : null}<button className="cat-info-submit" type="submit" disabled={sending}>{sending ? copy.sending : copy.submit}</button><p className="cat-info-note">{copy.note}</p></form>
    </div></aside>
  );
}

export default function CatalogueApp() {
  const [language, setLanguage] = useState(getLanguage);
  const [data, setData] = useState({ programs: [], candidates: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [selected, setSelected] = useState({ subjects: [], countries: [], providers: [] });
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);

  useEffect(() => { loadCatalogueData().then(setData).catch((reason) => setError(reason.message)).finally(() => setLoading(false)); }, []);
  useEffect(() => { document.documentElement.lang = language; }, [language]);

  const subjects = useMemo(() => [...new Set(data.programs.map((program) => program.subjectBucket))].filter((bucket) => bucket !== "Other").sort().map((value) => ({ value, label: BUCKET_LABELS[value]?.[language] || value })), [data.programs, language]);
  const countries = useMemo(() => [...new Set(data.programs.map((program) => program.country).filter(Boolean))].sort().map((value) => ({ value, label: COUNTRY_LABELS[value]?.[language] || value })), [data.programs, language]);
  const providers = useMemo(() => {
    const byProvider = new Map();
    data.programs.forEach((program) => {
      const provider = byProvider.get(program.providerFilter) || { value: program.providerFilter, label: program.providerFilter, locations: new Map() };
      const location = provider.locations.get(program.locationKey) || { value: program.locationKey, label: program.filterLocationLabel, labelTr: program.filterLocationLabelTr, count: 0 };
      location.count += 1; provider.locations.set(program.locationKey, location); byProvider.set(program.providerFilter, provider);
    });
    return [...byProvider.values()].map((provider) => ({ ...provider, locations: [...provider.locations.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)) })).sort((a, b) => a.label.localeCompare(b.label));
  }, [data.programs]);
  const filtered = useMemo(() => data.programs.filter((program) => {
    const subject = !selected.subjects.length || selected.subjects.includes(program.subjectBucket);
    const country = !selected.countries.length || selected.countries.includes(program.country);
    const provider = !selected.providers.length || selected.providers.includes(program.providerFilter) || selected.providers.includes(`${program.providerFilter}||${program.locationKey}`);
    return subject && country && provider;
  }), [data.programs, selected]);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);
  const toggle = (type, value) => { setSelected((current) => ({ ...current, [type]: current[type].includes(value) ? current[type].filter((item) => item !== value) : [...current[type], value] })); setPage(1); };
  const clear = () => { setSelected({ subjects: [], countries: [], providers: [] }); setPage(1); };
  const changeLanguage = () => { const next = language === "tr" ? "en" : "tr"; localStorage.setItem("lang", next); setLanguage(next); };
  const filterProps = { language, subjects, countries, providers, selected, onToggle: toggle };

  if (loading) return <div className="flex h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" /></div>;
  if (error) return <div className="flex h-screen items-center justify-center"><p className="text-red-500">Error: {error}</p></div>;
  return <div className="min-h-screen"><Header language={language} onLanguage={changeLanguage} onOpenFilters={() => setMobileOpen(true)} /><MobileFilters {...filterProps} open={mobileOpen} onClose={() => setMobileOpen(false)} onClear={clear} />
    <main className="catalogue-main-shell mx-auto px-4 py-6 sm:px-6">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-brand-600 mb-1">{UI[language].eyebrow}</p><h1 className="text-2xl font-bold text-surface-800">{UI[language].siteTitle}</h1></div><p className="text-sm text-surface-400"><strong className="font-bold text-surface-700">{filtered.length}</strong> {UI[language].showingResults}</p></div>
      <div className="catalogue-layout"><Sidebar {...filterProps} onClear={clear} /><section className="min-w-0 flex-1">{visible.length ? <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">{visible.map((program) => <ProgramCard key={program.id} program={program} candidates={data.candidates} language={language} />)}</div> : <div className="flex flex-col items-center justify-center py-20 text-center"><div className="mb-4 text-6xl opacity-30">🎓</div><p className="text-lg font-semibold text-surface-600">{UI[language].noResults}</p><p className="text-sm text-surface-400">{UI[language].noResultsHint}</p></div>}<Pagination page={page} pages={pages} pageSize={pageSize} total={filtered.length} onPage={setPage} onPageSize={(size) => { setPageSize(size); setPage(1); }} language={language} /></section><InformationForm language={language} /></div>
    </main>
  </div>;
}
