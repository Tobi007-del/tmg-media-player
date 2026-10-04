import fs from 'fs';
import path from 'path';

const SRC_DIR = path.resolve('src/ts');
// Put the schema outside the src directory so it doesn't break the build or slow down the editor!
const SCHEMA_FILE = path.resolve('schema-reference.d.ts');

function getFiles(dir, ext = '.ts') {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFiles(file, ext));
    } else if (file.endsWith(ext)) {
      results.push(file);
    }
  });
  return results;
}

const tsFiles = getFiles(SRC_DIR).filter(f => f.endsWith('.ts'));

let settingsProps = [];
let stateProps = [];

function extractInterfaces(content, name) {
  const results = [];
  const regex = name === 'Settings' ? /interface\s+Settings\s*\{/g : /interface\s+(?:RuntimeState|CtlrState)\s*\{/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    let braceCount = 1;
    let i = match.index + match[0].length;
    let start = i;
    while (i < content.length && braceCount > 0) {
      if (content[i] === '{') braceCount++;
      if (content[i] === '}') braceCount--;
      i++;
    }
    if (braceCount === 0) {
      results.push(content.substring(start, i - 1).trim());
    }
  }
  return results;
}

for (const file of tsFiles) {
  const content = fs.readFileSync(file, 'utf-8');
  
  extractInterfaces(content, 'Settings').forEach(props => {
    if (props) settingsProps.push(props);
  });
  
  extractInterfaces(content, 'RuntimeState|CtlrState').forEach(props => {
    if (props) stateProps.push(props);
  });
}


let extraDefs = [];
for (const file of tsFiles) {
  if (file.endsWith('types.ts') || file.endsWith('generics.d.ts')) {
     const content = fs.readFileSync(file, 'utf-8');
     let cleanContent = content.replace(/import\s+.*?;\n/g, '');
     cleanContent = cleanContent.replace(/declare\s+module.*?\{[\s\S]*?\n\}/g, '');
     extraDefs.push(cleanContent.trim());
  }
}

const schemaContent = `// AUTO-GENERATED SCHEMA FOR TMG MEDIA PLAYER
// This file consolidates the distributed type augmentations across the codebase.
// Use this as a reference for the full structure of the Controller's Config and State.

export interface CtlrConfig {
  id: string;
  media?: any;
  settings: Settings;
  actions: any;
  devMode: boolean;
  disabled: boolean;
  courtesy: string;
  safeDetach: boolean;
  noPlugList: any;
}

export interface Settings {
${settingsProps.map(s => '  ' + s).join('\n')}
}

export interface CtlrState {
${stateProps.map(s => '  ' + s).join('\n')}
}

export interface MockController {\n  media: CtlrMedia;
  config: CtlrConfig;
  state: CtlrState;
}

// --- Nested Types & Interfaces ---

${extraDefs.filter(d => d.length > 0).join('\n\n')}
`;

// Remove the old buggy schema file from src if it exists
const oldSchemaPath = path.resolve('src/ts/types/schema.d.ts');
if (fs.existsSync(oldSchemaPath)) {
  fs.unlinkSync(oldSchemaPath);
}

fs.writeFileSync(SCHEMA_FILE, schemaContent);
console.log('Schema generated at ' + SCHEMA_FILE);

