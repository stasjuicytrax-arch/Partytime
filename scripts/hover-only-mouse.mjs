// Прячет правила с :hover под @media (hover: hover): на телефоне подсветка не «залипает» после тапа.
// Селекторы без :hover из того же правила (например :focus-visible) остаются снаружи.
// Запуск: node scripts/hover-only-mouse.mjs src/styles/a.css src/styles/b.css ...
import fs from "node:fs";
import postcss from "postcss";

const inHoverMedia = (node) => { for (let p = node.parent; p; p = p.parent) if (p.type === "atrule" && /hover\s*:\s*hover/.test(p.params)) return true; return false; };
for (const file of process.argv.slice(2)) {
  const root = postcss.parse(fs.readFileSync(file, "utf8"), { from: file });
  let n = 0;
  root.walkRules((rule) => {
    if (!rule.selector.includes(":hover") || inHoverMedia(rule) || rule.parent?.type === "atrule" && /keyframes/.test(rule.parent.name)) return;
    const hov = rule.selectors.filter((s) => s.includes(":hover")), rest = rule.selectors.filter((s) => !s.includes(":hover"));
    const media = postcss.atRule({ name: "media", params: "(hover: hover)" });
    const inner = rule.clone({ selectors: hov });
    media.append(inner);
    if (rest.length) { rule.selectors = rest; rule.after(media); }
    else rule.replaceWith(media);
    n++;
  });
  fs.writeFileSync(file, root.toString());
  console.log(file, n);
}
