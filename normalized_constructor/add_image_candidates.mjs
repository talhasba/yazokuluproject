// One-off script: adds image-candidate entries for the 9 Constructor University
// Summer Camp records to data/image-candidates.json. Run once after
// normalize_constructor.mjs and after downloading the topic photos into
// assets/program-images/constructor/. Safe to rerun (overwrites just these 9 keys).
import { readFileSync, writeFileSync } from "node:fs";

const PATH = "data/image-candidates.json";
const EXTERNAL_FALLBACK = "https://constructor.university/sites/default/files/2025-09/Summer%20Camp%202026-2.jpg";
const CAMPUS = "/assets/program-images/campuses/bremen.jpg";
const PREFIX = "constructor-university-summer-camp-";

const TOPIC_LOCAL = {
  "mathematics-and-modeling": "/assets/program-images/constructor/mathematics-and-modeling.jpg",
  "programming-and-algorithms": "/assets/program-images/constructor/programming-and-algorithms.jpg",
  "neural-networks-and-robotics": "/assets/program-images/constructor/neural-networks-and-robotics.jpg",
  "physics-and-research": "/assets/program-images/constructor/physics-and-research.jpg",
  "human-behavior-and-society": "/assets/program-images/constructor/human-behavior-and-society.jpg",
  "innovation-and-design-thinking": "/assets/program-images/constructor/innovation-and-design-thinking.jpg",
  "chemistry-and-research": "/assets/Chemistry-Product-Image-1-300x300-Bun8Vcox.webp",
  "biology-and-research": "/assets/Biology-Product-Image-2-300x300-CH2Cuhib.webp",
  "business-and-entrepreneurship": "/assets/Business-Management-Product-Image-4-300x300-D6z5b-10.webp",
};

const data = JSON.parse(readFileSync(PATH, "utf8"));
for (const [slug, localImage] of Object.entries(TOPIC_LOCAL)) {
  data[PREFIX + slug] = [localImage, CAMPUS, EXTERNAL_FALLBACK];
}
writeFileSync(PATH, JSON.stringify(data, null, 2) + "\n", "utf8");
console.log(`Added ${Object.keys(TOPIC_LOCAL).length} image-candidate entries.`);
