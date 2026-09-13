'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const distRoot = path.join(__dirname, '..', '..', 'dist');
const buildManifestPath = path.join(distRoot, 'build-manifest.json');

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function main() {
  const buildManifest = JSON.parse(fs.readFileSync(buildManifestPath, 'utf8'));
  const errors = [];
  const expectedFiles = new Set(buildManifest.files.map((entry) => entry.file));
  const actualFiles = [];

  function collect(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) collect(entryPath);
      else actualFiles.push(path.relative(distRoot, entryPath));
    }
  }
  collect(distRoot);

  if (actualFiles.length !== expectedFiles.size + 1) errors.push('file count differs from build manifest');
  for (const relativePath of actualFiles) {
    if (relativePath === 'build-manifest.json') continue;
    if (!expectedFiles.has(relativePath)) {
      errors.push(`unexpected file: ${relativePath}`);
      continue;
    }
    const expected = buildManifest.files.find((entry) => entry.file === relativePath).sha256;
    if (sha256(path.join(distRoot, relativePath)) !== expected) errors.push(`checksum mismatch: ${relativePath}`);
  }

  const report = {
    schemaVersion: 1,
    status: errors.length ? 'failed' : 'passed',
    fileCount: actualFiles.length,
    errors,
  };
  const reportPath = path.join(__dirname, '..', 'tests', 'generated', 'publish-report.json');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = report.status === 'passed' ? 0 : 1;
}

main();
