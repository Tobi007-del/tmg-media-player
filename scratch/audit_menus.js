const { Project } = require("ts-morph");
const path = require("path");

const project = new Project({
  tsConfigFilePath: path.resolve(__dirname, "../../tsconfig.json"),
});

const menusDir = path.resolve(__dirname, "../../src/ts/plugs/menus/settings");
const sourceFiles = project.addSourceFilesAtPaths(`${menusDir}/**/*.ts`);

let errors = [];

sourceFiles.forEach((file) => {
  const fileName = file.getBaseName();
  
  // Find the exported function (getSettingsXMenu)
  const exportDecls = file.getVariableDeclarations().filter(d => d.getName().startsWith("getSettings"));
  
  exportDecls.forEach(decl => {
    const initializer = decl.getInitializer();
    if (!initializer) return;
    
    // We expect it to return an array of items or a single item
    // The AST for this can be deep, but we can look at object literals inside
    const objectLiterals = initializer.getDescendantsOfKind(require("ts-morph").SyntaxKind.ObjectLiteralExpression);
    
    const ids = new Set();
    
    objectLiterals.forEach(obj => {
      const idProp = obj.getProperty("id");
      const labelProp = obj.getProperty("label");
      const widgetProp = obj.getProperty("widget");
      
      if (idProp && idProp.getKind() === require("ts-morph").SyntaxKind.PropertyAssignment) {
        const idVal = idProp.getInitializer()?.getText()?.replace(/["']/g, "");
        if (idVal) {
          if (ids.has(idVal)) {
            errors.push(`[${fileName}] Duplicate ID found: ${idVal}`);
          }
          ids.add(idVal);
        }
      }
      
      if (widgetProp && widgetProp.getKind() === require("ts-morph").SyntaxKind.PropertyAssignment) {
        const widgetVal = widgetProp.getInitializer()?.getText()?.replace(/["']/g, "");
        if (widgetVal === "group" && !labelProp && obj.getProperty("items")) {
          // It's a group with items but no label?
          errors.push(`[${fileName}] Group widget without a label found.`);
        }
      }
    });
  });
});

console.log(JSON.stringify(errors, null, 2));
