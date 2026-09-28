// Normalizes Constructor University's Summer Camp (Bremen, Germany) into the same
// BASE_FIELDS schema used by normalized_new_providers/normalize_new_providers.py, then
// merges the result into data/programs.normalized.json.
//
// Source material: constructor/Summer Camp at Constructor University....html (the saved
// public program page) and constructor/[public] Summer Camp 2026.docx (the course-by-course
// syllabus). Both are read only for reference here; the extracted text is embedded below
// because no raw scrape JSON was ever produced for this provider (unlike the four providers
// in normalized_new_providers/, whose raw *_combined.json inputs came from prior scrapes).
//
// Run from the project root:
//   node .\normalized_constructor\normalize_constructor.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";

const OUT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = join(OUT_DIR, "..");
const MAIN_DATA = join(ROOT, "data", "programs.normalized.json");

const PROVIDER = "constructor_university";
const PROVIDER_LABEL = "Constructor University Summer Camp";
const OPERATING_INSTITUTION = "Constructor University (Constructor Talent School)";
const DETAIL_URL = "https://constructor.university/talent-school/summer-camp";
const IMAGE_URL = "https://constructor.university/sites/default/files/2025-09/Summer%20Camp%202026-2.jpg";
const SOURCE_FILES = [
  "constructor/Summer Camp at Constructor University – A Top Program for High School Students.html",
  "constructor/[public] Summer Camp 2026.docx",
];

