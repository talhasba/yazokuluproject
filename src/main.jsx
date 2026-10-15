import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import CatalogueApp from "./catalogue/CatalogueApp.jsx";
import "../style.css";
import "../home-page.css";
import "../catalogue-cleanup.css";
import "../program-page.css";
import "../palette.css";
import "../about-page.css";
import "../background-rays.css";
import "../home-page.js";
import "../program-page.js";
import "../about-page.js";
import "../seo.js";

const route = window.location.pathname.replace(/\/+$/, "") || "/";
if (route === "/programs") {
  const root = document.getElementById("root");
  if (root) createRoot(root).render(<StrictMode><CatalogueApp /></StrictMode>);
}
