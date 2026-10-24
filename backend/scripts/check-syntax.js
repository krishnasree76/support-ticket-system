// Lightweight lint: verifies every backend source file parses (node --check).
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const roots = ['src', 'scripts', 'tests'].map((dir) => path.join(__dirname, '..', dir));
const files = [];
const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith('.js')) files.push(full);
  });
roots.forEach(walk);

files.forEach((file) => execFileSync(process.execPath, ['--check', file], { stdio: 'inherit' }));
console.log(`Syntax OK: ${files.length} files`);