// [cluster label, course title, website short blurb, docx "Description:" paragraph, topics]
// topics: [topic title, topic body][]
const COURSES = [
  [
    "Computational Sciences & Engineering",
    "Mathematics & Modeling",
    "Core calculus, data analysis, and optimization concepts for mathematical modeling across natural, social, and technical sciences.",
    "This course introduces the core concepts of calculus and their role in mathematical modeling. It covers functions, derivatives, integrals, differential equations, data analysis, and optimization, with applications in natural, social, and technical sciences. Emphasis is placed on clarity of interpretation and relevance to real-world problems.",
    [
      ["Functions as a tool for mathematical modeling", "Overview of mathematical modeling and its applications. Representation of processes and phenomena using elementary functions."],
      ["Derivatives: how everything changes", "Derivatives as a measure of change. The relationship between derivatives and function behavior, including monotonicity and extrema. Application of derivatives to analyze process dynamics and solve basic optimization problems."],
      ["Integrals and their application", "Describing processes based on their rate of change. Introduction to the concept of integral. Differential equations as an inevitable stage of mathematical modeling. Applications of integral to solving or analyzing solutions of differential equations."],
      ["From observations to models: how a mathematical picture of the world is born", "Identifying key parameters from real-world observations. Construction of basic models. Acquaintance with the logistic model, its assumptions, purpose, and scope of applicability."],
      ["Statistics: how to work with data", "Exploration of data characteristics such as mean, median, and spread. Introduction to distributions (normal, binomial, Pareto) and deviations from idealized models. Use of spreadsheets for basic statistical processing."],
      ["Mathematical models and optimization", "Use of mathematical models to allocate limited resources efficiently. Examples include rinsing, packing, and transportation problems, with attention to structure and solvability."],
      ["Mathematical models and decision making", "Formalization of selection and decision-making scenarios. Thorough analysis of the fussy suitor problem. Imitative behaviour models."],
      ["Mathematical models and forecasting", "Modeling future outcomes based on current data. Application of linear regression and logistic regression. Basic scoring models for classification tasks, such as creditworthiness assessment."],
    ],
  ],
  [
    "Computational Sciences & Engineering",
    "Programming & Algorithms",
    "Algorithmic problem-solving, analyzing efficiency with Big-O notation, recursion, sorting, and searching.",
    "This course provides a structured exploration of algorithmic problem-solving and computational complexity. Students will learn to analyze the efficiency of algorithms, optimize problem-solving techniques, and understand key concepts such as Big-O notation, recursion, sorting, searching, and problem reduction. The course emphasizes both theoretical understanding and practical strategies for designing efficient algorithms.",
    [
      ["Elementary Functions", "Understanding fundamental mathematical functions that appear in algorithm analysis, including logarithmic and polynomial growth. Comparison of different function growth rates to understand algorithm efficiency."],
      ["Complexity in Terms of Big-O", "Formalizing algorithm efficiency using Big-O notation and learning to ignore insignificant terms. Applying Big-O analysis to different approaches for solving the same problem."],
      ["Complexity of working with lists", "Analyzing the efficiency of list manipulations such as searching and sorting. Binary search and Bubble Sort considered in detail."],
      ["Reduction", "A special form of Mathematical Induction: transforming problems into simpler or smaller versions to solve them efficiently. Iterative problem reduction techniques and their applications."],
      ["Descent", "Using mathematical and algorithmic descent techniques to solve problems efficiently. Specifically, Euclidean Algorithm and Recursion are considered."],
      ["Recursion", "Exploring recursion as a key computational tool for breaking down problems. Special attention dedicated to limitations of recursion. Comparing merging and bubbling sorting algorithms."],
      ["Sorting", "Sorting techniques and their efficiency, from simple to advanced algorithms. Insertion sorting and Quicksort considered in detail."],
      ["Compressing and searching", "Efficient compressing (Huffman tree) and searching (interpolation search) techniques and data structures. Special attention paid to interpolation search and Huffman algorithm."],
    ],
  ],
  [
    "Computational Sciences & Engineering",
    "Neural Networks & Robotics",
    "Hands-on introduction to embodied artificial intelligence, building and training an AI-driven robot using reinforcement learning models and real-world sensors.",
    "An introduction to the foundations of embodied artificial intelligence through hands-on work with a fully functional robotic platform. Intelligent behavior is explored as it emerges from the interaction between algorithms, sensors, actuators, and the unpredictability of the real world. The course focuses on intuitive understanding, practical experimentation, and the engineering mindset needed to build and refine autonomous systems. By the end of the program, a fully trained, AI-driven robot is assembled, tested, and ready to navigate a physical rail environment.",
    [
      ["Introduction to AI through interactive RL", "Running ready-to-use RL (reinforcement learning) models like CartPole and tweaking reward values to watch behavior instantly change. Experimenting with different setups to see how algorithms adapt."],
      ["Robot hardware", "Assembling the robot by mounting the motors, attaching the camera and sensors, installing the magnet switch and emergency stop, and completing the wiring. Powering the robot on for the first time and verifying that basic movement and the safety cutoff work correctly."],
      ["Perception: how robots sense the world, and sensor calibration", "Analyzing raw sensor signals from the camera, distance sensor, and magnet detector to understand noise, range limits, and sampling behavior. Calibrating each sensor through simple experiments adjusting thresholds, testing response curves, and observing how environmental changes affect signal quality."],
      ["Action: motion, control, and feedback", "Tuning system robustness by adjusting speed and braking commands from a laptop and observing the robot's response to external disturbances. Building tiny scripts to automate behaviors like “slow down when an object is close.”"],
      ["Behavior: policies in the real world", "Loading several pre-trained policies (“cautious,” “smooth,” “aggressive”) and comparing how each one drives the robot. Running short tests to understand strengths and weaknesses of different behaviors."],
      ["Reward: shaping intelligent behavior", "Modifying reward parameters (speed reward, collision penalty, station-stop bonus) to influence navigation style. Simulating how different reward sets would change the robot's choices on track."],
      ["Training loops and model deployment", "Launching a simplified training loop that uses the modified reward settings to produce a new policy. Exporting the resulting model and loading it onto the robot to evaluate real-world performance."],
      ["Bot's journey", "Setting up a full miniature railway with obstacles and magnetic stations. Running each robot through the course and presenting results based on speed, safety, and consistency."],
    ],
  ],
  [
    "Natural Sciences & Research",
    "Chemistry & Research",
    "Fundamental chemical principles—from atomic structure and bonding to materials and biochemistry—with real-world relevance and sustainability.",
    "This course connects fundamental chemical principles with real-world relevance, progressing from atomic structure to advanced materials and biochemistry. Through engaging activities and demonstrations, you'll discover how chemistry powers living systems, drives technological innovation, and shapes daily life while addressing global challenges.",
    [
      ["The periodic table and chemical bonding", "How the periodic table organizes elements and predicts their behaviors through atomic structure principles. Atomic structure, different types of chemical bonds and how elements combine to form diverse substances with unique properties."],
      ["Chemical reactions and how substances change", "The fundamental processes by which substances transform, including energy changes and reaction rates. How to identify reaction types. The factors that influence chemical transformations."],
      ["Acids, bases & analytical chemistry", "The properties of acids and bases and their crucial roles in nature and industry. Analytical techniques chemists use to determine composition of substances while examining sustainable approaches."],
      ["Chemistry's evolution & future", "Chemistry's transformation from historical divisions between organic and inorganic disciplines to today's integrated science. How computational methods and AI are revolutionizing molecular discovery, while exploring emerging interdisciplinary approaches addressing global challenges through chemical innovation."],
      ["Biochemistry: the chemistry of life", "How carbon's remarkable bonding versatility creates the molecular foundation for living systems. The structure and function of essential biomolecules — proteins, carbohydrates, lipids, and nucleic acids. How these chemical compounds interact in complex networks to enable life processes and maintain biological systems."],
      ["Advanced materials & modern medicine", "Revolutionary materials study and pharmaceutical developments transforming technology and healthcare. How chemical innovations create nanomaterials with unique properties and contribute to drug discovery and development."],
      ["Environmental chemistry and sustainability", "Chemistry's role in understanding and addressing pollution and climate change. The science behind plastics, air and water quality, renewable energy solutions, and principles of green chemistry."],
      ["The role of chemistry in everyday life", "The chemical principles behind familiar products and processes from cooking to cleaning. How chemistry shapes food production, preservation, household products, and many aspects of daily living."],
    ],
  ],
  [
    "Natural Sciences & Research",
    "Biology & Research",
    "From fundamentals of life from cell structure, DNA/RNA, and evolution to brain function, ecology, and applications in bioengineering.",
    "This course explores the fundamentals of biology from the inner workings of cells and the code of life to evolution, brain function, and ecosystems. It connects core scientific concepts with real-world applications like genetic engineering, disease treatment, and environmental conservation.",
    [
      ["The secret life of cells: Structure, function, and communication", "Cell structure, organelle function, and the role of stem cells in development. Cellular communication via chemical and electrical signals. The impact of miscommunication on diseases."],
      ["DNA and RNA: The code of Life", "Gene expression, protein synthesis, and the effects of mutations. Development of genetics from classical inheritance to modern gene editing. Discussing diseases linked to genetic errors."],
      ["Evolution: the greatest story ever told", "Natural selection, fossil evidence, and extinction patterns. Vestigial structures and atavisms as evolutionary remnants. Ongoing human evolution in response to environmental changes."],
      ["Brain and behavior", "Neuroplasticity, learning, and habit formation. The role of neurotransmitters in regulating emotions and behavior, including the impact of medications on brain chemistry."],
      ["Ecology: nature's internet", "Energy flows through photosynthesis and food webs. Interactions between species and the importance of microbiomes. Human-driven biodiversity loss and ecosystem resilience."],
      ["Immune system and health", "Immune system functions and interactions with circulatory and digestive systems. The effects of medications, toxins, and pathogens, including immune responses, vaccines, and autoimmune disorders."],
      ["Bioengineering and synthetic biology", "Genetic engineering applications in agriculture and medicine. Regenerative technologies and de-extinction efforts. Ethical and ecological implications of biological manipulation."],
      ["Extreme life: Breaking the rules of biology", "Organisms that have adapted to extreme environments. Behavioral manipulation by parasites, and regenerative capabilities. Unique adaptations like invisibility and biological immortality."],
    ],
  ],
  [
    "Natural Sciences & Research",
    "Physics & Research",
    "Core physical principles, including motion, energy, waves, and electromagnetism, linking them to technological systems and modern developments like computing and AI.",
    "This course introduces the fundamental principles of physics and their real-world applications. Core topics such as motion, energy, waves, and electromagnetism are explored alongside modern developments in computing and artificial intelligence. Emphasis is placed on connecting physical concepts with technological systems and natural phenomena, while the practice sharpens critical thinking and problem-solving skills.",
    [
      ["Forces and motion", "Displacement, velocity, and acceleration, as well as Newton's three laws. Examples include calculating trajectories, friction forces, tension forces, and equilibria."],
      ["Waves and vibrations", "Discussing the wave equation — relating speed, frequency, and wavelength — and exploring standing waves and resonance. Illustrations range from measuring wave speed on a stretched string to mapping resonant modes in an air column."],
      ["Fluids, heat & engines", "Covering molecular-kinetic theory and fluid properties like pressure and viscosity, with examples on air pressure. Examining heat transfer through spring-compression and heat-flow problems, concluding with why real engines fall short of Carnot efficiency."],
      ["Electricity fundamentals", "Starting from Ohm's law, Kirchhoff's circuit rules, and resistor networks, and moving to capacitance and RC charging dynamics. Examples involve designing a voltage divider and timing and filtering applications."],
      ["Magnetism & induction", "Discussing magnetic field generation, the Lorentz force on moving charges, and Faraday's and Lenz's laws. Case studies include calculating induced emf in generators and induction-cooktop stoves."],
      ["Optics and the nature of light", "Reflection, refraction, and lens equations in geometric optics, as well as diffraction and interference in wave optics. Understanding principles of cameras, eyewear, telescopes, and resolution limits."],
      ["Space exploration", "Exploring lift generation via airflow over wings. Examining gravity law to derive orbital and escape velocities, and showing how these principles enable satellite launches and interplanetary journeys."],
      ["The physics of computing and AI", "Diving into semiconductor band theory, p-n junction behavior, and transistor switching, followed by thermal effects like Joule heating. Examples include digital circuit foundations and heat-sink performance challenges."],
    ],
  ],
  [
    "Business, Social & Decision Sciences",
    "Human Behavior & Society",
    "Explaining human thought and action through bio-psycho-social lenses, decision-making, social influence, and media literacy.",
    "A practical course on why people think, feel, and act as they do—and how groups, culture, media, and institutions shape everyday life. Students learn bio-psycho-social lenses, decision-making, emotions, motivation, and well-being, social influence, communication/media literacy, and civic systems, with a forward-looking module on persuasive technology, digital well-being, and AI.",
    [
      ["Foundations of Human Behavior & Society", "Introduce bio-psycho-social model; show how one behavior can be explained through multiple lenses; discuss correlation vs. causation and basic ethics. What makes a researchable question; description vs. explanation vs. prediction; basic observational methods."],
      ["Development, Identity, and Culture", "Identity dimensions (roles, interests, social identities); context-dependent self; peer and family influences. Culture and subculture; explicit vs. implicit norms; cultural relativism and respectful comparison."],
      ["Thinking and Decision-Making", "Common heuristics and biases; benefits and pitfalls; quick perception demos embedded. Motivation, incentives, trade-offs; basics of “choice architecture” to support better decisions."],
      ["Emotions, Motivation, and Well-Being", "Emotion patterns; regulation strategies (reappraisal, problem-solving, situation selection); when different strategies fit best. Types of motivation, psychological needs and well-being, mindsets and goals, sustaining motivation."],
      ["Social Influence and Group Dynamics", "How social proof, normative pressure, and authority operate; respectful dissent techniques. Cooperation basics; diffusion of responsibility; signals that increase helping."],
      ["Communication, Media, and Technology", "Active listening skills, “I” statements, reframing, repairing misunderstandings. Source evaluation, evidence checks, emotional triggers, algorithms and feeds."],
      ["Institutions, Inequality, and Civic Life", "Institutions (school, local govt, health); policy impacts on different groups; equity vs. equality. Levels of civic action (inform, volunteer, advocate); effective messaging; local pathways for youth impact."],
      ["Behavior, Technology, and the Future", "New frontiers where human behavior meets emerging technology and design—how persuasive systems shape choices, ethical influence, and practical digital well-being."],
    ],
  ],
  [
    "Business, Social & Decision Sciences",
    "Innovation & Design Thinking",
    "Full human-centered design cycle—empathize, define, ideate, prototype, test—to turn needs into tested solutions, including AI-assisted design.",
    "A hands-on, human-centered design course where students turn real needs into tested solutions. Learners practice the full cycle—empathize, define, ideate, prototype, test—translate research into personas and journey maps, prioritize with clear criteria, and communicate ideas through storytelling and visual clarity. Systems, feasibility, and sustainability, culminating in a deep dive on AI-assisted and data-informed design (prompting, quality control, simple metrics/A/B tests, and ethics).",
    [
      ["Design mindset and problem framing", "Innovation vs. invention; design thinking phases (empathize, define, ideate, prototype, test); mindsets (curiosity, bias to action, iteration, user-centered, collaboration). Defining the problem vs. leaping to solutions; writing strong “How Might We” (HMW) statements; scope (too broad vs. too narrow); success criteria."],
      ["Understanding users and context", "Interviewing, observation, and simple surveys; asking non-leading questions; research ethics and consent; capturing notes effectively. Observations vs. insights; creating lightweight personas; journey mapping (stages, pain points, moments of truth)."],
      ["Ideation and creative problem-solving", "Brainstorming rules; SCAMPER, analogies, role-storming, constraint-based creativity; avoiding fixation. Decision criteria (impact, feasibility, novelty, alignment); dot voting, 2x2 matrices, simple decision grids; documenting concept rationale."],
      ["Prototyping and testing", "Low vs. high fidelity; storyboards, paper interfaces, role-play, Wizard-of-Oz; choosing materials; when to increase fidelity. Test plans (tasks, success criteria); minimizing bias (think-aloud, neutral prompts); simple metrics (task completion, time, error count); turning feedback into changes."],
      ["Systems, feasibility, and sustainability", "Stakeholders, dependencies, bottlenecks; cause-effect loops; constraints as design inputs; risk and assumption mapping. DFV triad; lifecycle thinking; circular design basics; ethical considerations and unintended consequences."],
      ["Communication, storytelling, and visual thinking", "Story arcs (problem-solution-impact); tailoring to audience; crafting a value proposition; live demo tips; handling Q&A. Visual hierarchy, contrast, alignment, proximity; typography basics; accessible color contrast and alt text; simple diagrams."],
      ["Planning, collaboration, and entrepreneurship basics", "Goals and milestones; Kanban and WIP limits; role clarity; feedback cycles and retrospectives; conflict resolution basics. Value propositions, customer segments, channels, MVPs; simple experiments; unit-cost awareness; metrics that matter."],
      ["AI-assisted and data-informed design — deep dive", "What AI is good at (and not). Tool landscape with examples. Prompt patterns for quality. Design workflows end-to-end (concrete examples). Quality control and IP/ethics. Choosing meaningful metrics. Instrumentation basics. Rapid experiments (A/B and beyond). Responsible AI in deployment. Lightweight AI implementation patterns."],
    ],
  ],
  [
    "Business, Social & Decision Sciences",
    "Business & Entrepreneurship",
    "Market principles, supply and demand laws, cost classification, and essential tools for planning, pitching, and funding new ventures.",
    "A practical course on how markets work and how to build ventures: students use simple graphs and real cases to apply the laws of supply and demand across market structures, and use cost classification to make smarter pricing and resource decisions—while seeing how entrepreneurs and innovation drive growth. Learners apply decision tools (Business Model Canvas, personas/journey maps, decision trees, prioritization, SWOT), explore startup investment types and what investors seek, master pitching and funding rounds, and practice revenue models, budgeting, and breakeven.",
    [
      ["Law of supply & demand and real-world market shifts", "The law of supply and demand (drawing simple demand and supply curves) and how it determines prices in a market (market equilibrium). Apply supply and demand to current events. Understand how price changes are affected by various factors. Recent examples of price change."],
      ["Understanding market types and the laws of supply and demand", "Different types of markets—including perfect competition, monopolistic competition, oligopoly, and monopoly—and examines how the laws of supply and demand operate within each. How market structure affects pricing, competition, and consumer behavior. How shifts in supply and demand influence equilibrium price and quantity in various market settings (real-world examples and simple graphs)."],
      ["Understanding cost classification: The key to smart business decisions", "Total, fixed, variable, average (AC, AFC, AVC), marginal cost and their graph interpretation. Through real-life examples and simple activities, students will discover how understanding costs helps companies price products, manage resources, and make smarter financial decisions."],
      ["What is an entrepreneur?", "Discuss the role of entrepreneurs in a market economy and their impact on innovation and growth. The influence of innovation and entrepreneurs on economics (increasing productivity, starting new businesses, creating jobs directly and indirectly, innovation fosters competition, pushing existing firms to improve, entrepreneurs often disrupt traditional sectors, create entirely new markets or demand)."],
      ["Planning a business decision", "Use a different method (Business Model Canvas, Customer Personas and Journey Maps, decision trees, Prioritization Matrices, SWOT Analysis) to explore potential outcomes in starting or growing a business."],
      ["Key Forms of Startup Investment & What Investors Look For", "Primary types of investment, real-world examples and short profiles of each investment type. The role of each investor, the capital they typically provide, and the expectations they hold for returns. How investors profit from startups and what makes a startup idea attractive to potential investors."],
      ["From idea to investment: mastering the art of pitching", "Standard structure of a successful pitch: presenting the problem, the innovative solution, market size, business model, competitive advantage, and finally, the funding request or “ask.” Understanding of startup funding rounds (Pre-seed and Seed Funding, Series A, Series B and Beyond). How the amount of money raised, company valuation, investor expectations grow with each funding round."],
      ["Revenue models and budgeting", "Main monetization models: subscriptions, freemium, one-time payment, etc. Students will learn about cost structures, create a simple budget, and calculate a breakeven point for their projects."],
    ],
  ],
];

