import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Register service worker for PWA support
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((registration) => {
        console.log("[SW] Registered:", registration.scope);

        // Check for updates every 60 seconds
        setInterval(() => registration.update(), 60_000);

        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) return;
          newWorker.addEventListener("statechange", () => {
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              // New version available — you can show a toast here if needed
              console.log("[SW] New version available. Reload to update.");
            }
          });
        });
      })
      .catch((err) => console.error("[SW] Registration failed:", err));
  });
}

createRoot(document.getElementById("root")!).render(<App />);
