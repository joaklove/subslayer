/** @type {import('tailwindcss').Config} */

// 与 src/lib/themes.ts 的 COLOR_SLOTS 一一对应，themes.test.ts 会校验两边不漂移。
const slots = [
  'primary', 'secondary', 'dark', 'light',
  'gray-300', 'gray-400', 'gray-500', 'gray-600', 'gray-700', 'gray-800', 'gray-900',
  'red-200', 'red-400', 'red-500', 'red-600', 'red-800', 'red-900',
  'green-400', 'green-500', 'green-700', 'green-800',
  'yellow-400', 'yellow-500', 'yellow-800',
  'blue-500', 'blue-600', 'blue-800',
  'purple-600', 'purple-900',
  'indigo-500', 'indigo-800',
  'orange-500', 'orange-800',
];

const themed = slots.reduce((acc, slot) => {
  const [family, shade] = slot.split('-');
  const value = `rgb(var(--c-${slot}) / <alpha-value>)`;
  if (shade) {
    acc[family] = { ...(acc[family] || {}), [shade]: value };
  } else {
    acc[family] = value;
  }
  return acc;
}, {});

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: themed,
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
