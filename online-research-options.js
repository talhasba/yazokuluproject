(function () {
  const PROGRAM_ID = "immerse-online-research-programme";
  const SECTION_ID = "online-research-pathway-options";
  let programPromise;
  let renderQueued = false;

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function getProgram() {
    if (!programPromise) {
      programPromise = fetch("data/programs.normalized.json")
        .then((response) => {
          if (!response.ok) throw new Error("Unable to load programme options");
          return response.json();
        })
        .then((programs) => programs.find((program) => program.id === PROGRAM_ID));
    }
    return programPromise;
  }

  function makeCard(option, language) {
    const labels = language === "tr"
      ? { viewAll: "Tümünü gör", showLess: "Daha az göster" }
      : { viewAll: "View all", showLess: "Show less" };
    const card = element("article", "orp-card");
    card.dataset.option = option.id;

    const heading = element("div", "orp-card-heading");
    heading.append(
      element("h3", "orp-card-title", option.title),
      element("span", "orp-card-duration", option.duration),
      element("span", "orp-card-price", option.price)
    );
    card.append(heading, element("p", "orp-card-description", option.description));

    const list = element("ul", "orp-feature-list");
    option.features.forEach((feature, index) => {
      const item = element("li", "orp-feature", feature);
      if (index >= 7) {
        item.classList.add("orp-feature-extra");
        item.hidden = true;
      }
      list.append(item);
    });
    card.append(list);

    if (option.features.length > 7) {
      const viewAll = element("button", "orp-view-all", labels.viewAll);
      viewAll.type = "button";
      viewAll.setAttribute("aria-expanded", "false");
      viewAll.addEventListener("click", () => {
        const expanded = viewAll.getAttribute("aria-expanded") === "true";
        viewAll.setAttribute("aria-expanded", String(!expanded));
        viewAll.textContent = expanded ? labels.viewAll : labels.showLess;
        card.querySelectorAll(".orp-feature-extra").forEach((item) => {
          item.hidden = expanded;
        });
      });
      card.append(viewAll);
    }

    return card;
  }

  function buildSection(program, language) {
    const allOptions = language === "tr" && program.pricing_options_tr?.length
      ? program.pricing_options_tr
      : program.pricing_options;
    const options = allOptions.filter((option) =>
      option.id !== "publication-research" && option.id !== "group-accredited"
    );
    const copy = language === "tr"
      ? {
          title: "Çevrimiçi Araştırma Yolu seçenekleri",
          intro: "Classic, akrediteli, grup ve yayın odaklı seçenekler arasından çalışma biçiminize ve hedeflerinize uygun yolu seçin. Eğitim, seçilen programa göre 10 veya 15 görüşme saati üzerinden yürütülür.",
          note: "Not: UCAS puanı yalnızca 14 yaş ve üzerindeki katılımcılara verilebilir. 14 yaşın altındaki öğrenciler için Classic Çevrimiçi Araştırma Yolu önerilir."
        }
      : {
          title: "Online Research Pathway options",
          intro: "Choose the pathway that best fits your study style and goals, from Classic and accredited routes to group learning and publication support. Tuition is delivered through 10 or 15 contact hours depending on the option.",
          note: "Note: UCAS points can only be awarded to participants aged 14 or over. Students under 14 are advised to choose the Classic Online Research Pathway."
        };

    const section = element("section", "orp-options");
    section.id = SECTION_ID;
    section.dataset.language = language;
    section.append(
      element("h2", "orp-heading", copy.title),
      element("p", "orp-intro", copy.intro),
      element("p", "orp-note", copy.note)
    );
    const grid = element("div", "orp-grid");
    options.forEach((option) => grid.append(makeCard(option, language)));
    section.append(grid);
    return section;
  }

  async function render() {
    renderQueued = false;
    const onTargetPage = window.location.hash === `#/programs/${PROGRAM_ID}`;
    const existing = document.getElementById(SECTION_ID);
    if (!onTargetPage) {
      existing?.remove();
      return;
    }

    const language = localStorage.getItem("lang") === "tr" ? "tr" : "en";
    if (existing?.dataset.language === language) return;

    const headings = document.querySelectorAll("h1");
    const heading = headings[headings.length - 1];
    if (!heading) return;
    const contentColumn = heading.parentElement;
    const firstDetailSection = Array.from(contentColumn.children)
      .find((child) => child.tagName === "SECTION" && child.id !== SECTION_ID);
    if (!firstDetailSection) return;

    try {
      const program = await getProgram();
      if (!program?.pricing_options?.length) return;
      const section = buildSection(program, language);
      existing?.remove();
      contentColumn.insertBefore(section, firstDetailSection);
    } catch (error) {
      console.error(error);
    }
  }

  function scheduleRender() {
    if (renderQueued) return;
    renderQueued = true;
    queueMicrotask(render);
  }

  window.addEventListener("hashchange", scheduleRender);
  window.addEventListener("storage", scheduleRender);
  new MutationObserver(scheduleRender).observe(document.documentElement, {
    childList: true,
    subtree: true
  });
  scheduleRender();
})();
