#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const AVAILABLE_COMPONENTS = {
  "text-input": "TextInput.tsx",
  select: "Select.tsx",
  textarea: "Textarea.tsx",
  checkbox: "Checkbox.tsx",
  "date-input": "DateInput.tsx",
  "number-input": "NumberInput.tsx",
  repeater: "Repeater.tsx",
  form: "Form.tsx",
  field: "Field.tsx",
  "layout-container": "LayoutContainer.tsx",
  "layout-item": "LayoutItem.tsx",
  actions: "Actions.tsx",
  "form-message": "FormMessage.tsx",
};

function showHelp() {
  console.log(`
use-form-definition copy components

Usage:
  npx use-form-definition copy [component-name] [destination]
  
Available components:
  ${Object.keys(AVAILABLE_COMPONENTS)
    .map((name) => `- ${name}`)
    .join("\n  ")}
  - all (copies all components)

Examples:
  npx use-form-definition copy text-input ./src/components/
  npx use-form-definition copy all ./src/components/form/
  npx use-form-definition copy form ./src/components/ui/
`);
}

function copyComponent(componentName, destination) {
  const packageDirectory = path.dirname(__dirname);
  const componentFile = AVAILABLE_COMPONENTS[componentName];

  if (!componentFile) {
    console.error(`Error: Component "${componentName}" not found.`);
    console.log(
      "\nAvailable components:",
      Object.keys(AVAILABLE_COMPONENTS).join(", "),
    );
    return false;
  }

  const sourcePath = path.join(
    packageDirectory,
    "src",
    "components",
    componentFile,
  );
  const destinationPath = path.join(destination, componentFile);

  try {
    // Ensure destination directory exists
    if (!fs.existsSync(destination)) {
      fs.mkdirSync(destination, { recursive: true });
    }

    // Copy the file, rewriting the package's internal relative imports
    // (../core/utilities, ../core/types, ...) to the package root, which
    // re-exports everything the components use. A verbatim copy would only
    // compile in a tree that mirrors this repo's layout.
    const source = fs.readFileSync(sourcePath, "utf8");
    const rewritten = source.replace(
      /from (["'])\.\.\/core\/[^"']+\1/g,
      'from "use-form-definition"',
    );
    fs.writeFileSync(destinationPath, rewritten);
    console.log(`Copied ${componentFile} to ${destinationPath}`);
    return true;
  } catch (error) {
    console.error(`Error: Failed to copy ${componentFile}:`, error.message);
    return false;
  }
}

function copyAllComponents(destination) {
  console.log("Copying all components...\n");

  let successCount = 0;
  const componentNames = Object.keys(AVAILABLE_COMPONENTS);

  for (const componentName of componentNames) {
    if (copyComponent(componentName, destination)) {
      successCount++;
    }
  }

  console.log(
    `\nSuccessfully copied ${successCount}/${componentNames.length} components!`,
  );

  if (successCount === componentNames.length) {
    console.log(`
Next steps:
1. Review and customize the copied components
2. Update your form configuration to use these components
3. Check the documentation for usage examples
    `);
  }
}

function main() {
  const argumentList = process.argv.slice(2);

  if (
    argumentList.length === 0 ||
    argumentList[0] === "help" ||
    argumentList[0] === "--help" ||
    argumentList[0] === "-h"
  ) {
    showHelp();
    return;
  }

  if (argumentList[0] !== "copy") {
    console.error('Error: Unknown command. Use "copy" to copy components.');
    showHelp();
    return;
  }

  const componentName = argumentList[1];
  const destination = argumentList[2] || "./src/components/";

  if (!componentName) {
    console.error("Error: Please specify a component name.");
    showHelp();
    return;
  }

  if (componentName === "all") {
    copyAllComponents(destination);
  } else {
    if (copyComponent(componentName, destination)) {
      console.log(`\nComponent copied successfully!`);
      console.log(`\nDon't forget to:`);
      console.log(`1. Import and use the component in your form configuration`);
      console.log(`2. Customize the styling and behavior as needed`);
    }
  }
}

main();
