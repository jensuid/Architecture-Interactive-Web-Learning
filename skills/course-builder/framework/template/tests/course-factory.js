'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const templateRoot = path.join(__dirname, '..');
const repositoryRoot = path.join(templateRoot, '..');
const inputPath = path.join(__dirname, 'fixtures', 'course-factory', 'curriculum.json');
let pass = 0;
let fail = 0;
const t = (name, ok, info) => {
  if (ok) {
    pass += 1;
    console.log(`  ✔ ${name}`);
  } else {
    fail += 1;
    console.log(`  ✘ ${name}${info ? ` — ${info}` : ''}`);
  }
};

const output = execFileSync(process.execPath, [path.join(templateRoot, 'scripts', 'course-factory.js'), inputPath], {
  cwd: templateRoot,
  encoding: 'utf8',
});
const report = JSON.parse(output);
t('factory report succeeds', report.status === 'success');
t(
  'factory report has deterministic input checksum',
  report.inputSha256 === crypto.createHash('sha256').update(fs.readFileSync(inputPath)).digest('hex'),
);

const generatedRoot = path.join(repositoryRoot, 'courses', 'factory-sample-course');
t('generated course exists', fs.existsSync(path.join(generatedRoot, 'index.html')));
t('generated manifest exists', fs.existsSync(path.join(generatedRoot, 'course-manifest.json')));
t('generated module exists', fs.existsSync(path.join(generatedRoot, 'content', 'M1.md')));
t('generated module has flow-section separator', fs.readFileSync(path.join(generatedRoot, 'content', 'M1.md'), 'utf8').includes('\n---\n\n## Checkpoint'));
t('catalog contains generated course', fs.readFileSync(path.join(repositoryRoot, 'courses.yaml'), 'utf8').includes('factory-sample-course'));
t('generated course does not contain a runtime catalog', !fs.existsSync(path.join(generatedRoot, 'courses.html')) && !fs.existsSync(path.join(generatedRoot, 'courses.json')));
t('generated theme storage is course-scoped', fs.readFileSync(path.join(generatedRoot, 'index.html'), 'utf8').includes('factory-sample-course-theme'));
t(
  'generated course title is course-specific',
  fs.readFileSync(path.join(generatedRoot, 'index.html'), 'utf8').includes('<title>Factory Sample Course</title>'),
);
t(
  'generated teacher title is course-specific',
  fs.readFileSync(path.join(generatedRoot, 'teacher.html'), 'utf8').includes('<title>Teacher Progress Viewer — Factory Sample Course</title>'),
);
t(
  'generated teacher runtime uses the course name',
  fs.readFileSync(path.join(generatedRoot, 'js', 'teacher.js'), 'utf8').includes('const COURSE_NAME = "Factory Sample Course";'),
);

const repeated = execFileSync(process.execPath, [path.join(templateRoot, 'scripts', 'course-factory.js'), inputPath], {
  cwd: templateRoot,
  encoding: 'utf8',
});
t('repeat generation is idempotent', repeated === output);

console.log(`\ncourse factory: ${pass} passed, ${fail} failed`);
process.exitCode = fail ? 1 : 0;
