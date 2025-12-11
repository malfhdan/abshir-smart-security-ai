// Alternative PostCSS config if the above doesn't work
const tailwindcss = require('tailwindcss');
const autoprefixer = require('autoprefixer');

module.exports = {
  plugins: [
    tailwindcss('./tailwind.config.js'),
    autoprefixer,
  ],
}

