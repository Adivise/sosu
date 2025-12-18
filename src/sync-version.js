const fs = require('fs');
const path = require('path');

// Read package.json
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const version = packageJson.version;

// Write version.js
const versionJsPath = path.join(__dirname, '..', 'src', 'renderer', 'src', 'version.js');
const versionJsContent = `// This file is auto-generated - do not edit manually
// Version is synced from package.json during build
export const VERSION = '${version}';
`;

fs.writeFileSync(versionJsPath, versionJsContent, 'utf8');
console.log(`✓ Synced version ${version} to renderer/src/version.js`);