/** @type {import('tailwindcss').Config} */
const defaultTheme = require("tailwindcss/defaultTheme");
const treasureTheme = require("@treasure-project/tailwind-config");

const colors = treasureTheme.theme.extend.colors;

module.exports = {
  content: ["./app/**/*.{ts,tsx,jsx,js}"],
  presets: [require("@treasure-project/tailwind-config")],
  theme: {
    extend: {
      gridTemplateAreas: {
        "nft-modal": [
          "header header header header header",
          "misc misc misc misc selection",
          "nft nft nft nft selection",
          "nft nft nft nft selection",
          "nft nft nft nft selection",
        ],
        "nft-modal-viewonly": [
          "header header header header header",
          "misc misc misc misc misc",
          "nft nft nft nft nft",
          "nft nft nft nft nft",
          "nft nft nft nft nft",
        ],
        "nft-modal-mobile": [
          "header header header header header",
          "misc misc misc misc misc",
          "nft nft nft nft nft",
          "nft nft nft nft nft",
          "selection selection selection selection selection",
        ],
      },
      boxShadow: {
        glow: "0px 0px 120px rgba(31, 45, 69, 0.5)",
      },
      colors: {
        border: "#282F3D",
        // input: "hsl(var(--input))",
        ring: colors.night[1000],
        background: colors.night[1200],
        backgroundImage: {
          "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        },
        foreground: "#ffffff",
        primary: {
          DEFAULT: colors.ruby[900],
          foreground: "#ffffff",
        },
        input: "#404652",
        secondary: {
          DEFAULT: colors.night[800],
          foreground: "#ffffff",
        },
        muted: {
          DEFAULT: colors.night[1200],
          foreground: colors.night[300],
        },
        accent: {
          DEFAULT: colors.night[900],
          foreground: colors.night[300],
        },
        popover: {
          DEFAULT: colors.night[1100],
          foreground: colors.night[400],
        },
        // card: {
        //   DEFAULT: "hsl(var(--card))",
        //   foreground: "hsl(var(--card-foreground))",
        // },
      },
      fontFamily: {
        sans: ["Whyte", ...defaultTheme.fontFamily.sans],
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
        "rotate-45": {
          "100%": {
            transform: "rotate(180deg)",
          },
        },
        "toast-enter": {
          "0%": { transform: "scale(0.9)", opacity: 0 },
          "100%": { transform: "scale(1)", opacity: 1 },
        },
        "toast-leave": {
          "0%": { transform: "scale(1)", opacity: 1 },
          "100%": { transform: "scale(0.9)", opacity: 0 },
        },
      },
      animation: {
        "toast-enter": "toast-enter 200ms ease-out",
        "toast-leave": "toast-leave 150ms ease-in forwards",
        "accordion-down": "accordion-down 0.5s ease-out",
        "accordion-up": "accordion-up 0.5s ease-out",
        "rotate-45": "rotate-45 0.5s ease-out",
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    require("@savvywombat/tailwindcss-grid-areas"),
    require("tailwind-scrollbar")({ nocompatible: true }),
  ],
};
