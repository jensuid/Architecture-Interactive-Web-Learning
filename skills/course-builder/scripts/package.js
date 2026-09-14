'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const skillRoot = path.join(__dirname, '..');
const sourceRoot = path.join(skillRoot, '..', '..');
const manifestSchemaPath = path.join(sourceRoot, 'template', 'scripts', 'lib', 'manifest-schema.js');
const frameworkRoot = path.join(skillRoot, 'framework');
const manifestPath = path.join(frameworkRoot, 'package-manifest.json');
const excludedNames = new Set(['.DS_Store', '.git', 'dist', 'graphify-out', 'node_modules']);
const excludedTemplateRelativePaths = new Set([
  'tests/generated',
  'app/courses.json',
]);

function parseArgs(argv) {
  const options = { check: false, report: null };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--build') options.check = false;
    else if (value === '--check') options.check = true;
    else if (value === '--report') {
      options.report = argv[index + 1];
      index += 1;
    } else if (value === '--help' || value === '-h') options.help = true;
    else throw new Error(`Unknown option: ${value}`);
  }
  return options;
}

function help() {
  console.log(`Usage: node ${path.relative(process.cwd(), __filename)} [options]

Options:
  --build          Rebuild the portable framework mirror (default).
  --check          Verify source drift, package exclusions, and checksums.
  --report <path>  Write a machine-readable report.
  -h, --help       Show this help.
`);
}

function isExcluded(relativePath, directory = false) {
  const segments = relativePath.split(path.sep);
  if (segments.some((segment) => excludedNames.has(segment))) return true;
  if (directory && segments.includes('generated')) return true;
  return !directory && relativePath === path.join('app', 'courses.json');
  return false;
}

function isTemplateDriftExcluded(relativePath) {
  const segments = relativePath.split(path.sep);
  return isExcluded(relativePath, false)
    || (segments[0] === 'tests' && segments[1] === 'generated');
}

function copyDirectory(source, destination) {
  fs.mkdirSync(destination, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const sourcePath = path.join(source, entry.name);
    const destinationPath = path.join(destination, entry.name);
    const relativeSource = path.relative(source, sourcePath);
    if (isExcluded(relativeSource, entry.isDirectory())) continue;
    if (entry.isDirectory()) copyDirectory(sourcePath, destinationPath);
    else fs.copyFileSync(sourcePath, destinationPath);
  }
}

function copyFile(source, destination) {
  if (isExcluded(path.basename(source))) throw new Error(`Refusing to package excluded file: ${source}`);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
}

function collectFiles(directory, files = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) collectFiles(entryPath, files);
    else files.push(entryPath);
  }
  return files;
}

function portableCourse() {
  const {
    parseCatalogSource,
    parseCourseSource,
  } = require(manifestSchemaPath);
  const course = parseCourseSource(
    path.join(sourceRoot, 'course.yaml'),
    path.join(sourceRoot, 'template', 'app', 'content'),
  );
  const catalog = parseCatalogSource(path.join(sourceRoot, 'courses.yaml'));
  const courseEntries = catalog.courses.filter((entry) => entry.id === course.course.id);
  if (courseEntries.length !== 1) {
    throw new Error(`Expected exactly one catalog entry for canonical course ${course.course.id}`);
  }
  return {
    schemaVersion: catalog.schemaVersion,
    courses: [courseEntries[0]],
  };
}

function writePortableCatalog() {
  const catalog = portableCourse();
  const yaml = `schemaVersion: ${catalog.schemaVersion}
courses:
  - id: ${catalog.courses[0].id}
    name: ${catalog.courses[0].name}
    version: ${catalog.courses[0].version}
    manifest: ${catalog.courses[0].manifest}
    route: ${catalog.courses[0].route}
`;
  fs.writeFileSync(path.join(frameworkRoot, 'courses.yaml'), yaml, 'utf8');
  const appCatalogPath = path.join(frameworkRoot, 'template', 'app', 'courses.json');
  fs.writeFileSync(appCatalogPath, `${JSON.stringify({
    schemaVersion: catalog.schemaVersion,
    courses: catalog.courses.map(({ id, name, version, route }) => ({ id, name, version, route })),
  }, null, 2)}\n`, 'utf8');
}

