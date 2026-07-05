import fs from 'fs';
import path from 'path';

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else if (file.endsWith('.ts')) { 
      results.push(file);
    }
  });
  return results;
}

const files = walk('./src/ts/plugs/settings');
let totalReplaced = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  // Replace `getValue: () => "",\n *infoText: "Customize",`
  // with `getValue: () => "Customize",`
  const regex1 = /getValue:\s*\(\)\s*=>\s*(""|''),\s*infoText:\s*"Customize",/g;
  if (regex1.test(content)) {
    content = content.replace(regex1, 'getValue: () => "Customize",');
    changed = true;
  }

  // Replace `infoText: "Customize",` when it stands alone
  const regex2 = /infoText:\s*"Customize",/g;
  if (regex2.test(content)) {
    content = content.replace(regex2, 'getValue: () => "Customize",');
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(file, content);
    console.log(`Updated ${file}`);
    totalReplaced++;
  }
}

console.log(`Total files updated: ${totalReplaced}`);