const BASE_FIELDS = [
  "id", "provider", "provider_label", "program_type", "title", "raw_title",
  "subject", "categories", "location", "city", "country", "age_ranges",
  "duration", "delivery_modes", "price", "dates", "date_months",
  "description_short", "description_full", "curriculum_sections",
  "learning_outcomes", "image_url", "detail_url", "source_url",
  "source_files", "flags", "publish_status",
];

const slugify = (value) =>
  value.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "program";

const emptyPrice = () => ({ currency: "", min_amount: null, max_amount: null, display: "", tiers: [] });

const CAMP_PRICE = {
  currency: "EUR",
  min_amount: 4600,
  max_amount: 4600,
  display: "€4,600",
  tiers: [{ label: "Program fee", currency: "EUR", amount: 4600, display: "€4,600" }],
};
const CAMP_DATES = ["25 July – 5 August"];

function buildRecords() {
  return COURSES.map(([cluster, title, short, description, topics]) => {
    const topicsBody = topics.map(([name, body]) => `${name}: ${body}`).join(" • ");
    return {
      id: `constructor-university-summer-camp-${slugify(title)}`,
      provider: "constructor_university",
      provider_label: "Constructor University Summer Camp",
      operating_institution: "Constructor University (Constructor Talent School)",
      program_type: "constructor_university_course",
      title,
      raw_title: title,
      subject: title,
      categories: [cluster, "Summer Camp course", "Choose 2 of 9 courses"],
      location: "Bremen, Germany",
      city: "Bremen",
      country: "Germany",
      age_ranges: ["16-18"],
      duration: "12 days",
      delivery_modes: ["in_person"],
      price: CAMP_PRICE,
      price_scope: "camp_wide_not_course_specific",
      price_note:
        "Price is for the whole 12-day camp (not per course) and covers tuition, accommodation, meal plan, excursions & activities, domestic transportation, and mentorship/supervision. It does not cover visa fees, airline tickets, health insurance, or pocket money.",
      dates: CAMP_DATES,
      date_months: [],
      description_short: short,
      description_full: description,
      curriculum_sections: [{ title: "Topics", body: topicsBody }],
      learning_outcomes: [],
      image_url: IMAGE_URL,
      detail_url: DETAIL_URL,
      source_url: DETAIL_URL,
      source_files: SOURCE_FILES,
      flags: [
        "shared_catalogue_page_no_detail_url",
        "choose_2_of_9_courses",
      ],
    };
  });
}

