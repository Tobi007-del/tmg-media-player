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

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  // Let's replace any `infoText: "Customize"` that might be left.
  if (content.includes('infoText: "Customize"')) {
    console.log("Found infoText: Customize in", file);
    content = content.replace(/infoText:\s*"Customize",?/g, '');
    changed = true;
  }

  // Let's see if there's any `getValue: () => "Customize"` in a block that doesn't have `widget: "group"`.
  // To do this simply, if it's NOT a group, it shouldn't have `getValue: () => "Customize"`.
  // Wait, I can just find all blocks separated by `{` and `}` and check.
  
  // A simple way is to replace `getValue: () => "Customize"` with `getValue: () => ""`
  // if the block does NOT contain `widget: "group"`.
  // Since we don't have AST, let's just log every line with `getValue: () => "Customize"`
  // and the preceding `widget:` to see if any are wrong.
  
  const lines = content.split('\n');
  let lastWidget = null;
  let lastWidgetLine = -1;
  let newLines = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    const widgetMatch = line.match(/widget:\s*"([^"]+)"/);
    if (widgetMatch) {
      lastWidget = widgetMatch[1];
      lastWidgetLine = i;
    }
    
    if (line.includes('getValue: () => "Customize"')) {
      if (lastWidget !== "group" && i - lastWidgetLine < 10) {
        console.log(`Found Customize on non-group widget (${lastWidget}) in ${file}:${i+1}`);
        // Remove it or replace it!
        // We'll just remove the 'Customize' string from it.
        newLines.push(line.replace('() => "Customize"', '() => ""'));
        changed = true;
        continue;
      }
    }
    
    // Also, we noticed duplicate getValue in some places. Let's fix that if they are adjacent.
    // Actually, just logging them is fine.
    
    newLines.push(line);
  }
  
  if (changed) {
    fs.writeFileSync(file, newLines.join('\n'));
    console.log("Fixed", file);
  }
}
