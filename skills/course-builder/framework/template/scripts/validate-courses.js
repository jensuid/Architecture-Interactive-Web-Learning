'use strict';

const fs = require('fs');
const path = require('path');
const { parseCatalogSource, validateCatalog } = require('./lib/manifest-schema');

const root = path.join(__dirname, '..', '..');
const catalogPath = path.join(root, 'courses.yaml');
const reportPath = path.join(__dirname, '..', 'tests', 'generated', 'courses-report.json');

function get(text, pattern) {
  const match = text.match(pattern);
  return match ? match[1].trim() : null;
}

function parseCatalog() {
  return parseCatalogSource(catalogPath);
}

function main() {
  const catalog = parseCatalog();
  const errors = validateCatalog(catalog, root);
  const checks = errors.map((message) => ({ name: message, status: 'failed' }));

  const report = {
    schemaVersion: 1,
    status: errors.length ? 'failed' : 'passed',
    courseCount: catalog.courses.length,
    checks,
  };
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = report.status === 'passed' ? 0 : 1;
}

main();
