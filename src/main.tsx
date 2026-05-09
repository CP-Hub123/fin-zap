import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { applyThemeOnLoad } from "./components/app/ThemeToggle";

applyThemeOnLoad();

createRoot(document.getElementById("root")!).render(<App />);
