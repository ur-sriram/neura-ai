import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        border: "hsl(var(--border))",
        panel: "hsl(var(--panel))",
        muted: "hsl(var(--muted))",
        accent: "hsl(var(--accent))",
        warning: "hsl(var(--warning))",
        danger: "hsl(var(--danger))"
      },
      boxShadow: {
        command: "0 18px 50px rgba(22, 35, 43, 0.12)"
      }
    }
  },
  plugins: []
};

export default config;

