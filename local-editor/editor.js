(function () {
  "use strict";

  const token = document.querySelector('meta[name="editor-token"]')?.content || "";
  const $ = (selector, root = document) => root.querySelector(selector);
  const state = {
    basePrograms: [],
    baseDigests: {},
    overrides: { programs: {}, digests: {} },
    programs: [],
    digests: {},
    selectedId: "",
    draft: null,
    initialDraft: "",
    activeTab: "overview",
    saving: false,
  };

  const PROGRAM_FIELDS = [
    "title", "title_tr", "subject", "subject_tr", "location", "location_tr", "city", "country",
    "duration", "publish_status", "age_ranges", "dates", "delivery_modes", "description_short",
    "description_short_tr", "description_full", "price", "price_note", "price_scope",
  ];
  const DIGEST_FIELDS = ["focus", "tags", "highlights", "doTitle", "do", "outcomes", "fit", "extras"];
  const LIST_FIELDS = new Set(["age_ranges", "dates", "delivery_modes"]);
  const DIGEST_LISTS = new Set(["tags", "highlights", "outcomes", "fit", "extras"]);

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[character]));
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function isObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }

  function merge(base, override) {
    if (override === undefined) return clone(base);
    if (Array.isArray(override) || !isObject(override)) return clone(override);
    const result = isObject(base) ? clone(base) : {};
    for (const [key, value] of Object.entries(override)) result[key] = merge(result[key], value);
    return result;
  }

  function projectProgram(record) {
    const result = {};
    for (const field of PROGRAM_FIELDS) {
      if (field === "price") {
        result.price = {
          currency: record.price?.currency || "",
          min_amount: record.price?.min_amount ?? null,
          max_amount: record.price?.max_amount ?? null,
          display: record.price?.display || "",
          tiers: clone(record.price?.tiers || []),
        };
      } else if (LIST_FIELDS.has(field)) result[field] = clone(record[field] || []);
      else result[field] = record[field] ?? "";
    }
    return result;
  }

  function projectDigest(record) {
    if (!record) return null;
    const language = (value = {}) => {
      const result = {};
      for (const field of DIGEST_FIELDS) {
        if (field === "do") result.do = clone(value.do || []);
        else if (DIGEST_LISTS.has(field)) result[field] = clone(value[field] || []);
        else result[field] = value[field] ?? "";
      }
      return result;
    };
    return { en: language(record.en), tr: language(record.tr) };
  }

  async function fetchJson(url) {
    const response = await fetch(`${url}${url.includes("?") ? "&" : "?"}_=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`Could not load ${url}.`);
    return response.json();
  }

  async function loadData(preferredId = "") {
    const [programs, digests, overrides, status] = await Promise.all([
      fetchJson("/data/programs.normalized.json"),
      fetchJson("/data/program-digests.json"),
      fetchJson("/data/program-editor-overrides.json"),
      fetchJson("/api/editor/status"),
    ]);
    state.basePrograms = programs;
    state.baseDigests = digests;
    state.overrides = { programs: overrides.programs || {}, digests: overrides.digests || {} };
    state.programs = programs.map((program) => merge(program, state.overrides.programs[program.id]));
    state.digests = { ...digests };
    for (const [id, override] of Object.entries(state.overrides.digests)) {
      if (digests[id]) state.digests[id] = merge(digests[id], override);
    }
    populateProviders();
    updateSavedCount(status.modifiedPrograms);
    renderList();
    selectProgram(preferredId || state.selectedId || modifiedIds()[0] || state.programs[0]?.id, true);
    $("#loading").hidden = true;
    $("#editor").hidden = false;
  }

  function modifiedIds() {
    return [...new Set([...Object.keys(state.overrides.programs), ...Object.keys(state.overrides.digests)])];
  }

  function isModified(id) {
    return Boolean(state.overrides.programs[id] || state.overrides.digests[id]);
  }

  function populateProviders() {
    const select = $("#provider-filter");
    const selected = select.value;
    const providers = [...new Map(state.programs.map((program) => [program.provider, program.provider_label || program.provider])).entries()]
      .sort((a, b) => a[1].localeCompare(b[1]));
    select.innerHTML = '<option value="">All providers</option>' + providers.map(([value, label]) => `<option value="${esc(value)}">${esc(label)}</option>`).join("");
    select.value = selected;
  }

  function filteredPrograms() {
    const query = $("#search").value.trim().toLocaleLowerCase("tr");
    const provider = $("#provider-filter").value;
    const changedOnly = $("#changed-only").checked;
    return state.programs.filter((program) => {
      if (provider && program.provider !== provider) return false;
      if (changedOnly && !isModified(program.id)) return false;
      if (!query) return true;
      return [program.title, program.title_tr, program.provider_label, program.location, program.city, program.subject, program.id]
        .some((value) => String(value || "").toLocaleLowerCase("tr").includes(query));
    });
  }

  function renderList() {
    const programs = filteredPrograms();
    $("#list-count").textContent = `${programs.length} program${programs.length === 1 ? "" : "s"}`;
    $("#program-list").innerHTML = programs.length
      ? programs.map((program) => `
          <button class="program-item ${program.id === state.selectedId ? "active" : ""}" type="button" data-program-id="${esc(program.id)}">
            <strong>${esc(program.title)}</strong>
            <small>${esc(program.provider_label || program.provider)} · ${esc(program.city || program.location)}</small>
            ${isModified(program.id) ? '<span class="edit-dot" aria-label="Edited locally"></span>' : ""}
          </button>`).join("")
      : '<div class="empty-list">No programs match these filters.</div>';
  }

  function selectProgram(id, force = false) {
    if (!id) return;
    if (!force && isDirty() && !window.confirm("Discard your unsaved changes and open another program?")) return;
    const program = state.programs.find((item) => item.id === id);
    if (!program) return;
    state.selectedId = id;
    state.activeTab = "overview";
    state.draft = { program: projectProgram(program), digest: projectDigest(state.digests[id]) };
    state.initialDraft = JSON.stringify(state.draft);
    renderList();
    renderEditor();
  }

  function isDirty() {
    return Boolean(state.draft) && JSON.stringify(state.draft) !== state.initialDraft;
  }

  function updateDirtyState() {
    const dirty = isDirty();
    const element = $("#dirty-state");
    element.classList.toggle("dirty", dirty);
    element.lastChild.textContent = dirty ? " Unsaved changes" : " No unsaved changes";
    $("#save-button").disabled = !dirty || state.saving;
  }

  function field(label, name, value, options = {}) {
    const { full = false, textarea = false, tall = false, note = "", readonly = false, type = "text" } = options;
    const control = textarea
      ? `<textarea class="${tall ? "tall" : ""}" data-program-field="${name}" ${readonly ? "readonly" : ""}>${esc(value)}</textarea>`
      : `<input type="${type}" data-program-field="${name}" value="${esc(value)}" ${readonly ? "readonly" : ""} />`;
    return `<div class="field ${full ? "full" : ""}"><label>${esc(label)}${note ? `<span class="field-note">${esc(note)}</span>` : ""}</label>${control}</div>`;
  }

  function listField(label, name, values, options = {}) {
    return `<div class="field ${options.full === false ? "" : "full"}"><label>${esc(label)}<span class="field-note">One item per line</span></label><textarea data-program-list="${name}">${esc((values || []).join("\n"))}</textarea>${options.helper ? `<p class="helper">${esc(options.helper)}</p>` : ""}</div>`;
  }

  function digestField(label, lang, name, value, options = {}) {
    const attrs = `data-digest-field="${name}" data-lang="${lang}"`;
    const content = options.textarea === false
      ? `<input ${attrs} value="${esc(value)}" />`
      : `<textarea class="${options.tall ? "tall" : ""}" ${attrs}>${esc(value)}</textarea>`;
    return `<div class="field ${options.full === false ? "" : "full"}"><label>${esc(label)}${options.note ? `<span class="field-note">${esc(options.note)}</span>` : ""}</label>${content}</div>`;
  }

  function digestListField(label, lang, name, values, helper = "") {
    return `<div class="field full"><label>${esc(label)}<span class="field-note">One item per line</span></label><textarea data-digest-list="${name}" data-lang="${lang}">${esc((values || []).join("\n"))}</textarea>${helper ? `<p class="helper">${esc(helper)}</p>` : ""}</div>`;
  }

  function section(title, description, content, chip = "") {
    return `<section class="section-card"><div class="section-heading"><div><h2>${esc(title)}</h2><p>${esc(description)}</p></div>${chip ? `<span class="language-chip">${esc(chip)}</span>` : ""}</div>${content}</section>`;
  }

  function overviewPanel() {
    const p = state.draft.program;
    return `<div class="form-panel ${state.activeTab === "overview" ? "active" : ""}" data-panel="overview">
      ${section("Program identity", "Titles and catalogue classification.", `<div class="field-grid">
        ${field("English title", "title", p.title)}
        ${field("Turkish title", "title_tr", p.title_tr)}
        ${field("English subject", "subject", p.subject)}
        ${field("Turkish subject", "subject_tr", p.subject_tr)}
      </div>`)}
      ${section("Location", "Where the program appears in search and on its detail page.", `<div class="field-grid">
        ${field("English location", "location", p.location)}
        ${field("Turkish location", "location_tr", p.location_tr)}
        ${field("City", "city", p.city)}
        ${field("Country", "country", p.country)}
      </div>`)}
      ${section("Publishing", "Control the catalogue review label.", `<div class="field-grid">
        <div class="field"><label>Publication status</label><select data-program-field="publish_status"><option value="ready" ${p.publish_status === "ready" ? "selected" : ""}>Ready</option><option value="needs_review" ${p.publish_status === "needs_review" ? "selected" : ""}>Needs review</option></select></div>
        ${field("Provider", "provider", currentProgram().provider_label || currentProgram().provider, { readonly: true })}
      </div>`)}
    </div>`;
  }

  function pricingPanel() {
    const p = state.draft.program;
    return `<div class="form-panel ${state.activeTab === "pricing" ? "active" : ""}" data-panel="pricing">
      ${section("Dates and eligibility", "The key facts shown on catalogue cards and program pages.", `<div class="field-grid">
        ${field("Duration", "duration", p.duration, { note: "e.g. 2 weeks" })}
        ${listField("Age ranges", "age_ranges", p.age_ranges, { full: false, helper: "Examples: 13-17 or 16–18" })}
        ${listField("Dates", "dates", p.dates)}
        ${listField("Delivery modes", "delivery_modes", p.delivery_modes, { helper: "Usually in_person or virtual" })}
      </div>`)}
      ${section("Displayed price", "How the main price appears across the website.", `<div class="field-grid three">
        ${priceInput("Display", "display", p.price.display, "e.g. £3,095")}
        ${priceInput("Currency", "currency", p.price.currency, "GBP, USD, EUR")}
        ${priceInput("Minimum amount", "min_amount", p.price.min_amount, "", "number")}
        ${priceInput("Maximum amount", "max_amount", p.price.max_amount, "", "number")}
        ${field("Price note", "price_note", p.price_note, { full: true })}
        ${field("Price scope", "price_scope", p.price_scope, { full: true })}
      </div><div class="subsection"><div class="subsection-title"><strong>Price options</strong><button class="small-button" type="button" data-action="add-tier">+ Add option</button></div><div id="price-tiers" class="repeat-list">${priceTierRows()}</div></div>`)}
    </div>`;
  }

  function priceInput(label, name, value, placeholder = "", type = "text") {
    return `<div class="field"><label>${esc(label)}</label><input type="${type}" data-price-field="${name}" value="${esc(value ?? "")}" placeholder="${esc(placeholder)}" ${type === "number" ? 'min="0" step="any"' : ""} /></div>`;
  }

  function priceTierRows() {
    const tiers = state.draft.program.price.tiers || [];
    if (!tiers.length) return '<div class="empty-repeat">No separate price options. The main displayed price will be used.</div>';
    return tiers.map((tier, index) => `<div class="repeat-row">
      <input data-tier-index="${index}" data-tier-field="label" value="${esc(tier.label)}" placeholder="Option label" aria-label="Price option label" />
      <input data-tier-index="${index}" data-tier-field="display" value="${esc(tier.display)}" placeholder="Display" aria-label="Displayed option price" />
      <input data-tier-index="${index}" data-tier-field="amount" value="${esc(tier.amount ?? "")}" type="number" min="0" step="any" placeholder="Amount" aria-label="Option amount" />
      <input data-tier-index="${index}" data-tier-field="currency" value="${esc(tier.currency)}" placeholder="Currency" aria-label="Option currency" />
      <button class="remove-button" type="button" data-action="remove-tier" data-index="${index}" aria-label="Remove price option">×</button>
    </div>`).join("");
  }

  function contentPanel(lang) {
    const english = lang === "en";
    const p = state.draft.program;
    const d = state.draft.digest?.[lang];
    const panelName = english ? "english" : "turkish";
    const shortName = english ? "description_short" : "description_short_tr";
    const catalogue = `<div class="field-grid">${field("Catalogue summary", shortName, p[shortName], { full: true, textarea: true, tall: true })}${english ? field("Original long description", "description_full", p.description_full, { full: true, textarea: true, tall: true, note: "Reference / original page" }) : ""}</div>`;
    const digest = d ? `${digestField("Focus statement", lang, "focus", d.focus, { tall: true })}
      <div class="field-grid">
        ${digestListField("Topic tags", lang, "tags", d.tags, "Use 2–6 concise tags.")}
        ${digestListField("Highlights", lang, "highlights", d.highlights)}
      </div>
      <div class="subsection">
        <div class="subsection-title"><strong>Activities</strong><button class="small-button" type="button" data-action="add-step" data-lang="${lang}">+ Add activity</button></div>
        ${digestField("Section heading", lang, "doTitle", d.doTitle, { textarea: false, full: false })}
        <div class="repeat-list" data-steps="${lang}">${stepRows(lang)}</div>
      </div>
      <div class="subsection field-grid">
        ${digestListField("Outcomes", lang, "outcomes", d.outcomes)}
        ${digestListField("Good fit if…", lang, "fit", d.fit)}
        ${digestListField("Beyond the classroom", lang, "extras", d.extras)}
      </div>` : '<div class="unsupported-note">This is the one program that uses the original catalogue detail page rather than the redesigned digest page. Its catalogue descriptions can still be edited above.</div>';
    return `<div class="form-panel ${state.activeTab === panelName ? "active" : ""}" data-panel="${panelName}">
      ${section(english ? "English catalogue content" : "Turkish catalogue content", "Short descriptions shown in browsing and search.", catalogue, english ? "EN" : "TR")}
      ${section(english ? "English program page" : "Turkish program page", "Structured content on the redesigned detail page.", digest, english ? "EN" : "TR")}
    </div>`;
  }

  function stepRows(lang) {
    const steps = state.draft.digest?.[lang]?.do || [];
    if (!steps.length) return '<div class="empty-repeat">No activity blocks yet.</div>';
    return steps.map((step, index) => `<div class="repeat-row steps">
      <input data-step-lang="${lang}" data-step-index="${index}" data-step-field="lead" value="${esc(step.lead)}" placeholder="Activity heading" aria-label="Activity heading" />
      <textarea data-step-lang="${lang}" data-step-index="${index}" data-step-field="text" placeholder="What students do" aria-label="Activity description">${esc(step.text)}</textarea>
      <button class="remove-button" type="button" data-action="remove-step" data-lang="${lang}" data-index="${index}" aria-label="Remove activity">×</button>
    </div>`).join("");
  }

  function currentProgram() {
    return state.programs.find((program) => program.id === state.selectedId) || {};
  }

  function renderEditor() {
    const program = currentProgram();
    $("#provider-name").textContent = program.provider_label || program.provider;
    $("#program-title").textContent = state.draft.program.title;
    $("#program-id").textContent = program.id;
    $("#saved-badge").hidden = !isModified(program.id);
    $("#reset-button").disabled = !isModified(program.id);
    $("#form-content").innerHTML = overviewPanel() + pricingPanel() + contentPanel("en") + contentPanel("tr");
    setActiveTab(state.activeTab);
    updateDirtyState();
  }

  function setActiveTab(tab) {
    state.activeTab = tab;
    document.querySelectorAll("[data-tab]").forEach((button) => button.classList.toggle("active", button.dataset.tab === tab));
    document.querySelectorAll("[data-panel]").forEach((panel) => panel.classList.toggle("active", panel.dataset.panel === tab));
  }

  function lines(value) {
    return String(value || "").split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
  }

  function numberOrNull(value) {
    return value === "" ? null : Number(value);
  }

  function handleFormInput(event) {
    const target = event.target;
    if (!state.draft) return;
    if (target.dataset.programField && target.dataset.programField !== "provider") {
      state.draft.program[target.dataset.programField] = target.value;
      if (target.dataset.programField === "title") $("#program-title").textContent = target.value || "Untitled program";
    } else if (target.dataset.programList) {
      state.draft.program[target.dataset.programList] = lines(target.value);
    } else if (target.dataset.priceField) {
      state.draft.program.price[target.dataset.priceField] = ["min_amount", "max_amount"].includes(target.dataset.priceField) ? numberOrNull(target.value) : target.value;
    } else if (target.dataset.tierField) {
      const tier = state.draft.program.price.tiers[Number(target.dataset.tierIndex)];
      if (tier) tier[target.dataset.tierField] = target.dataset.tierField === "amount" ? numberOrNull(target.value) : target.value;
    } else if (target.dataset.digestField) {
      state.draft.digest[target.dataset.lang][target.dataset.digestField] = target.value;
    } else if (target.dataset.digestList) {
      state.draft.digest[target.dataset.lang][target.dataset.digestList] = lines(target.value);
    } else if (target.dataset.stepField) {
      const step = state.draft.digest[target.dataset.stepLang].do[Number(target.dataset.stepIndex)];
      if (step) step[target.dataset.stepField] = target.value;
    }
    updateDirtyState();
  }

  function handleFormClick(event) {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const action = button.dataset.action;
    if (action === "add-tier") {
      state.draft.program.price.tiers.push({ label: "", currency: state.draft.program.price.currency || "", amount: null, display: "" });
      $("#price-tiers").innerHTML = priceTierRows();
    } else if (action === "remove-tier") {
      state.draft.program.price.tiers.splice(Number(button.dataset.index), 1);
      $("#price-tiers").innerHTML = priceTierRows();
    } else if (action === "add-step") {
      state.draft.digest[button.dataset.lang].do.push({ lead: "", text: "" });
      $(`[data-steps="${button.dataset.lang}"]`).innerHTML = stepRows(button.dataset.lang);
    } else if (action === "remove-step") {
      state.draft.digest[button.dataset.lang].do.splice(Number(button.dataset.index), 1);
      $(`[data-steps="${button.dataset.lang}"]`).innerHTML = stepRows(button.dataset.lang);
    }
    updateDirtyState();
  }

  async function save() {
    if (!isDirty() || state.saving) return;
    state.saving = true;
    $("#save-button").disabled = true;
    $(".save-label").hidden = true;
    $(".saving-label").hidden = false;
    try {
      const response = await fetch(`/api/editor/programs/${encodeURIComponent(state.selectedId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "X-Editor-Token": token },
        body: JSON.stringify(state.draft),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Could not save the program.");
      const id = state.selectedId;
      await loadData(id);
      refreshPreview();
      showToast("Changes saved locally. The program preview is up to date.");
    } catch (error) {
      showToast(error.message, true);
    } finally {
      state.saving = false;
      $(".save-label").hidden = false;
      $(".saving-label").hidden = true;
      updateDirtyState();
    }
  }

  async function resetChanges() {
    if (!isModified(state.selectedId)) return;
    if (!window.confirm("Reset this program to its generated source content? The current local override will be removed.")) return;
    try {
      const response = await fetch(`/api/editor/programs/${encodeURIComponent(state.selectedId)}`, {
        method: "DELETE",
        headers: { "X-Editor-Token": token },
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Could not reset the program.");
      const id = state.selectedId;
      await loadData(id);
      refreshPreview();
      showToast("Local changes removed. The generated source content is active again.");
    } catch (error) {
      showToast(error.message, true);
    }
  }

  function updateSavedCount(count = modifiedIds().length) {
    $("#modified-count").textContent = count ? `${count} program${count === 1 ? "" : "s"} edited locally` : "No saved edits";
  }

  function previewUrl() {
    return `/prototypes/layer-test.html?editor=${Date.now()}#/programs/${encodeURIComponent(state.selectedId)}`;
  }

  function openPreview() {
    $("#preview-drawer").hidden = false;
    refreshPreview();
  }

  function refreshPreview() {
    if (!$("#preview-drawer").hidden && state.selectedId) $("#preview-frame").src = previewUrl();
  }

  let toastTimer;
  function showToast(message, error = false) {
    const toast = $("#toast");
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.toggle("error", error);
    toast.classList.add("show");
    toastTimer = setTimeout(() => toast.classList.remove("show"), 3600);
  }

  $("#search").addEventListener("input", renderList);
  $("#provider-filter").addEventListener("change", renderList);
  $("#changed-only").addEventListener("change", renderList);
  $("#clear-filters").addEventListener("click", () => {
    $("#search").value = "";
    $("#provider-filter").value = "";
    $("#changed-only").checked = false;
    renderList();
  });
  $("#program-list").addEventListener("click", (event) => {
    const button = event.target.closest("[data-program-id]");
    if (button) selectProgram(button.dataset.programId);
  });
  $("#tabs").addEventListener("click", (event) => {
    const button = event.target.closest("[data-tab]");
    if (button) setActiveTab(button.dataset.tab);
  });
  $("#program-form").addEventListener("input", handleFormInput);
  $("#program-form").addEventListener("change", handleFormInput);
  $("#program-form").addEventListener("click", handleFormClick);
  $("#program-form").addEventListener("submit", (event) => event.preventDefault());
  $("#save-button").addEventListener("click", save);
  $("#reset-button").addEventListener("click", resetChanges);
  $("#preview-button").addEventListener("click", openPreview);
  $("#refresh-preview").addEventListener("click", refreshPreview);
  $("#close-preview").addEventListener("click", () => { $("#preview-drawer").hidden = true; $("#preview-frame").src = "about:blank"; });
  window.addEventListener("beforeunload", (event) => { if (isDirty()) { event.preventDefault(); event.returnValue = ""; } });
  window.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
      event.preventDefault();
      save();
    }
  });

  loadData().catch((error) => {
    $("#loading").innerHTML = `<h1>Editor could not start</h1><p>${esc(error.message)}</p><p>Open the editor using <strong>open-program-editor.bat</strong>.</p>`;
  });
}());
