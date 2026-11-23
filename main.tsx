import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { config } from "@fortawesome/fontawesome-svg-core";
import "./index.css";
import App from "./App";

// Font Awesome's CSS is bundled through index.css (in the base layer),
// so don't inject it again at runtime.
config.autoAddCss = false;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
