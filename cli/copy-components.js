#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const AVAILABLE_COMPONENTS = {
  'text-input': 'TextInput.tsx',
  'select': 'Select.tsx',
  'textarea': 'Textarea.tsx',
  'checkbox': 'Checkbox.tsx',
  'date-input': 'DateInput.tsx',
  'number-input': 'NumberInput.tsx',
  'repeater': 'Repeater.tsx',
  'form': 'Form.tsx',
  'field': 'Field.tsx',
  'layout-container': 'LayoutContainer.tsx',
  'layout-item': 'LayoutItem.tsx',
  'submit-button': 'SubmitButton.tsx',
};

function showHelp() {
  console.log(`
use-form-definition copy components

Usage:
  npx use-form-definition copy [component-name] [destination]
  
Available components:
  ${Object.keys(AVAILABLE_COMPONENTS).map(name => `- ${name}`).join('\n  ')}
  - all (copies all components)

Examples:
  npx use-form-definition copy text-input ./src/components/
  npx use-form-definition copy all ./src/components/form/
  npx use-form-definition copy form ./src/components/ui/
`);
}

function copyComponent(componentName, destination) {
  const packageDir = path.dirname(__dirname);
  const componentFile = AVAILABLE_COMPONENTS[componentName];
  
  if (!componentFile) {
    console.error(`❌ Component "${componentName}" not found.`);
    console.log('\nAvailable components:', Object.keys(AVAILABLE_COMPONENTS).join(', '));
    return false;
  }

  const sourcePath = path.join(packageDir, 'src', 'components', componentFile);
  const destPath = path.join(destination, componentFile);

  try {
    // Ensure destination directory exists
    if (!fs.existsSync(destination)) {
      fs.mkdirSync(destination, { recursive: true });
    }

    // Copy the file
    fs.copyFileSync(sourcePath, destPath);
    console.log(`✅ Copied ${componentFile} to ${destPath}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to copy ${componentFile}:`, error.message);
    return false;
  }
}

function copyAllComponents(destination) {
  console.log('📦 Copying all components...\n');
  
  let successCount = 0;
  const componentNames = Object.keys(AVAILABLE_COMPONENTS);
  
  for (const componentName of componentNames) {
    if (copyComponent(componentName, destination)) {
      successCount++;
    }
  }
  
  console.log(`\n🎉 Successfully copied ${successCount}/${componentNames.length} components!`);
  
  if (successCount === componentNames.length) {
    console.log(`
📝 Next steps:
1. Review and customize the copied components
2. Update your form configuration to use these components
3. Check the documentation for usage examples
    `);
  }
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === 'help' || args[0] === '--help' || args[0] === '-h') {
    showHelp();
    return;
  }

  if (args[0] !== 'copy') {
    console.error('❌ Unknown command. Use "copy" to copy components.');
    showHelp();
    return;
  }

  const componentName = args[1];
  const destination = args[2] || './src/components/';

  if (!componentName) {
    console.error('❌ Please specify a component name.');
    showHelp();
    return;
  }

  if (componentName === 'all') {
    copyAllComponents(destination);
  } else {
    if (copyComponent(componentName, destination)) {
      console.log(`\n✨ Component copied successfully!`);
      console.log(`\n📝 Don't forget to:`);
      console.log(`1. Import and use the component in your form configuration`);
      console.log(`2. Customize the styling and behavior as needed`);
    }
  }
}

main();