// PRIMEIRO import: captura o hash de recovery antes do client do supabase apagá-lo.
import "./lib/recovery-capture";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
