import fs from 'fs';
import path from 'path';

const SRC_DIR = path.resolve('src/ts');
const SUPER_DIR = path.join(SRC_DIR, 'super');

function getDirectories(srcPath) {
  return fs.readdirSync(srcPath).filter(file => fs.statSync(path.join(srcPath, file)).isDirectory());
}

function getFiles(srcPath, ext = '.ts') {
  return fs.readdirSync(srcPath).filter(file => fs.statSync(path.join(srcPath, file)).isFile() && file.endsWith(ext) && file !== 'z-register.ts' && file !== 'index.ts');
}

// Ensure super dir exists
if (!fs.existsSync(SUPER_DIR)) fs.mkdirSync(SUPER_DIR, { recursive: true });

// 1. plugs/index.ts
const plugsSuperDir = path.join(SUPER_DIR, 'plugs');
if (!fs.existsSync(plugsSuperDir)) fs.mkdirSync(plugsSuperDir, { recursive: true });

let plugsContent = `export * from "@plugs/base";\n`;
const plugCategories = ['main', 'settings'];
for (const cat of plugCategories) {
  const catPath = path.join(SRC_DIR, 'plugs', cat);
  if (fs.existsSync(catPath)) {
    const plugs = getDirectories(catPath);
    for (const plug of plugs) {
      if (fs.existsSync(path.join(catPath, plug, 'index.ts'))) {
        plugsContent += `export * from "@plugs/${cat}/${plug}";\n`;
      }
    }
  }
}
plugsContent += `import "../../plugs/z-register";\n`;
plugsContent += `import "./menus";\n`;
fs.writeFileSync(path.join(plugsSuperDir, 'index.ts'), plugsContent);

// 2. plugs/menus.ts
let menusContent = ``;
const menusPath = path.join(SRC_DIR, 'plugs', 'menus');
if (fs.existsSync(menusPath)) {
  for (const cat of plugCategories) {
    const catPath = path.join(menusPath, cat);
    if (fs.existsSync(catPath)) {
      const menus = getFiles(catPath);
      for (const menu of menus) {
        const name = menu.replace('.ts', '');
        menusContent += `export * from "@plugs/menus/${cat}/${name}";\n`;
      }
    }
  }
  menusContent += `import "../../plugs/menus/z-register";\n`;
  fs.writeFileSync(path.join(plugsSuperDir, 'menus.ts'), menusContent);
}

// 3. techs.ts
let techsContent = `export * from "@techs/base";\n`;
const techsPath = path.join(SRC_DIR, 'techs');
if (fs.existsSync(techsPath)) {
  const techs = getDirectories(techsPath);
  for (const tech of techs) {
    if (tech !== 'base' && fs.existsSync(path.join(techsPath, tech, 'index.ts'))) {
      techsContent += `export * from "@techs/${tech}";\n`;
    }
  }
  techsContent += `import "../techs/z-register";\n`;
  fs.writeFileSync(path.join(SUPER_DIR, 'techs.ts'), techsContent);
}

// 4. components/index.ts
const compSuperDir = path.join(SUPER_DIR, 'components');
if (!fs.existsSync(compSuperDir)) fs.mkdirSync(compSuperDir, { recursive: true });

let compContent = `export * from "@components/base";\n`;
const compPath = path.join(SRC_DIR, 'components');
if (fs.existsSync(compPath)) {
  // top level components (folders)
  const topComps = getDirectories(compPath).filter(d => !['base', 'controls', 'holders', 'icons'].includes(d));
  for (const comp of topComps) {
    if (fs.existsSync(path.join(compPath, comp, 'index.ts'))) {
      compContent += `export * from "@components/${comp}";\n`;
    }
  }
  
  // top level components (files)
  const topFiles = getFiles(compPath).filter(f => f !== 'z-register.ts' && f !== 'base.ts');
  for (const comp of topFiles) {
    compContent += `export * from "@components/${comp.replace('.ts', '')}";\n`;
  }

  // subfolders
  const compCategories = ['controls', 'holders'];
  for (const cat of compCategories) {
    const catPath = path.join(compPath, cat);
    if (fs.existsSync(catPath)) {
      const subComps = getDirectories(catPath);
      for (const comp of subComps) {
        if (fs.existsSync(path.join(catPath, comp, 'index.ts'))) {
          compContent += `export * from "@components/${cat}/${comp}";\n`;
        }
      }
      const subFiles = getFiles(catPath);
      for (const comp of subFiles) {
        compContent += `export * from "@components/${cat}/${comp.replace('.ts', '')}";\n`;
      }
    }
  }

  compContent += `import "../../components/z-register";\n\n`;
  if (fs.existsSync(path.join(compSuperDir, 'notifiers.ts'))) {
    compContent += `export * from "./notifiers";\n`;
  }
  if (fs.existsSync(path.join(compSuperDir, 'icons.ts'))) {
    compContent += `export * from "./icons";\n`;
  }
  
  fs.writeFileSync(path.join(compSuperDir, 'index.ts'), compContent);
}

// 5. utils.ts
let utilsContent = ``;
const utilsPath = path.join(SRC_DIR, 'utils');
if (fs.existsSync(utilsPath)) {
  const utils = getFiles(utilsPath);
  for (const util of utils) {
    utilsContent += `export * from "@utils/${util.replace('.ts', '')}";\n`;
  }
  fs.writeFileSync(path.join(SUPER_DIR, 'utils.ts'), utilsContent);
}

// 6. consts.ts
let constsContent = ``;
const constsPath = path.join(SRC_DIR, 'consts');
if (fs.existsSync(constsPath)) {
  const consts = getFiles(constsPath);
  for (const con of consts) {
    constsContent += `export * from "@consts/${con.replace('.ts', '')}";\n`;
  }
  fs.writeFileSync(path.join(SUPER_DIR, 'consts.ts'), constsContent);
}

console.log("Super directory built successfully.");
