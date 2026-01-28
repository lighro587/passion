module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      boxShadow: {
        glow: "0 0 0 1px rgba(255,255,255,.08), 0 20px 60px rgba(0,0,0,.55)"
      }
    }
  },
  plugins: []
};
