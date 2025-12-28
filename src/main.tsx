import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./lib/i18n";

// Claude Tool Use 시스템 초기화 (Feature Flag로 제어)
if (import.meta.env.VITE_FEATURE_TOOL_USE === 'true') {
  import('@/lib/claude/tools').then(({ registerAllTools }) => {
    registerAllTools();
    console.log('[App] Tool Use 기능 활성화됨');
  });
}

createRoot(document.getElementById("root")!).render(<App />);
