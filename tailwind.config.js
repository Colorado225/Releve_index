/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "toast-in": {
          "0%": { opacity: "0", transform: "translateY(10px) scale(.96)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        // Loader : chaque lettre sort du flou (modèle Framer « Animation loader »).
        "letter-in": {
          "0%": { opacity: "0", filter: "blur(10px)", transform: "translateY(10px)" },
          "100%": { opacity: "1", filter: "blur(0px)", transform: "translateY(0)" },
        },
        // Loader : barre indéterminée (durée de tâche inconnue).
        "bar-slide": {
          "0%": { transform: "translateX(-110%)" },
          "100%": { transform: "translateX(320%)" },
        },
      },
      animation: {
        "fade-up": "fade-up .3s ease-out both",
        "toast-in": "toast-in .22s cubic-bezier(.2,.9,.3,1.2) both",
        "letter-in": "letter-in .6s cubic-bezier(.2,.9,.3,1.05) both",
        "bar-slide": "bar-slide 1.15s cubic-bezier(.65,0,.35,1) infinite",
      },
    },
  },
  plugins: [],
};