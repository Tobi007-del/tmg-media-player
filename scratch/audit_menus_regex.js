import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.resolve(__dirname, "../../src/ts/plugs/menus/settings");

const files = fs.readdirSync(dir).filter(f => f.endsWith(".ts"));

let errors = [];

files.forEach(f => {
  const code = fs.readFileSync(path.join(dir, f), "utf8");
  
  // 1. Check for tipHtml (should be tipHTML)
  if (/tipHtml/i.test(code) && !/tipHTML/.test(code)) {
    // Actually just check if tipHtml is used instead of tipHTML
    const m = code.match(/tipHtml\s*:/);
    if (m) errors.push(`[${f}] Found 'tipHtml' instead of 'tipHTML'`);
  }
  
  // 2. Check for id: "general" when there are limits widgets inside
  if (code.includes('widget: "limits"') && code.includes('id: "general"')) {
    errors.push(`[${f}] Found 'widget: "limits"' inside 'id: "general"'`);
  }

  // 3. Check for getOptions vs getValue mismatch
  // Normally if getOptions returns strings, getValue should return strings.
  
  // 4. Duplicate IDs in the file
  const idMatches = [...code.matchAll(/id:\s*["']([^"']+)["']/g)];
  const ids = new Set();
  idMatches.forEach(m => {
    if (ids.has(m[1])) {
      errors.push(`[${f}] Duplicate ID found: ${m[1]}`);
    }
    ids.add(m[1]);
  });
  
  // 5. Redundant disable text
  if (/label:\s*["']Disable [a-zA-Z\s]+["']/.test(code)) {
    const m = code.match(/label:\s*["']Disable [a-zA-Z\s]+["']/);
    errors.push(`[${f}] Redundant Disable text: ${m[0]}`);
  }
});

console.log(JSON.stringify(errors, null, 2));
