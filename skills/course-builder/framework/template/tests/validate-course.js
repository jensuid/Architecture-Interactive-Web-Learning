'use strict';

const fs = require('fs');
const path = require('path');
const { parseCourseSource, validateCourse } = require('../scripts/lib/manifest-schema');

const templateRoot = path.join(__dirname, '..');
const sourceManifestPath = path.join(templateRoot, '..', 'course.yaml');
const runtimeManifestPath = path.join(templateRoot, 'app', 'course-manifest.json');
const appContentRoot = path.join(templateRoot, 'app', 'content');
const lintReportPath = path.join(templateRoot, 'tests', 'generated', 'content-lint.json');
const appRoot = path.join(templateRoot, 'app');

function fail(message) {
  console.error(`✘ ${message}`);
  process.exitCode = 1;
}

function validateManifest(manifest, label) {
  return validateCourse(manifest, { contentRoot: appContentRoot, appRoot })
    .map((message) => `[${label}] ${message}`);
}

function main() {
  const { execFileSync } = require('child_process');
  execFileSync(process.execPath, [path.join(templateRoot, 'scripts', 'compile-course.js'), '--check'], { stdio: 'inherit' });
  const source = parseCourseSource(sourceManifestPath, appContentRoot);
  const runtime = JSON.parse(fs.readFileSync(runtimeManifestPath, 'utf8'));
  const sourceErrors = validateManifest(source, 'course.yaml');
  const runtimeErrors = validateManifest(runtime, 'course-manifest.json');
  const synchronizationErrors = [];

  if (JSON.stringify(source) !== JSON.stringify(runtime)) {
    synchronizationErrors.push('[sync] course.yaml and course-manifest.json must match');
  }

  const errors = [...sourceErrors, ...runtimeErrors, ...synchronizationErrors];
  const lint = JSON.parse(fs.readFileSync(lintReportPath, 'utf8'));
  const requiredLintChecks = ['quiz-schema', 'component-registry', 'media-assets', 'module-routes', 'datasets'];
  const missingLintChecks = requiredLintChecks.filter((check) => !lint.checksRun.includes(check));
  if (missingLintChecks.length) errors.push(`[content-lint] missing checks: ${missingLintChecks.join(', ')}`);
  if (Array.isArray(lint.errors) && lint.errors.length) lint.errors.forEach((message) => errors.push(`[content-lint] ${message}`));
  if (errors.length) {
    errors.forEach(fail);
    console.error(`course manifest validation: FAILED (${errors.length} error${errors.length === 1 ? '' : 's'})`);
    return;
  }

  console.log(`course manifest validation: PASSED (${source.modules.length} modules)`);
}

main();
