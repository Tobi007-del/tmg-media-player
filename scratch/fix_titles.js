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
let totalUpdated = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  const lines = content.split('\n');
  let newLines = [];
  
  let currentWidget = null;
  let widgetLinesStack = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Naive block tracking for widget
    if (line.includes('{')) {
      widgetLinesStack.push(null);
    }
    
    const widgetMatch = line.match(/widget:\s*("[^"]+"|'[^']+'|`[^`]+`|\w+)( as const)?,?/);
    if (widgetMatch) {
      widgetLinesStack[widgetLinesStack.length - 1] = widgetMatch[1].replace(/["']/g, '');
    }
    
    if (line.includes('infoHTML:')) {
      const activeWidget = widgetLinesStack.slice().reverse().find(w => w !== null);
      if (activeWidget !== "group") {
        // Replace infoHTML with title and strip <small> tags
        // Handle function case: `infoHTML: () => { ... return "<small>...</small>"; }`
        // Handle string case: `infoHTML: "<small>...</small>",`
        
        const stringMatch = line.match(/infoHTML:\s*["'`]<small>(.*?)<\/small>["'`]?,?/);
        if (stringMatch) {
          const rawText = stringMatch[1];
          newLines.push(line.replace(stringMatch[0], `title: "${rawText}",`));
          changed = true;
          if (line.includes('}')) widgetLinesStack.pop();
          continue;
        } else if (line.includes('() =>')) {
           // For function cases, we just rename infoHTML to title. The user can strip tags manually if needed, or we just leave the HTML in if it's a function.
           // Actually the user just said "make them titles". But they have <small> tags.
           // Let's see if there are function cases. Only captions/menu.ts has a function case.
           console.log("Skipping function case in", file, ":", line.trim());
        } else {
           console.log("Unhandled infoHTML string in", file, ":", line.trim());
        }
      } else {
         console.log("Skipping group widget infoHTML in", file);
      }
    }
    
    newLines.push(line);
    
    if (line.includes('}')) {
      widgetLinesStack.pop();
    }
  }
  
  if (changed) {
    fs.writeFileSync(file, newLines.join('\n'));
    console.log("Updated", file);
    totalUpdated++;
  }
}

console.log("Total files updated:", totalUpdated);
