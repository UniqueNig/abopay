/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#0d1b3e",        // deep navy (Abopay brand)
        secondary: "#22c55e",      // bright green (Abopay brand)
        accent: "#16a34a",         // darker green accent
        naira: "#15803d",
        gold: "#f0a500",
        card: "#111d3c",           // dark navy card
        muted: "rgba(255,255,255,0.55)",
      },
      fontFamily: {
        syne: ["'Syne'", "sans-serif"],
        dm: ["'DM Sans'", "sans-serif"],
      },
      backgroundImage: {
        "hero-gradient": "linear-gradient(135deg, #0d1b3e 0%, #112244 60%, #0d1b3e 100%)",
        "card-gradient": "linear-gradient(135deg, #111d3c 0%, #1a2b5e 100%)",
        "green-glow": "radial-gradient(circle at 50% 50%, rgba(34,197,94,0.15) 0%, transparent 70%)",
      },
      screens: {
        xs: "480px",
        sm: "640px",
        md: "768px",
        lg: "1024px",
        xl: "1280px",
      },
    },
  },
  plugins: [],
};
