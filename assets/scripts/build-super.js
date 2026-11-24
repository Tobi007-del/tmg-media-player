import fs from 'fs';
import path from 'path';

const SRC_DIR = path.resolve('src/ts');
const SUPER_DIR = path.join(SRC_DIR, 'super');

function getDirectories(srcPath) {
  return fs.existsSync(srcPath) ? fs.readdirSync(srcPath).filter(file => fs.statSync(path.join(srcPath, file)).isDirectory()) : [];
}

function getFiles(srcPath, ext = '.ts') {
  return fs.existsSync(srcPath) ? fs.readdirSync(srcPath).filter(file => fs.statSync(path.join(srcPath, file)).isFile() && file.endsWith(ext) && file !== 'z-register.ts' && file !== 'index.ts') : [];
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function writeSuper(filePath, content) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content);
}

// 1. plugs/index.ts & plugs/menus.ts
const plugsDir = path.join(SRC_DIR, 'plugs');
const plugCategories = ['main', 'settings'];

let plugsContent = `export * from "@plugs/base";\n`;
let menusContent = ``;

for (const cat of plugCategories) {
  for (const plug of getDirectories(path.join(plugsDir, cat))) {
    if (fs.existsSync(path.join(plugsDir, cat, plug, 'index.ts'))) {
      plugsContent += `export * from "@plugs/${cat}/${plug}";\n`;
    }
  }
  for (const menu of getFiles(path.join(plugsDir, 'menus', cat))) {
    menusContent += `export * from "@plugs/menus/${cat}/${menu.replace('.ts', '')}";\n`;
  }
}

plugsContent += `import "../../plugs/z-register";\nimport "./menus";\n`;
menusContent += `import "../../plugs/menus/z-register";\n`;

writeSuper(path.join(SUPER_DIR, 'plugs', 'index.ts'), plugsContent);
writeSuper(path.join(SUPER_DIR, 'plugs', 'menus.ts'), menusContent);

// 2. techs.ts
let techsContent = `export * from "@techs/base";\n`;
for (const tech of getFiles(path.join(SRC_DIR, 'techs'))) {
  if (tech !== 'base.ts') {
    techsContent += `export * from "@techs/${tech.replace('.ts', '')}";\n`;
  }
}
techsContent += `import "../techs/z-register";\n`;
writeSuper(path.join(SUPER_DIR, 'techs.ts'), techsContent);

// 3. components/index.ts, icons.ts, notifiers.ts
const compPath = path.join(SRC_DIR, 'components');
let compContent = `export * from "@components/base";\n`;

// Top-level folders and files
for (const comp of getDirectories(compPath).filter(d => !['base', 'controls', 'holders', 'icons', 'notifiers'].includes(d))) {
  if (fs.existsSync(path.join(compPath, comp, 'index.ts'))) compContent += `export * from "@components/${comp}";\n`;
}
for (const comp of getFiles(compPath).filter(f => f !== 'base.ts')) {
  compContent += `export * from "@components/${comp.replace('.ts', '')}";\n`;
}

// Subfolders (controls, holders)
for (const cat of ['controls', 'holders']) {
  for (const comp of getDirectories(path.join(compPath, cat))) {
    if (fs.existsSync(path.join(compPath, cat, comp, 'index.ts'))) compContent += `export * from "@components/${cat}/${comp}";\n`;
  }
  for (const comp of getFiles(path.join(compPath, cat))) {
    compContent += `export * from "@components/${cat}/${comp.replace('.ts', '')}";\n`;
  }
}

compContent += `import "../../components/z-register";\n\n`;

// Notifiers
const notifiersPath = path.join(compPath, 'notifiers');
if (fs.existsSync(notifiersPath)) {
  let notifiersContent = ``;
  if (fs.existsSync(path.join(notifiersPath, 'base.ts'))) notifiersContent += `export * from "@components/notifiers/base";\n`;
  for (const file of getFiles(notifiersPath).filter(f => f !== 'base.ts')) {
    notifiersContent += `export * from "@components/notifiers/${file.replace('.ts', '')}";\n`;
  }
  notifiersContent += `import "../../components/notifiers/z-register";\n`;
  writeSuper(path.join(SUPER_DIR, 'components', 'notifiers.ts'), notifiersContent);
  compContent += `export * from "./notifiers";\n`;
}

// Icons
const iconsPath = path.join(compPath, 'icons');
if (fs.existsSync(iconsPath)) {
  let iconsContent = ``;
  for (const file of getFiles(iconsPath)) {
    iconsContent += `export * from "@components/icons/${file.replace('.ts', '')}";\n`;
  }
  iconsContent += `import "../../components/icons/z-register";\n`;
  writeSuper(path.join(SUPER_DIR, 'components', 'icons.ts'), iconsContent);
  compContent += `export * from "./icons";\n`;
}

writeSuper(path.join(SUPER_DIR, 'components', 'index.ts'), compContent);

// 4. utils.ts & consts.ts
for (const folder of ['utils', 'consts']) {
  let content = ``;
  for (const file of getFiles(path.join(SRC_DIR, folder))) {
    content += `export * from "@${folder}/${file.replace('.ts', '')}";\n`;
  }
  if (content) writeSuper(path.join(SUPER_DIR, `${folder}.ts`), content);
}

console.log("Super directory built successfully.");
