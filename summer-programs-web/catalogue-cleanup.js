(function () {
  const root = document.getElementById("root");
  if (!root) return;

  const redundantSections = new Set([
    "Overview",
    "Dates, ages and format",
    "Schedule, ages and format",
    "Fees",
    "Location",
    "Genel Bakış",
    "Tarihler, Yaş Aralığı ve Format",
    "Takvim, Yaş Aralığı ve Format",
    "Ücretler",
    "Konum"
  ]);

  let cleanupQueued = false;

  function chunkText(text, maximumLength = 210) {
    const words = text.split(/\s+/).filter(Boolean);
    const chunks = [];
    let current = "";

    words.forEach((word) => {
      const candidate = current ? `${current} ${word}` : word;
      if (candidate.length > maximumLength && current) {
        chunks.push(current);
        current = word;
      } else {
        current = candidate;
      }
    });

    if (current) chunks.push(current);
    return chunks;
  }

  function makeBullets(text) {
    const cleaned = text
      .replace(/\s+/g, " ")
      .replace(/\.([A-ZÇĞİÖŞÜ])/g, ". $1")
      .trim();

    if (!cleaned) return [];

    const sentences = cleaned
      .split(/(?<=[.!?])\s+(?=[A-ZÇĞİÖŞÜ0-9])/u)
      .flatMap((sentence) => chunkText(sentence.trim()))
      .map((sentence) => sentence.replace(/^[•–-]\s*/, "").trim())
      .filter((sentence) => sentence.length > 2);

    const seen = new Set();
    return sentences.filter((sentence) => {
      const key = sentence.toLocaleLowerCase().replace(/[^a-z0-9çğıöşü]+/giu, " ").trim();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 10);
  }

  function bulletize(section) {
    if (section.dataset.bulletized === "true") return;
    const body = section.querySelector(".prose");
    if (!body) return;

    const bullets = makeBullets(body.textContent);
    if (!bullets.length) {
      section.remove();
      return;
    }

    const list = document.createElement("ul");
    list.className = "program-bullet-list";
    bullets.forEach((bullet) => {
      const item = document.createElement("li");
      const marker = document.createElement("span");
      const copy = document.createElement("span");
      marker.className = "program-bullet-marker";
      marker.setAttribute("aria-hidden", "true");
      copy.textContent = bullet;
      item.append(marker, copy);
      list.append(item);
    });

    body.replaceWith(list);
    section.dataset.bulletized = "true";
  }

  function cleanDetailPage() {
    if (!window.location.hash.startsWith("#/programs/")) return;

    root.querySelectorAll('a[target="_blank"]').forEach((link) => link.remove());

    const heading = root.querySelector("h1");
    if (!heading) return;
    const content = heading.parentElement;

    Array.from(content.children).forEach((element) => {
      if (element.tagName === "P") {
        element.remove();
        return;
      }

      if (element.tagName !== "SECTION" || element.id === "online-research-pathway-options") return;
      const title = element.querySelector("h2")?.textContent.trim();
      if (redundantSections.has(title)) {
        element.remove();
      } else {
        bulletize(element);
      }
    });
  }

  function scheduleCleanup() {
    if (cleanupQueued) return;
    cleanupQueued = true;
    queueMicrotask(() => {
      cleanupQueued = false;
      cleanDetailPage();
    });
  }

  new MutationObserver(scheduleCleanup).observe(root, { childList: true, subtree: true });
  window.addEventListener("hashchange", scheduleCleanup);
  scheduleCleanup();
})();