function build() {
  fs.rmSync(frameworkRoot, { recursive: true, force: true });
  fs.mkdirSync(frameworkRoot, { recursive: true });
  copyFile(path.join(sourceRoot, 'README.md'), path.join(frameworkRoot, 'README.md'));
  copyFile(path.join(sourceRoot, 'AGENT.md'), path.join(frameworkRoot, 'AGENT.md'));
  copyFile(
    path.join(sourceRoot, 'Proposed-Architecture.md'),
    path.join(frameworkRoot, 'Proposed-Architecture.md'),
  );
  copyFile(path.join(sourceRoot, 'course.yaml'), path.join(frameworkRoot, 'course.yaml'));
  copyDirectory(path.join(sourceRoot, 'template'), path.join(frameworkRoot, 'template'));
  copyDirectory(path.join(sourceRoot, 'docs'), path.join(frameworkRoot, 'docs'));
  copyDirectory(path.join(sourceRoot, '.github'), path.join(frameworkRoot, '.github'));
  fs.mkdirSync(path.join(frameworkRoot, 'notes'), { recursive: true });
  copyFile(
    path.join(sourceRoot, 'notes', 'release-notes.md'),
    path.join(frameworkRoot, 'notes', 'release-notes.md'),
  );
  writePortableCatalog();
  writeManifest();
}

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function manifestEntries() {
  return collectFiles(frameworkRoot)
    .filter((filePath) => filePath !== manifestPath)
    .map((filePath) => ({
      file: path.relative(frameworkRoot, filePath).split(path.sep).join('/'),
      size: fs.statSync(filePath).size,
      sha256: sha256(filePath),
    }))
    .sort((a, b) => a.file.localeCompare(b.file));
}

function writeManifest() {
  fs.writeFileSync(manifestPath, `${JSON.stringify({
    schemaVersion: 1,
    files: manifestEntries(),
  }, null, 2)}\n`, 'utf8');
}

function expectedRootEntries() {
  const entries = [
    { source: path.join(sourceRoot, 'README.md'), destination: 'README.md' },
    { source: path.join(sourceRoot, 'AGENT.md'), destination: 'AGENT.md' },
    {
      source: path.join(sourceRoot, 'Proposed-Architecture.md'),
      destination: 'Proposed-Architecture.md',
    },
    { source: path.join(sourceRoot, 'course.yaml'), destination: 'course.yaml' },
  ];
  for (const filePath of collectFiles(path.join(sourceRoot, 'docs'))) {
    entries.push({
      source: filePath,
      destination: path.join('docs', path.relative(path.join(sourceRoot, 'docs'), filePath)),
    });
  }
  for (const filePath of collectFiles(path.join(sourceRoot, '.github'))) {
    entries.push({
      source: filePath,
      destination: path.join('.github', path.relative(path.join(sourceRoot, '.github'), filePath)),
    });
  }
  entries.push({
    source: path.join(sourceRoot, 'notes', 'release-notes.md'),
    destination: path.join('notes', 'release-notes.md'),
  });
  return entries.filter((entry) => !isExcluded(entry.destination));
}

function validateSourceDrift(checks) {
  const differences = [];
  const canonicalTemplate = collectFiles(path.join(sourceRoot, 'template'))
    .filter((filePath) => !isTemplateDriftExcluded(
      path.relative(path.join(sourceRoot, 'template'), filePath),
    ));
  const packagedTemplate = collectFiles(path.join(frameworkRoot, 'template'))
    .filter((filePath) => !isTemplateDriftExcluded(
      path.relative(path.join(frameworkRoot, 'template'), filePath),
    ));
  const expected = new Map(canonicalTemplate.map((filePath) => [
    path.relative(path.join(sourceRoot, 'template'), filePath),
    filePath,
  ]));
  const actual = new Map(packagedTemplate.map((filePath) => [
    path.relative(path.join(frameworkRoot, 'template'), filePath),
    filePath,
  ]));
  for (const [relativePath] of expected) {
    if (!actual.has(relativePath)) differences.push(`missing template/${relativePath}`);
  }
  for (const [relativePath] of actual) {
    if (!expected.has(relativePath)) differences.push(`extra template/${relativePath}`);
  }
  for (const [relativePath, canonicalPath] of expected) {
    if (!actual.has(relativePath)) continue;
    if (!fs.existsSync(actual.get(relativePath))
      || fs.readFileSync(canonicalPath).compare(fs.readFileSync(actual.get(relativePath))) !== 0) {
      differences.push(`modified template/${relativePath}`);
    }
  }
  addCheck(checks, 'canonical-template-drift', differences.length === 0, { differences });

  const rootDifferences = [];
  for (const entry of expectedRootEntries()) {
    const packagedPath = path.join(frameworkRoot, entry.destination);
    if (!fs.existsSync(packagedPath)) {
      rootDifferences.push(`missing ${entry.destination}`);
    } else if (fs.readFileSync(entry.source).compare(fs.readFileSync(packagedPath)) !== 0) {
      rootDifferences.push(`modified ${entry.destination}`);
    }
  }
  addCheck(checks, 'canonical-contract-drift', rootDifferences.length === 0, { differences: rootDifferences });
  return differences.length === 0 && rootDifferences.length === 0;
}

