import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime"],
  },
  optimizeDeps: {
    // Pre-bundle everything up front so Vite never re-optimizes mid-session,
    // which mixes stale and fresh React chunks ("Cannot read properties of null (reading 'useRef')").
    include: [
      "react", "react-dom", "react-dom/client", "react/jsx-runtime",
      "firebase/app", "firebase/auth", "firebase/firestore", "firebase/storage", "firebase/analytics",
      "@tanstack/react-query", "react-router-dom", "lucide-react", "sonner", "next-themes",
      "react-markdown", "recharts", "date-fns", "clsx", "tailwind-merge", "class-variance-authority",
      "cmdk", "vaul", "input-otp", "embla-carousel-react", "react-day-picker", "react-hook-form",
      "react-resizable-panels", "pdfjs-dist", "mammoth",
      "@radix-ui/react-accordion", "@radix-ui/react-alert-dialog", "@radix-ui/react-aspect-ratio",
      "@radix-ui/react-avatar", "@radix-ui/react-checkbox", "@radix-ui/react-collapsible",
      "@radix-ui/react-context-menu", "@radix-ui/react-dialog", "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-hover-card", "@radix-ui/react-label", "@radix-ui/react-menubar",
      "@radix-ui/react-navigation-menu", "@radix-ui/react-popover", "@radix-ui/react-progress",
      "@radix-ui/react-radio-group", "@radix-ui/react-scroll-area", "@radix-ui/react-select",
      "@radix-ui/react-separator", "@radix-ui/react-slider", "@radix-ui/react-slot",
      "@radix-ui/react-switch", "@radix-ui/react-tabs", "@radix-ui/react-toast",
      "@radix-ui/react-toggle", "@radix-ui/react-toggle-group", "@radix-ui/react-tooltip",
    ],
  },
}));
