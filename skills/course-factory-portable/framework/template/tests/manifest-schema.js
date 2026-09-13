'use strict';

const path = require('path');
const fs = require('fs');
const {
  parseCourseSource,
  parseCatalogSource,
  validateCourse,
  validateCatalog,
} = require('../scripts/lib/manifest-schema');

const fixtureRoot = path.join(__dirname, 'fixtures', 'manifest-schema');
const repositoryRoot = path.join(__dirname, '..', '..');
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

const validCoursePath = path.join(fixtureRoot, 'valid-course.yaml');
const fixtureContentRoot = path.join(fixtureRoot, 'content');
const parsedCourse = parseCourseSource(validCoursePath, fixtureContentRoot);
t('valid course fixture parses', parsedCourse.course.id === 'fixture-course' && parsedCourse.modules.length === 1);
t('valid course fixture validates', validateCourse(parsedCourse, {
  contentRoot: fixtureContentRoot,
  appRoot: path.join(__dirname, '..', 'app'),
}).length === 0);

const invalidCourse = parseCourseSource(path.join(fixtureRoot, 'invalid-course.yaml'), fixtureContentRoot);
const invalidCourseErrors = validateCourse(invalidCourse);
t('invalid course ID is rejected', invalidCourseErrors.some((message) => message.includes('course.id contains invalid characters')));
t('duplicate objective IDs are rejected', invalidCourseErrors.some((message) => message.includes('duplicate objective IDs')));
t('unknown final quiz host is rejected', invalidCourseErrors.some((message) => message.includes('finalQuizHost must be null')));

const invalidMap = JSON.parse(fs.readFileSync(path.join(fixtureRoot, 'invalid-objective-map.json'), 'utf8'));
const invalidMapErrors = validateCourse(invalidMap);
t('unknown objective reference is rejected', invalidMapErrors.some((message) => message.includes('references unknown objective obj-two')));

const unmapped = JSON.parse(fs.readFileSync(path.join(fixtureRoot, 'unmapped-objective-map.json'), 'utf8'));
const unmappedErrors = validateCourse(unmapped);
t('unmapped objective is rejected', unmappedErrors.some((message) => message.includes('obj-one has no checkpoint')));

const validCatalog = parseCatalogSource(path.join(fixtureRoot, 'valid-catalog.yaml'));
t('valid catalog fixture validates', validateCatalog(validCatalog, repositoryRoot).length === 0);

const invalidCatalog = parseCatalogSource(path.join(fixtureRoot, 'invalid-catalog.yaml'));
const invalidCatalogErrors = validateCatalog(invalidCatalog, repositoryRoot);
t('duplicate catalog IDs are rejected', invalidCatalogErrors.some((message) => message.includes('duplicate course IDs')));
t('duplicate catalog routes are rejected', invalidCatalogErrors.some((message) => message.includes('duplicate course routes')));

console.log(`\nmanifest schema: ${pass} passed, ${fail} failed`);
process.exitCode = fail ? 1 : 0;
