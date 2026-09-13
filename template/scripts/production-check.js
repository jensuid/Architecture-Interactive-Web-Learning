'use strict';

const fs = require('fs');
const path = require('path');

const templateRoot = path.join(__dirname, '..');
const appRoot = path.join(templateRoot, 'app');
const reportPath = path.join(templateRoot, 'tests', 'generated', 'production-report.json');

function collectFiles(directory, extension, files = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === 'vendor' || entry.name === 'node_modules') continue;
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) collectFiles(entryPath, extension, files);
    else if (entry.name.endsWith(extension)) files.push(entryPath);
  }
  return files;
}

function main() {
  const checks = [];
  const add = (name, passed, info = null) => checks.push({ name, status: passed ? 'passed' : 'failed', info });

  const manifestPath = path.join(appRoot, 'course-manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  add('manifest exists', fs.existsSync(manifestPath));
  add('manifest is versioned', manifest.schemaVersion === 1 && Boolean(manifest.course.version));
  add('runtime has index', fs.existsSync(path.join(appRoot, 'index.html')));
  add('runtime has course catalog', fs.existsSync(path.join(appRoot, 'courses.html')) && fs.existsSync(path.join(appRoot, 'courses.json')));
  add('runtime has teacher tool', fs.existsSync(path.join(appRoot, 'teacher.html')));
  add('all module content exists', manifest.modules.every((module) => fs.existsSync(path.join(appRoot, 'content', `${module.id}.md`))));

  const componentFiles = collectFiles(path.join(appRoot, 'js', 'components'), '.js');
  add('all components are non-empty', componentFiles.every((file) => fs.statSync(file).size > 0));

  const runtimeFiles = collectFiles(appRoot, '.js');
  add('no browser runtime network calls', runtimeFiles.every((file) => !/fetch\(['"]https?:/.test(fs.readFileSync(file, 'utf8'))));

  const report = {
    schemaVersion: 1,
    status: checks.every((check) => check.status === 'passed') ? 'passed' : 'failed',
    checks,
  };
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = report.status === 'passed' ? 0 : 1;
}

main();
