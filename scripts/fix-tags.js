import fs from 'fs';

function fixFile(file) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/<strong style="color: var\(--tmg-media-range-track-boost-color, red\); vertical-align: 4%;">([^<]+)<\/strong>/g, '<b style="color: var(--tmg-media-range-track-boost-color, red); vertical-align: 4%;">$1</b>');
  fs.writeFileSync(file, content, 'utf8');
  console.log('Fixed', file);
}

fixFile('src/ts/components/controls/brightness/slider.ts');
fixFile('src/ts/components/controls/volume/slider.ts');
fixFile('src/ts/components/notifiers/brightness.ts');
fixFile('src/ts/components/notifiers/volume.ts');
