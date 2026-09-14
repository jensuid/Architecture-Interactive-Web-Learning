'use strict';

const fs = require('fs');
const path = require('path');
const { parseCatalogSource } = require('./lib/manifest-schema');

const root = path.join(__dirname, '..', '..');
const sourcePath = path.join(root, 'courses.yaml');
const outputPath = path.join(__dirname, '..', 'app', 'courses.json');

function get(text, pattern) {
  const match = text.match(pattern);
  return match ? match[1].trim() : null;
}

function main() {
  const catalog = parseCatalogSource(sourcePath);
  const output = {
    schemaVersion: catalog.schemaVersion,
    courses: catalog.courses.map(({ id, name, version, status, route }) => ({
      id,
      name,
      version,
      status,
      route,
    })),
  };
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  console.log(`course catalog compiler: wrote ${path.relative(root, outputPath)}`);
}

main();
