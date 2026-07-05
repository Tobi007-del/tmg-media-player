import { Project, SyntaxKind } from "ts-morph";
import * as path from "path";

const project = new Project();
project.addSourceFilesAtPaths("src/ts/plugs/settings/**/menu.ts");

let updated = 0;

for (const sourceFile of project.getSourceFiles()) {
  let changed = false;

  // Find all object literal expressions
  const objectLiterals = sourceFile.getDescendantsOfKind(SyntaxKind.ObjectLiteralExpression);

  for (const obj of objectLiterals) {
    // Check if it has an id property (likely a SettingsMenuItem)
    const idProp = obj.getProperty("id");
    const labelProp = obj.getProperty("label");
    if (!idProp || !labelProp) continue;

    // Check widget type
    const widgetProp = obj.getProperty("widget");
    let isGroup = false;
    if (widgetProp && widgetProp.isKind(SyntaxKind.PropertyAssignment)) {
      const init = widgetProp.getInitializer();
      if (init && init.getText() === '"group"') {
        isGroup = true;
      }
    }

    const infoTextProp = obj.getProperty("infoText");
    const getValueProp = obj.getProperty("getValue");

    // Clean up duplicate getValue if any
    const getValues = obj.getProperties().filter(p => p.isKind(SyntaxKind.PropertyAssignment) && p.getName() === "getValue");
    if (getValues.length > 1) {
      // Remove all but the last one
      for (let i = 0; i < getValues.length - 1; i++) {
        getValues[i].remove();
        changed = true;
      }
    }

    if (isGroup) {
      // For groups, it should NOT have infoText: "Customize"
      // It SHOULD have getValue: () => "Customize"
      
      const gv = obj.getProperty("getValue");
      if (!gv) {
        obj.addPropertyAssignment({ name: "getValue", initializer: '() => "Customize"' });
        changed = true;
      } else if (gv.isKind(SyntaxKind.PropertyAssignment)) {
        const init = gv.getInitializer();
        if (init && (init.getText() === '() => ""' || init.getText() === "() => ''")) {
          gv.setInitializer('() => "Customize"');
          changed = true;
        }
      }

      const it = obj.getProperty("infoText");
      if (it && it.isKind(SyntaxKind.PropertyAssignment)) {
        const init = it.getInitializer();
        if (init && init.getText() === '"Customize"') {
          it.remove();
          changed = true;
        }
      }
    } else {
      // If it's NOT a group, it shouldn't have "Customize" anywhere
      const gv = obj.getProperty("getValue");
      if (gv && gv.isKind(SyntaxKind.PropertyAssignment)) {
        const init = gv.getInitializer();
        if (init && init.getText() === '() => "Customize"') {
          gv.setInitializer('() => ""');
          changed = true;
        }
      }
      
      const it = obj.getProperty("infoText");
      if (it && it.isKind(SyntaxKind.PropertyAssignment)) {
        const init = it.getInitializer();
        if (init && init.getText() === '"Customize"') {
          it.remove();
          changed = true;
        }
      }
    }
  }

  if (changed) {
    sourceFile.saveSync();
    console.log("Updated", sourceFile.getFilePath());
    updated++;
  }
}

console.log("Total updated:", updated);
