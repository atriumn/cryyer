import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import tailwindcss from "@tailwindcss/vite";
import vercel from "@astrojs/vercel";

export default defineConfig({
  site: "https://cryyer.dev",
  adapter: vercel(),
  vite: {
    plugins: [tailwindcss()],
  },
  integrations: [
    starlight({
      title: "Cryyer",
      logo: {
        src: "./src/assets/logo.png",
        replacesTitle: true,
      },
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/jyoung/cryyer",
        },
      ],
      customCss: ["./src/styles/global.css"],
      sidebar: [
        { label: "Getting Started", slug: "getting-started" },
        {
          label: "Configuration",
          items: [
            { label: "Product Config", slug: "configuration/product-config" },
            {
              label: "Environment Variables",
              slug: "configuration/environment",
            },
          ],
        },
        {
          label: "Subscriber Stores",
          items: [
            { label: "Overview", slug: "subscriber-stores" },
            { label: "JSON File", slug: "subscriber-stores/json" },
            { label: "Supabase", slug: "subscriber-stores/supabase" },
            {
              label: "Google Sheets",
              slug: "subscriber-stores/google-sheets",
            },
          ],
        },
        {
          label: "LLM Providers",
          items: [
            { label: "Overview", slug: "llm-providers" },
            { label: "Anthropic", slug: "llm-providers/anthropic" },
            { label: "OpenAI", slug: "llm-providers/openai" },
            { label: "Gemini", slug: "llm-providers/gemini" },
          ],
        },
        { label: "MCP Server", slug: "mcp-server" },
        {
          label: "GitHub Actions",
          items: [
            { label: "Overview", slug: "github-actions" },
            { label: "Weekly Draft", slug: "github-actions/weekly-draft" },
            { label: "Send Update", slug: "github-actions/send-update" },
            { label: "CI", slug: "github-actions/ci" },
          ],
        },
        { label: "Development", slug: "development" },
      ],
    }),
  ],
});