function validateCatalog(checks) {
  const expected = portableCourse();
  const expectedYaml = `schemaVersion: ${expected.schemaVersion}
courses:
  - id: ${expected.courses[0].id}
    name: ${expected.courses[0].name}
    version: ${expected.courses[0].version}
    manifest: ${expected.courses[0].manifest}
    route: ${expected.courses[0].route}
`;
  const yamlPath = path.join(frameworkRoot, 'courses.yaml');
  const jsonPath = path.join(frameworkRoot, 'template', 'app', 'courses.json');
  const expectedJson = `${JSON.stringify({
    schemaVersion: expected.schemaVersion,
    courses: expected.courses.map(({ id, name, version, route }) => ({ id, name, version, route })),
  }, null, 2)}\n`;
  const yamlPassed = fs.existsSync(yamlPath) && fs.readFileSync(yamlPath, 'utf8') === expectedYaml;
  const jsonPassed = fs.existsSync(jsonPath) && fs.readFileSync(jsonPath, 'utf8') === expectedJson;
  addCheck(checks, 'portable-catalog-transform', yamlPassed && jsonPassed, {
    yamlPath: path.relative(sourceRoot, yamlPath),
    jsonPath: path.relative(sourceRoot, jsonPath),
  });
  return yamlPassed && jsonPassed;
}

function validateChecksums(checks) {
  if (!fs.existsSync(manifestPath)) {
    addCheck(checks, 'package-checksums', false, { missing: 'framework/package-manifest.json' });
    return false;
  }
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch (error) {
    addCheck(checks, 'package-checksums', false, { error: error.message });
    return false;
  }
  const expected = new Map(manifest.files.map((entry) => [entry.file, entry]));
  const prohibitedFiles = Array.from(expected.keys()).filter((file) => {
    const segments = file.split('/');
    const generatedIndex = segments.indexOf('generated');
    return excludedNames.has(segments[0])
      || segments.includes('.DS_Store')
      || segments.includes('courses')
      || segments.includes('dist')
      || segments.includes('graphify-out')
      || segments.includes('node_modules')
      || (generatedIndex !== -1
        && segments[generatedIndex - 1] === 'tests'
        && segments[generatedIndex - 2] === 'template');
  });
  const actualFiles = collectFiles(frameworkRoot)
    .map((filePath) => path.relative(frameworkRoot, filePath).split(path.sep).join('/'))
    .filter((file) => file !== 'package-manifest.json');
  const differences = [];
  prohibitedFiles.forEach((file) => differences.push(`prohibited ${file}`));
  for (const file of actualFiles) {
    if (!expected.has(file)) differences.push(`untracked ${file}`);
  }
  for (const [file, entry] of expected) {
    const filePath = path.join(frameworkRoot, file);
    if (!fs.existsSync(filePath)) {
      differences.push(`missing ${file}`);
    } else if (fs.statSync(filePath).size !== entry.size || sha256(filePath) !== entry.sha256) {
      differences.push(`checksum mismatch ${file}`);
    }
  }
  addCheck(checks, 'package-checksums', differences.length === 0, { differences });
  return differences.length === 0;
}

function addCheck(checks, name, passed, details = null) {
  checks.push({ name, status: passed ? 'passed' : 'failed', ...(details ? { details } : {}) });
}

function check() {
  const checks = [];
  const hasCanonicalSource = fs.existsSync(path.join(sourceRoot, 'course.yaml'))
    && fs.existsSync(path.join(sourceRoot, 'courses.yaml'))
    && fs.existsSync(path.join(sourceRoot, 'template', 'scripts', 'agent-run.js'));
  const sourceDrift = hasCanonicalSource ? validateSourceDrift(checks) : null;
  const catalog = hasCanonicalSource ? validateCatalog(checks) : null;
  const checksums = validateChecksums(checks);
  if (!hasCanonicalSource) {
    addCheck(checks, 'canonical-source-available', true, {
      skipped: 'source drift is not available outside the source checkout; checksum verification remains enforced',
    });
  }
  return {
    passed: (!hasCanonicalSource || (sourceDrift && catalog)) && checksums,
    checks,
  };
}

function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
    return;
  }
  if (options.help) {
    help();
    return;
  }

  if (options.check && !fs.existsSync(frameworkRoot)) {
    const report = {
      schemaVersion: 1,
      status: 'failed',
      generatedBy: 'course-builder/scripts/package.js',
      checks: [{ name: 'portable-framework', status: 'failed', details: { missing: 'framework/' } }],
    };
    console.log(JSON.stringify(report, null, 2));
    process.exitCode = 1;
    return;
  }

  let result;
  if (options.check) {
    result = check();
  } else {
    build();
    result = check();
  }
  const report = {
    schemaVersion: 1,
    status: result.passed ? 'passed' : 'failed',
    generatedBy: 'course-builder/scripts/package.js',
    checks: result.checks,
  };
  if (options.report) {
    const reportPath = path.resolve(process.cwd(), options.report);
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  }
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = result.passed ? 0 : 1;
}

main();
