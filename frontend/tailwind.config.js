/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "chat-bg": "#343541",
        "sidebar-bg": "#202123",
        "chat-input": "#40414F",
        "assistant-bg": "#444654",
        "button-green": "#10a37f",
        "button-green-hover": "#1a7f64",
      },
      zIndex: {
        100: "100",
      },
    },
  },
  plugins: [],
};
