'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const repositoryRoot = path.join(__dirname, '..', '..');
const appRoot = path.join(__dirname, '..', 'app');
const distRoot = path.join(repositoryRoot, 'dist');

function copyDirectory(source, target, excludedFiles = []) {
  fs.mkdirSync(target, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    if (!entry.isDirectory() && excludedFiles.includes(entry.name)) continue;
    const sourcePath = path.join(source, entry.name);
    const targetPath = path.join(target, entry.name);
    if (entry.isDirectory()) copyDirectory(sourcePath, targetPath);
    else fs.copyFileSync(sourcePath, targetPath);
  }
}

function collectFiles(directory, files = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) collectFiles(entryPath, files);
    else files.push(entryPath);
  }
  return files;
}

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function main() {
  const includeDevelopment = process.argv.includes('--include-development');
  fs.rmSync(distRoot, { recursive: true, force: true });
  fs.mkdirSync(distRoot, { recursive: true });

  const sourceCatalog = JSON.parse(fs.readFileSync(path.join(appRoot, 'courses.json'), 'utf8'));
  const publishedCourses = [];

  sourceCatalog.courses.forEach((course) => {
    if (course.status !== 'production' && !(includeDevelopment && course.status === 'development')) return;
    const routePath = path.join(repositoryRoot, course.route);
    const runtimeRoot = path.dirname(routePath);
    const routeTarget = path.join(distRoot, 'courses', course.id);
    if (!fs.existsSync(routePath)) throw new Error(`course ${course.id} route is missing: ${course.route}`);
    if (fs.existsSync(routeTarget)) throw new Error(`course route collision: ${course.id}`);

    copyDirectory(runtimeRoot, routeTarget, ['courses.html', 'courses.json']);
    publishedCourses.push({
      id: course.id,
      name: course.name,
      version: course.version,
      status: course.status,
      route: `./courses/${course.id}/${path.basename(routePath)}`,
    });
  });

  if (!publishedCourses.length) throw new Error('no production-status courses were selected for publication');

  fs.copyFileSync(path.join(appRoot, 'courses.html'), path.join(distRoot, 'courses.html'));
  fs.copyFileSync(path.join(appRoot, 'courses.html'), path.join(distRoot, 'index.html'));
  fs.mkdirSync(path.join(distRoot, 'css'), { recursive: true });
  fs.copyFileSync(path.join(appRoot, 'css', 'style.css'), path.join(distRoot, 'css', 'style.css'));
  fs.writeFileSync(path.join(distRoot, 'courses.json'), `${JSON.stringify({
    schemaVersion: 1,
    courses: publishedCourses,
  }, null, 2)}\n`);

  const files = collectFiles(distRoot)
    .map((filePath) => path.relative(distRoot, filePath))
    .sort((a, b) => a.localeCompare(b));
  const manifest = files.map((relativePath) => ({
    file: relativePath,
    sha256: sha256(path.join(distRoot, relativePath)),
  }));
  fs.writeFileSync(path.join(distRoot, 'build-manifest.json'), `${JSON.stringify({
    schemaVersion: 1,
    files: manifest,
  }, null, 2)}\n`);

  const required = [
    'index.html',
    'courses.html',
    'courses.json',
    'build-manifest.json',
    ...publishedCourses.map((course) => `courses/${course.id}/index.html`),
  ...publishedCourses.map((course) => `courses/${course.id}/course-manifest.json`),
  ];
  const missing = required.filter((file) => !fs.existsSync(path.join(distRoot, file)));
  if (missing.length) throw new Error(`dist missing required files: ${missing.join(', ')}`);
  if (!publishedCourses.every((course) => course.route.startsWith('./courses/'))) {
    throw new Error('dist catalog route is not isolated');
  }

  console.log(`published deterministic multi-course static site: ${path.relative(process.cwd(), distRoot)}`);
  console.log(`courses: ${publishedCourses.length}`);
  console.log(`files: ${files.length}`);
}

main();
