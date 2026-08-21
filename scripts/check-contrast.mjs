/**
 * WCAG contrast audit for the design tokens in src/app/globals.css.
 * Run: node scripts/check-contrast.mjs
 * Body text must clear 4.5:1; large text / UI borders must clear 3:1.
 */
const hex = (h) => {
  const s = h.replace("#", "");
  const n = s.length === 3 ? s.split("").map((c) => c + c).join("") : s;
  return [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16));
};
const lum = (h) => {
  const [r, g, b] = hex(h).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};

const LIGHT = {
  bg: "#f2f0ea", surface: "#ffffff", surface2: "#f7f5f0", surface3: "#ebe8e0",
  text: "#1b1a17", text2: "#5c584f", text3: "#7a756a",
  brass: "#8a6114", brassSoft: "#f6ecd8", brassFill: "#8a6114",
  teal: "#0f6a67", tealSoft: "#ddf0ef", tealFill: "#0f6a67",
  rust: "#ad2317", rustSoft: "#fbe4e1", rustFill: "#ad2317",
  green: "#1a6b38", greenSoft: "#dff0e4", greenFill: "#1a6b38",
  purple: "#63459a", purpleSoft: "#ece4f8", purpleFill: "#63459a",
  onFill: "#ffffff",
};
const DARK = {
  bg: "#121110", surface: "#1f1e1b", surface2: "#2a2825", surface3: "#353330",
  text: "#f6f4ef", text2: "#b3aea4", text3: "#948f85",
  brass: "#e5ac57", brassSoft: "#3a2f18", brassFill: "#6b4a0e",
  teal: "#59cfc9", tealSoft: "#16332f", tealFill: "#0b4f4d",
  rust: "#ff9184", rustSoft: "#3d201c", rustFill: "#8c1a10",
  green: "#6fd68d", greenSoft: "#1b3323", greenFill: "#14522b",
  purple: "#c1a8f2", purpleSoft: "#2c2440", purpleFill: "#4a3376",
  onFill: "#ffffff",
};

const pairs = (T) => [
  ["text / surface", T.text, T.surface, 4.5],
  ["text / bg", T.text, T.bg, 4.5],
  ["text / surface2", T.text, T.surface2, 4.5],
  ["text / surface3", T.text, T.surface3, 4.5],
  ["text2 / surface", T.text2, T.surface, 4.5],
  ["text2 / bg", T.text2, T.bg, 4.5],
  ["text2 / surface3", T.text2, T.surface3, 4.5],
  ["text3 / surface (secondary UI, 3:1)", T.text3, T.surface, 3],
  ["brass / surface", T.brass, T.surface, 4.5],
  ["brass / brassSoft", T.brass, T.brassSoft, 4.5],
  ["teal / surface", T.teal, T.surface, 4.5],
  ["teal / tealSoft", T.teal, T.tealSoft, 4.5],
  ["rust / surface", T.rust, T.surface, 4.5],
  ["rust / rustSoft", T.rust, T.rustSoft, 4.5],
  ["green / surface", T.green, T.surface, 4.5],
  ["green / greenSoft", T.green, T.greenSoft, 4.5],
  ["purple / surface", T.purple, T.surface, 4.5],
  ["purple / purpleSoft", T.purple, T.purpleSoft, 4.5],
  ["onFill / brassFill", T.onFill, T.brassFill, 4.5],
  ["onFill / tealFill", T.onFill, T.tealFill, 4.5],
  ["onFill / rustFill", T.onFill, T.rustFill, 4.5],
  ["onFill / greenFill", T.onFill, T.greenFill, 4.5],
  ["onFill / purpleFill", T.onFill, T.purpleFill, 4.5],
];

let fails = 0;
for (const [name, T] of [["LIGHT", LIGHT], ["DARK", DARK]]) {
  console.log(`\n── ${name} ──`);
  for (const [label, fg, bg, min] of pairs(T)) {
    const r = ratio(fg, bg);
    const ok = r >= min;
    if (!ok) fails++;
    console.log(
      `${ok ? "PASS" : "FAIL"}  ${r.toFixed(2).padStart(6)}:1  (min ${min})  ${label}`
    );
  }
}
console.log(fails === 0 ? "\nAll pairs pass.\n" : `\n${fails} failing pair(s).\n`);
process.exit(fails === 0 ? 0 : 1);
