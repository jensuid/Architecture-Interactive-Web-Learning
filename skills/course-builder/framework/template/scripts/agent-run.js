'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const templateRoot = path.join(__dirname, '..');
const reportPath = path.join(templateRoot, 'tests', 'generated', 'agent-run.json');

function runStep(name, command) {
  const result = spawnSync(process.execPath, command, { cwd: templateRoot, encoding: 'utf8' });
  return {
    name,
    command: command.join(' '),
    status: result.status === 0 ? 'passed' : 'failed',
    exitCode: result.status,
    output: (result.stdout || result.stderr || '').trim().split(/\r?\n/).slice(-20),
  };
}

function main() {
  if (process.argv.includes('--check')) {
    const reportPath = path.join(templateRoot, 'tests', 'generated', 'agent-run.json');
    let status = 'failed';
    try {
      status = JSON.parse(fs.readFileSync(reportPath, 'utf8')).status;
    } catch {
      status = 'failed';
    }
    console.log(JSON.stringify({ schemaVersion: 1, status }, null, 2));
    process.exitCode = status === 'success' ? 0 : 1;
    return;
  }
  const steps = [
    runStep('manifest-compiler-check', ['scripts/compile-course.js', '--check']),
    runStep('manifest-schema-fixtures', ['tests/manifest-schema.js']),
    runStep('course-factory', ['tests/course-factory.js']),
    runStep('catalog-compiler', ['scripts/compile-catalog.js']),
    runStep('course-validation', ['tests/validate-course.js']),
    runStep('unit-tests', ['tests/unit.js']),
    runStep('headless-course', ['tests/headless.js']),
    runStep('production-check', ['scripts/production-check.js']),
    runStep('multi-course-validation', ['scripts/validate-courses.js']),
    runStep('catalog-determinism', ['scripts/compile-catalog.js']),
  runStep('publish', ['scripts/publish.js', '--include-development']),
    runStep('publish-verification', ['scripts/verify-publish.js']),
    (() => ({
      name: 'accessibility-report',
      command: 'tests/generated/accessibility-report.json',
      status: (() => {
        try {
          return JSON.parse(fs.readFileSync(path.join(templateRoot, 'tests', 'generated', 'accessibility-report.json'), 'utf8')).status;
        } catch {
          return 'failed';
        }
      })(),
      exitCode: 0,
      output: [],
    }))(),
    runStep('release-readiness', ['scripts/release-check.js']),
  ];
  const report = {
    schemaVersion: 1,
    status: steps.every((step) => step.status === 'passed') ? 'success' : 'failed',
    generatedBy: 'template/scripts/agent-run.js',
    steps,
  };
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = report.status === 'success' ? 0 : 1;
}

main();
