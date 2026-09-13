'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const skillRoot = path.join(__dirname, '..');
const sourceRoot = path.join(skillRoot, '..', '..');

function parseArgs(argv) {
  const options = {
    report: null,
    skipCanonical: false,
    skipInitialization: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--report') {
      options.report = argv[index + 1];
      index += 1;
    } else if (value === '--skip-canonical') {
      options.skipCanonical = true;
    } else if (value === '--skip-initialization') {
      options.skipInitialization = true;
    } else if (value === '--help' || value === '-h') {
      options.help = true;
    } else {
      throw new Error(`Unknown option: ${value}`);
    }
  }
  return options;
}

function exists(relativePath) {
  return fs.existsSync(path.join(skillRoot, relativePath));
}

function addCheck(checks, name, passed, details = null) {
  checks.push({ name, status: passed ? 'passed' : 'failed', ...(details ? { details } : {}) });
}

function validateSkillStructure(checks) {
  const required = [
    'SKILL.md',
    'README.md',
    'agents/openai.yaml',
    'references/curriculum-prompt.md',
    'references/coding-agent-prompt.md',
    'references/framework-contract.md',
    'references/user-guide.md',
    'references/mockup-topic-walkthrough.md',
    'templates/curriculum.json',
    'scripts/init.js',
    'scripts/validate.js',
    'framework/AGENT.md',
    'framework/course.yaml',
    'framework/courses.yaml',
    'framework/docs/DEPLOYMENT.md',
    'framework/docs/course-factory-skill-guide.md',
    'framework/docs/topic-course-workflow.md',
    'framework/docs/zero-to-final-guide.md',
    'framework/notes/release-notes.md',
    'framework/.github/workflows/ci.yml',
    'framework/.github/workflows/deploy-pages.yml',
    'framework/template/README.md',
    'framework/template/ARCHITECTURE.md',
    'framework/template/app/index.html',
    'framework/template/app/course-manifest.json',
    'framework/template/app/courses.html',
    'framework/template/app/courses.json',
    'framework/template/app/css/style.css',
    'framework/template/app/js/shell.js',
    'framework/template/app/js/renderer.js',
    'framework/template/app/js/main.js',
    'framework/template/app/js/vendor/chart.umd.js',
    'framework/template/scripts/agent-run.js',
    'framework/template/scripts/compile-catalog.js',
    'framework/template/scripts/compile-course.js',
    'framework/template/scripts/course-factory.js',
    'framework/template/scripts/lib/manifest-schema.js',
    'framework/template/scripts/production-check.js',
    'framework/template/scripts/publish.js',
    'framework/template/scripts/release-check.js',
    'framework/template/scripts/validate-courses.js',
    'framework/template/scripts/verify-publish.js',
    'framework/template/tests/course-factory.js',
    'framework/template/tests/headless.js',
    'framework/template/tests/manifest-schema.js',
    'framework/template/tests/package.json',
    'framework/template/tests/package-lock.json',
    'framework/template/tests/unit.js',
    'framework/template/tests/validate-course.js',
  ];
  const missing = required.filter((relativePath) => !exists(relativePath));
  addCheck(
    checks,
    'skill-structure',
    missing.length === 0,
    missing.length ? { missing } : null,
  );
  return missing.length === 0;
}

function validateCompleteness(checks) {
  const required = [
    'framework/template/scripts/agent-run.js',
    'framework/template/scripts/compile-catalog.js',
    'framework/template/scripts/compile-course.js',
    'framework/template/scripts/course-factory.js',
    'framework/template/scripts/lib/manifest-schema.js',
    'framework/template/scripts/production-check.js',
    'framework/template/scripts/publish.js',
    'framework/template/scripts/release-check.js',
    'framework/template/scripts/validate-courses.js',
    'framework/template/scripts/verify-publish.js',
    'framework/template/tests/fixtures/course-factory/curriculum.json',
    'framework/template/tests/package-lock.json',
  ];
  const missing = required.filter((relativePath) => !exists(relativePath));
  const vendor = [
    'chart.umd.js',
    'highlight.min.js',
    'katex.min.js',
    'marked.min.js',
  ].every((file) => exists(`framework/template/app/js/vendor/${file}`));
  const runtimeComplete = [
    'framework/template/app/index.html',
    'framework/template/app/course-manifest.json',
    'framework/template/app/content/home.md',
    'framework/template/app/js/shell.js',
    'framework/template/app/js/renderer.js',
    'framework/template/app/js/main.js',
  ].every((relativePath) => exists(relativePath));
  const testsComplete = fs.existsSync(path.join(skillRoot, 'framework', 'template', 'tests', 'fixtures'));
  const passed = missing.length === 0 && vendor && runtimeComplete && testsComplete;
  addCheck(
    checks,
    'packaged-framework-completeness',
    passed,
    missing.length ? { missing } : null,
  );
  return passed;
}

