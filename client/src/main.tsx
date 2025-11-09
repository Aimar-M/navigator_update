import { createRoot, hydrateRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { queryClient } from "@/lib/queryClient";
import { AuthProvider } from "@/hooks/use-auth";
import App from "./App";
import "./index.css";

const rootElement = document.getElementById("root")!;

// Check if the page was pre-rendered (has content in root)
const isPrerendered = rootElement.hasChildNodes();

const AppWrapper = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

if (isPrerendered) {
  // Hydrate pre-rendered content
  hydrateRoot(rootElement, <AppWrapper />);
  console.log('✅ Hydrated pre-rendered content');
} else {
  // Render normally (development or non-pre-rendered pages)
  createRoot(rootElement).render(<AppWrapper />);
}
