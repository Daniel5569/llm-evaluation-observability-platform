import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#111827",
        muted: "#667085",
        panel: "#ffffff",
        line: "#d9e0ea",
        wash: "#f4f7fb",
        brand: "#0f766e",
        "brand-soft": "#d9f4ee"
      },
      boxShadow: {
        panel: "0 1px 2px rgba(16, 24, 40, 0.05)"
      }
    }
  },
  plugins: []
};

export default config;
