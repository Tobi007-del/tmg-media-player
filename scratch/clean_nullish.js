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

  const lines = content.split('\n');
  let newLines = [];
  
  let getValueCount = 0;
  let bracketDepth = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.includes('{')) bracketDepth++;
    if (line.includes('}')) bracketDepth--;
    
    if (line.trim().startsWith('id:')) {
      getValueCount = 0; // reset for new object
    }
    
    if (line.includes('getValue:')) {
      getValueCount++;
      if (getValueCount > 1) {
        console.log(`Found duplicate getValue in ${file}:${i+1}`);
        // Let's remove the first one? No, if we see a duplicate, it means the LAST one we added was 'getValue: () => "Customize",'.
        // If it's a duplicate, we should keep the original one and remove the "Customize" one!
        if (line.includes('() => "Customize"')) {
           changed = true;
           continue; // skip the Customize one
        } else {
           // wait, what if the previous one was the Customize one?
        }
      }
    }
    
    newLines.push(line);
  }
  
  if (changed) {
    fs.writeFileSync(file, newLines.join('\n'));
    console.log("Fixed duplicates in", file);
  }
}
