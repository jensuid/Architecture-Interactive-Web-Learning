'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const skillRoot = path.join(__dirname, '..');
const frameworkRoot = path.join(skillRoot, 'framework');

function parseArgs(argv) {
  const options = { target: null, force: false, install: false, validate: false };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--help' || value === '-h') {
      options.help = true;
    } else if (value === '--target') {
      options.target = argv[index + 1];
      index += 1;
    } else if (value === '--report') {
      options.report = argv[index + 1];
      index += 1;
    } else if (value === '--force') {
      options.force = true;
    } else if (value === '--install') {
      options.install = true;
    } else if (value === '--no-install') {
      options.install = false;
    } else if (value === '--validate') {
      options.validate = true;
    } else {
      throw new Error(`Unknown option: ${value}`);
    }
  }
  if (!options.help && (!options.target || typeof options.target !== 'string')) {
    throw new Error('Missing required --target <path>');
  }
  return options;
}

function help() {
  console.log(`Usage: node ${path.relative(process.cwd(), __filename)} --target <destination> [options]

Options:
  --target <path>   Destination repository.
  --force           Replace existing packaged framework paths.
  --install         Run npm ci in template/tests.
  --no-install      Skip npm ci in template/tests.
  --validate        Run the full canonical pipeline after initialization.
  --report <path>   Write a machine-readable initialization report.
  -h, --help        Show this help.
`);
}

function fail(message) {
  console.error(`Initialization failed: ${message}`);
  process.exitCode = 1;
  return false;
}

function frameworkTargets(target) {
  return [
    'AGENT.md',
    'Proposed-Architecture.md',
    'course.yaml',
    'courses.yaml',
    '.github',
    'docs',
    'notes',
    'template',
  ].map((relativePath) => path.join(target, relativePath));
}

function copyReleaseNotes(target, force) {
  fs.mkdirSync(path.join(target, 'notes'), { recursive: true });
  copyContents(
    path.join(frameworkRoot, 'notes', 'release-notes.md'),
    path.join(target, 'notes', 'release-notes.md'),
    force,
  );
}

function copyContents(source, destination, force) {
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  if (fs.existsSync(destination)) {
    if (!force) throw new Error(`Destination exists: ${destination}`);
    fs.rmSync(destination, { recursive: true, force: true });
  }
  fs.cpSync(source, destination, { recursive: true, verbatimSymlinks: true });
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    env: process.env,
  });
  return {
    status: result.status,
    command: [command, ...args].join(' '),
    output: `${result.stdout || ''}${result.stderr || ''}`.trim(),
  };
}

function validateTarget(target) {
  const reportPath = path.join(target, 'template', 'tests', 'generated', 'agent-run.json');
  try {
    return JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  } catch {
    return null;
  }
}

function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    console.error('Use --help for usage.');
    process.exitCode = 1;
    return;
  }
  if (options.help) {
    help();
    return;
  }

  const target = path.resolve(process.cwd(), options.target);
  const validationPath = path.join(target, 'template', 'scripts', 'agent-run.js');
  const steps = [];
  try {
    fs.mkdirSync(target, { recursive: true });
    const conflicts = frameworkTargets(target).filter((destination) => fs.existsSync(destination));
    if (conflicts.length && !options.force) {
      throw new Error(
        `${conflicts.map((destination) => path.relative(target, destination)).join(', ')} already exist. Re-run with --force to replace only these packaged framework paths.`,
      );
    }
    steps.push({ name: 'copy-framework', status: 'passed' });
    copyContents(path.join(frameworkRoot, 'AGENT.md'), path.join(target, 'AGENT.md'), options.force);
    if (fs.existsSync(path.join(frameworkRoot, 'Proposed-Architecture.md'))) {
      copyContents(path.join(frameworkRoot, 'Proposed-Architecture.md'), path.join(target, 'Proposed-Architecture.md'), options.force);
    }
    copyContents(path.join(frameworkRoot, 'course.yaml'), path.join(target, 'course.yaml'), options.force);
    copyContents(path.join(frameworkRoot, 'courses.yaml'), path.join(target, 'courses.yaml'), options.force);
    copyContents(path.join(frameworkRoot, '.github'), path.join(target, '.github'), options.force);
    copyContents(path.join(frameworkRoot, 'docs'), path.join(target, 'docs'), options.force);
    copyContents(path.join(frameworkRoot, 'template'), path.join(target, 'template'), options.force);
    copyReleaseNotes(target, options.force);

    if (options.install) {
      const install = run('npm', ['ci'], path.join(target, 'template', 'tests'));
      steps.push({
        name: 'install-test-dependencies',
        status: install.status === 0 ? 'passed' : 'failed',
        command: install.command,
        output: install.output.split(/\r?\n/).slice(-20),
      });
      if (install.status !== 0) throw new Error(`npm ci failed with exit code ${install.status}`);
    } else {
      steps.push({ name: 'install-test-dependencies', status: 'skipped' });
    }

    let pipelineStatus = options.validate ? 'failed' : 'skipped';
    let pipelineOutput = null;
    if (options.validate) {
      const coursePreparation = run(
        process.execPath,
        [path.join(target, 'template', 'scripts', 'compile-course.js')],
        path.join(target, 'template'),
      );
      const catalogPreparation = run(
        process.execPath,
        [path.join(target, 'template', 'scripts', 'compile-catalog.js')],
        path.join(target, 'template'),
      );
      steps.push({
        name: 'prepare-validation-state',
        status: coursePreparation.status === 0 && catalogPreparation.status === 0 ? 'passed' : 'failed',
        command: [coursePreparation.command, catalogPreparation.command].join(' && '),
        output: `${coursePreparation.output}\n${catalogPreparation.output}`.split(/\r?\n/).slice(-20),
      });
      if (coursePreparation.status !== 0 || catalogPreparation.status !== 0) {
        throw new Error(`Validation state preparation failed with exit codes ${coursePreparation.status}/${catalogPreparation.status}`);
      }
      const pipeline = run(process.execPath, [validationPath], target);
      pipelineStatus = pipeline.status === 0 ? 'passed' : 'failed';
      pipelineOutput = pipeline.output.split(/\r?\n/).slice(-20);
      if (pipeline.status !== 0) {
        throw new Error(`Canonical pipeline failed with exit code ${pipeline.status}`);
      }
    }
      steps.push({
        name: 'canonical-pipeline',
        status: pipelineStatus,
        command: options.validate ? 'template/scripts/agent-run.js' : null,
        output: pipelineOutput || [],
    });
  } catch (error) {
    steps.push({ name: 'initialize', status: 'failed', error: error.message });
    const report = {
      schemaVersion: 1,
      status: 'failed',
      target,
      steps,
      generatedBy: 'course-builder/scripts/init.js',
    };
    if (options.report) {
      fs.mkdirSync(path.dirname(path.resolve(process.cwd(), options.report)), { recursive: true });
      fs.writeFileSync(path.resolve(process.cwd(), options.report), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    }
    fail(error.message);
    return;
  }

  const report = {
    schemaVersion: 1,
    status: steps.some((step) => step.status === 'failed') ? 'failed' : 'passed',
    target,
    steps,
    generatedBy: 'course-builder/scripts/init.js',
  };
  if (options.report) {
    fs.mkdirSync(path.dirname(path.resolve(process.cwd(), options.report)), { recursive: true });
    fs.writeFileSync(path.resolve(process.cwd(), options.report), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  }
  console.log(JSON.stringify(report, null, 2));
}

main();
