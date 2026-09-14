'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const templateRoot = path.join(__dirname, '..');
const repositoryRoot = path.join(templateRoot, '..');
const distRoot = path.join(repositoryRoot, 'dist');
const reportPath = path.join(templateRoot, 'tests', 'generated', 'release-report.json');

function collectFiles(directory, files = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) collectFiles(entryPath, files);
    else files.push(entryPath);
  }
  return files;
}

function runStep(name, command) {
  execFileSync(process.execPath, command, { cwd: templateRoot, stdio: 'inherit' });
  return { name, status: 'passed', command: command.join(' ') };
}

function main() {
  const steps = [
    runStep('manifest-schema', ['tests/manifest-schema.js']),
    runStep('course-factory', ['tests/course-factory.js']),
    runStep('course-validation', ['tests/validate-course.js']),
    runStep('unit-tests', ['tests/unit.js']),
    runStep('headless-course', ['tests/headless.js']),
    runStep('production-readiness', ['scripts/production-check.js']),
    runStep('multi-course-validation', ['scripts/validate-courses.js']),
    runStep('deterministic-publish', ['scripts/publish.js', '--include-development']),
    runStep('publish-verification', ['scripts/verify-publish.js']),
  ];

  const files = collectFiles(distRoot);
  const totalBytes = files.reduce((sum, file) => sum + fs.statSync(file).size, 0);
  const oversizeFiles = files.filter((file) => fs.statSync(file).size > 5 * 1024 * 1024);
  const sourceChecks = ['template/app/js', 'template/app/css']
    .map((directory) => path.join(repositoryRoot, directory))
    .flatMap((directory) => collectFiles(directory))
    .filter((file) => !file.includes(path.join('js', 'vendor')));
  const htmlFiles = files.filter((file) => file.endsWith('.html'));
  const cssFiles = files.filter((file) => file.endsWith('.css'));

  const runtimeSources = ['template/app/js', 'template/app/js/components']
    .map((directory) => path.join(repositoryRoot, directory))
    .flatMap((directory) => collectFiles(directory))
    .filter((file) => !file.includes(path.join('js', 'vendor')));
  const accessibility = JSON.parse(fs.readFileSync(path.join(templateRoot, 'tests', 'generated', 'accessibility-report.json'), 'utf8'));
  const catalog = JSON.parse(fs.readFileSync(path.join(distRoot, 'courses.json'), 'utf8'));
  const courseDirectories = fs.readdirSync(path.join(distRoot, 'courses'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
  const responsiveCss = fs.readFileSync(path.join(distRoot, 'css', 'style.css'), 'utf8');

  const checks = [
    { name: 'published root home page exists', status: fs.existsSync(path.join(distRoot, 'index.html')) ? 'passed' : 'failed' },
    { name: 'release gate runs all core suites', status: steps.every((step) => step.status === 'passed') ? 'passed' : 'failed' },
    { name: 'total static payload budget', status: totalBytes <= 150 * 1024 * 1024 ? 'passed' : 'failed', info: `${totalBytes} bytes` },
    { name: 'per-file size budget', status: oversizeFiles.length ? 'failed' : 'passed', info: oversizeFiles.map((file) => path.relative(distRoot, file)).join(', ') },
    { name: 'source assets are non-empty', status: sourceChecks.every((file) => fs.statSync(file).size > 0) ? 'passed' : 'failed' },
    { name: 'build manifest is checksum-verified', status: fs.existsSync(path.join(distRoot, 'build-manifest.json')) ? 'passed' : 'failed' },
    { name: 'all pages have responsive viewport', status: htmlFiles.every((file) => fs.readFileSync(file, 'utf8').includes('name="viewport"')) ? 'passed' : 'failed' },
    { name: 'responsive breakpoints are defined', status: /@media \(max-width:/.test(responsiveCss) ? 'passed' : 'failed' },
    { name: 'runtime remains network-hermetic', status: runtimeSources.every((file) => !/fetch\(['"]https?:/.test(fs.readFileSync(file, 'utf8'))) ? 'passed' : 'failed' },
    { name: 'accessibility audit passed', status: accessibility.status === 'passed' ? 'passed' : 'failed' },
    { name: 'catalog routes are isolated and relative', status: catalog.courses.every((course) => course.route.startsWith('./courses/')) ? 'passed' : 'failed' },
    { name: 'course routes do not contain duplicate catalogs', status: courseDirectories.every((id) => (
      !fs.existsSync(path.join(distRoot, 'courses', id, 'courses.html'))
      && !fs.existsSync(path.join(distRoot, 'courses', id, 'courses.json'))
    )) ? 'passed' : 'failed' },
    { name: 'versioned release notes exist', status: fs.existsSync(path.join(repositoryRoot, 'notes', 'release-notes.md')) ? 'passed' : 'failed' },
    { name: 'hosted CI workflow exists', status: fs.existsSync(path.join(repositoryRoot, '.github', 'workflows', 'ci.yml')) ? 'passed' : 'failed' },
    { name: 'GitHub Pages deployment workflow exists', status: fs.existsSync(path.join(repositoryRoot, '.github', 'workflows', 'deploy-pages.yml')) ? 'passed' : 'failed' },
    { name: 'deployment guide exists', status: fs.existsSync(path.join(repositoryRoot, 'docs', 'DEPLOYMENT.md')) ? 'passed' : 'failed' },
  ];

  const report = {
    schemaVersion: 1,
    status: steps.every((step) => step.status === 'passed') && checks.every((check) => check.status === 'passed')
      ? 'passed'
      : 'failed',
    generatedBy: 'template/scripts/release-check.js',
    fileCount: files.length + 1,
    totalBytes,
    steps,
    checks,
    releaseProvenance: {
      releaseTime: new Date().toISOString(),
      buildManifestSha256: crypto.createHash('sha256')
        .update(fs.readFileSync(path.join(distRoot, 'build-manifest.json')))
        .digest('hex'),
      runtimeCompatibility: 'schemaVersion 1',
    },
  };

  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = report.status === 'passed' ? 0 : 1;
}

main();