function addPublishStatus(programs) {
  const blocking = new Set([
    "missing_age", "missing_price", "missing_dates", "not_summer",
    "likely_out_of_scope", "grades_only_no_age_range",
    "current_age_unpublished", "current_price_unpublished", "current_dates_unpublished",
  ]);
  for (const p of programs) {
    const flags = new Set(p.flags || []);
    const missing =
      !p.title || !p.provider || !p.location || !p.description_full || !p.detail_url ||
      (!(p.age_ranges || []).length && !(p.grade_ranges || []).length) ||
      !(p.price && p.price.min_amount) ||
      (!(p.dates || []).length && !(p.date_months || []).length);
    p.publish_status = missing || [...flags].some((f) => blocking.has(f)) ? "needs_review" : "ready";
  }
}

function ensureSchema(programs) {
  for (const p of programs) {
    for (const field of BASE_FIELDS) {
      if (!(field in p)) throw new Error(`${p.id}: missing schema field ${field}`);
    }
  }
}

function mergeIntoMain(newRecords) {
  const existing = JSON.parse(readFileSync(MAIN_DATA, "utf8"));
  const kept = existing.filter((p) => p.provider !== "constructor_university");
  const merged = [...kept, ...newRecords];
  writeFileSync(MAIN_DATA, JSON.stringify(merged, null, 2) + "\n", "utf8");
  return { previous_total: existing.length, removed_old_constructor: existing.length - kept.length, new_total: merged.length };
}

function main() {
  const records = buildRecords();
  addPublishStatus(records);
  ensureSchema(records);
  records.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  const ids = records.map((r) => r.id);
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (dupes.length) throw new Error(`duplicate ids: ${dupes.join(", ")}`);

  writeFileSync(join(OUT_DIR, "constructor.normalized.json"), JSON.stringify(records, null, 2) + "\n", "utf8");

  const mergeStats = mergeIntoMain(records);
  const statusCounts = records.reduce((acc, r) => ((acc[r.publish_status] = (acc[r.publish_status] || 0) + 1), acc), {});

  console.log(JSON.stringify({ total_constructor_records: records.length, publish_status: statusCounts, merge: mergeStats }));
}

main();