function validateExclusions(checks) {
  const prohibitedFiles = [];
  const prohibitedNames = new Set(['node_modules', 'dist', 'graphify-out', '.git']);
  function walk(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (prohibitedNames.has(entry.name)) {
        prohibitedFiles.push(path.relative(skillRoot, path.join(directory, entry.name)));
      } else if (entry.isDirectory()) {
        walk(path.join(directory, entry.name));
      } else if (path.dirname(path.join(directory, entry.name)).endsWith(path.join('template', 'tests', 'generated'))) {
        prohibitedFiles.push(path.relative(skillRoot, path.join(directory, entry.name)));
      } else if (/(^|\/)(agent-run|release-report|accessibility-report|production-report|publish-report|courses-report|course-factory-report|content-lint|domain-validation)\.json$/.test(path.join(directory, entry.name))) {
        prohibitedFiles.push(path.relative(skillRoot, path.join(directory, entry.name)));
      }
    }
  }
  walk(skillRoot);
  addCheck(
    checks,
    'portable-package-exclusions',
    prohibitedFiles.length === 0,
    prohibitedFiles.length ? { prohibitedFiles } : null,
  );
  return prohibitedFiles.length === 0;
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', env: process.env });
  return {
    status: result.status,
    command: [command, ...args].join(' '),
    output: `${result.stdout || ''}${result.stderr || ''}`.trim(),
  };
}

function validateCanonicalPipeline(checks) {
  const pipelinePath = path.join(sourceRoot, 'template', 'scripts', 'agent-run.js');
  if (!fs.existsSync(pipelinePath)) {
    addCheck(checks, 'canonical-source-pipeline', false, { missing: path.relative(process.cwd(), pipelinePath) });
    return false;
  }
  const result = run(process.execPath, [pipelinePath], sourceRoot);
  const reportPath = path.join(sourceRoot, 'template', 'tests', 'generated', 'agent-run.json');
  let reportStatus = null;
  try {
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    reportStatus = report.status;
  } catch {
    reportStatus = null;
  }
  const passed = result.status === 0 && reportStatus === 'success';
  addCheck(checks, 'canonical-source-pipeline', passed, {
    status: reportStatus,
    exitCode: result.status,
    output: result.output.split(/\r?\n/).slice(-20),
  });
  return passed;
}

function validateTemporaryInitialization(checks) {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'course-factory-portable-'));
  const reportPath = path.join(temporaryRoot, 'initialization-report.json');
  const initPath = path.join(skillRoot, 'scripts', 'init.js');
  const result = run(process.execPath, [
    initPath,
    '--target',
    temporaryRoot,
    '--validate',
    '--report',
    reportPath,
  ], sourceRoot);
  let initStatus = null;
  try {
    initStatus = JSON.parse(fs.readFileSync(reportPath, 'utf8')).status;
  } catch {
    initStatus = null;
  }
  const portableRunPath = path.join(temporaryRoot, 'template', 'tests', 'generated', 'agent-run.json');
  let portableRunStatus = null;
  let portableRunReport = null;
  try {
    portableRunReport = JSON.parse(fs.readFileSync(portableRunPath, 'utf8'));
    portableRunStatus = portableRunReport.status;
  } catch {
    portableRunStatus = null;
  }
  const passed = result.status === 0 && initStatus === 'passed' && portableRunStatus === 'success';
  addCheck(checks, 'temporary-portable-initialization', passed, {
    temporaryRoot,
    initializationStatus: initStatus,
    canonicalPipelineStatus: portableRunStatus,
    canonicalPipelineReport: portableRunReport,
    exitCode: result.status,
    output: result.output.split(/\r?\n/).slice(-20),
  });
  if (passed) {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
  return passed;
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
    console.log(`Usage: node ${path.relative(process.cwd(), __filename)} [options]

Options:
  --report <path>          Write JSON validation report.
  --skip-canonical         Skip source-repository canonical validation.
  --skip-initialization    Skip temporary initialization validation.
  -h, --help               Show this help.
`);
    return;
  }

  const checks = [];
  const structure = validateSkillStructure(checks);
  const completeness = validateCompleteness(checks);
  const exclusions = validateExclusions(checks);
  const canonical = options.skipCanonical || validateCanonicalPipeline(checks);
  const initialization = options.skipInitialization || validateTemporaryInitialization(checks);
  const status = structure && completeness && exclusions && canonical && initialization ? 'passed' : 'failed';
  const report = {
    schemaVersion: 1,
    status,
    generatedBy: 'course-factory-portable/scripts/validate.js',
    checks,
  };
  if (options.report) {
    const reportPath = path.resolve(process.cwd(), options.report);
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  }
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = status === 'passed' ? 0 : 1;
}

main();
