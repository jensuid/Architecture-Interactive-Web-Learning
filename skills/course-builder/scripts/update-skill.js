'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const https = require('https');
const zlib = require('zlib');
const { spawnSync } = require('child_process');

const skillRoot = path.join(__dirname, '..');
const defaultTarget = path.join(os.homedir(), '.codex', 'skills', 'course-builder');
const sourceRepository = 'https://github.com/jensuid/course-builder.git';
const repositoryName = 'jensuid/course-builder';
const apiRoot = 'https://api.github.com';
const maxJsonBytes = 10 * 1024 * 1024;
const maxArchiveBytes = 100 * 1024 * 1024;
const maxFileBytes = 50 * 1024 * 1024;
const maxEntries = 10000;
const requiredSkillFiles = [
  'SKILL.md',
  'README.md',
  'references/user-guide.md',
  'scripts/init.js',
  'scripts/package.js',
  'scripts/validate.js',
  'scripts/update-skill.js',
  'skill-version.json',
  'framework/package-manifest.json',
];
const prohibitedNames = new Set(['.DS_Store', '.git', 'dist', 'graphify-out', 'node_modules']);

function parseArgs(argv) {
  const options = {
    ref: null,
    latest: false,
    confirm: false,
    dryRun: false,
    target: null,
    report: null,
    help: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--ref') {
      options.ref = argv[index + 1];
      index += 1;
    } else if (value === '--latest') options.latest = true;
    else if (value === '--confirm') options.confirm = true;
    else if (value === '--dry-run') options.dryRun = true;
    else if (value === '--target') {
      options.target = argv[index + 1];
      index += 1;
    } else if (value === '--report') {
      options.report = argv[index + 1];
      index += 1;
    } else if (value === '--help' || value === '-h') options.help = true;
    else throw new Error(`Unknown option: ${value}`);
  }
  if (options.ref !== null && options.latest) throw new Error('--ref and --latest are mutually exclusive');
  if (options.ref !== null && (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(options.ref) || options.ref.includes('..'))) {
    throw new Error('Invalid release tag. Only a exact GitHub release tag is allowed.');
  }
  if (options.ref !== null && (options.ref.startsWith('refs/') || /^[0-9a-f]{7,40}$/i.test(options.ref))) {
    throw new Error('Release refs, branches, and commit SHAs are not supported. Use an exact release tag.');
  }
  if (options.dryRun && options.ref === null && !options.latest) {
    throw new Error('--dry-run requires --ref <tag> or --latest --confirm');
  }
  if (options.latest && !options.confirm) throw new Error('--latest requires --confirm');
  if (options.confirm && options.ref === null && !options.latest) {
    throw new Error('--confirm requires --ref <tag> or --latest');
  }
  return options;
}

function help() {
  console.log(`Usage: node ${path.relative(process.cwd(), __filename)} [options]

Options:
  (no arguments)             Show installed and latest release information.
  --ref <tag>                Update to an exact tagged release.
  --latest --confirm        Update to the latest stable release.
  --dry-run                  Download, verify, extract, and validate only.
  --target <path>            Skill installation path.
  --report <path>           Write a machine-readable JSON report.
  -h, --help                 Show this help.
`);
}

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function equalHex(left, right) {
  return left.length === right.length && crypto.timingSafeEqual(Buffer.from(left, 'utf8'), Buffer.from(right, 'utf8'));
}

function requestBuffer(url, options = {}, redirects = 0) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') {
      reject(new Error(`Only HTTPS URLs are allowed: ${url}`));
      return;
    }
    const request = https.request(parsed, {
      method: options.method || 'GET',
      headers: {
        'user-agent': 'course-builder-updater',
        accept: options.accept || 'application/octet-stream',
        ...(options.headers || {}),
      },
      timeout: 30000,
    }, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400) {
        response.resume();
        const location = response.headers.location;
        if (!location || redirects >= 5) {
          reject(new Error('Missing or too many HTTPS redirects'));
          return;
        }
        requestBuffer(new URL(location, parsed).toString(), options, redirects + 1).then(resolve, reject);
        return;
      }
      if (response.statusCode < 200 || response.statusCode >= 300) {
        response.resume();
        reject(new Error(`Request failed with HTTP ${response.statusCode}: ${url}`));
        return;
      }
      const chunks = [];
      let size = 0;
      response.on('data', (chunk) => {
        size += chunk.length;
        if (size > options.maxBytes) {
          request.destroy(new Error(`Response exceeds ${options.maxBytes} bytes`));
          return;
        }
        chunks.push(chunk);
      });
      response.on('end', () => resolve({ bytes: Buffer.concat(chunks), headers: response.headers, url: parsed.toString() }));
      response.on('error', reject);
    });
    request.on('timeout', () => request.destroy(new Error('Request timed out')));
    request.on('error', reject);
    request.end();
  });
}

async function githubJson(pathname) {
  const response = await requestBuffer(`${apiRoot}${pathname}`, {
    accept: 'application/vnd.github+json',
    maxBytes: maxJsonBytes,
  });
  try {
    return JSON.parse(response.bytes.toString('utf8'));
  } catch (error) {
    throw new Error(`GitHub returned invalid JSON for ${pathname}`);
  }
}

async function downloadAsset(asset, expectedSha256) {
  const response = await requestBuffer(asset.browser_download_url, {
    accept: 'application/octet-stream',
    maxBytes: asset.size,
  });
  if (response.bytes.length !== asset.size) {
    throw new Error(`Asset size mismatch: expected ${asset.size}, received ${response.bytes.length}`);
  }
  const actual = sha256(response.bytes);
  if (!equalHex(actual, expectedSha256)) throw new Error('GitHub asset digest mismatch');
  return response.bytes;
}

function parseOctal(value, field) {
  const text = value.toString('latin1').replace(/[\0 ]/g, '');
  if (!/^[0-7]*$/.test(text)) throw new Error(`Invalid tar ${field} field`);
  if (text === '') return 0;
  const parsed = Number.parseInt(text, 8);
  if (!Number.isSafeInteger(parsed)) throw new Error(`Invalid tar ${field} field`);
  return parsed;
}

function tarName(header) {
  const name = header.toString('latin1', 0, 100).replace(/\0.*$/s, '');
  const prefix = header.toString('latin1', 345, 500).replace(/\0.*$/s, '');
  return prefix ? `${prefix}/${name}` : name;
}

function validateTarHeader(header) {
  const stored = parseOctal(header.subarray(148, 156), 'checksum');
  const calculated = header.subarray(0, 148).reduce((sum, byte) => sum + byte, 0)
    + 32 * 8
    + header.subarray(156, 512).reduce((sum, byte) => sum + byte, 0);
  if (stored !== calculated) throw new Error('Invalid tar header checksum');
}

function safeRelativePath(value) {
  if (!value || value.includes('\\') || value.startsWith('/') || value.includes('\0')) throw new Error(`Unsafe tar path: ${value}`);
  const parts = value.split('/').filter((part) => part && part !== '.');
  if (parts.includes('..') || parts.some((part) => prohibitedNames.has(part))) throw new Error(`Unsafe tar path: ${value}`);
  return parts.join('/');
}

function extractTarGz(archive, destination) {
  const raw = zlib.gunzipSync(archive);
  if (raw.length > maxArchiveBytes) throw new Error('Archive exceeds size limit');
  const entries = new Map();
  let offset = 0;
  let root = null;
  while (offset < raw.length) {
    if (raw.length - offset < 512) throw new Error('Truncated tar header');
    const header = raw.subarray(offset, offset + 512);
    if (header.every((byte) => byte === 0)) break;
    validateTarHeader(header);
    const name = safeRelativePath(tarName(header));
    const size = parseOctal(header.subarray(124, 136), 'size');
    const type = String.fromCharCode(header[156]);
    const linkName = header.toString('latin1', 157, 257).replace(/\0.*$/s, '');
    if (size > maxFileBytes) throw new Error(`Tar file exceeds size limit: ${name}`);
    if (linkName) throw new Error(`Tar links are not supported: ${name}`);
    const mode = parseOctal(header.subarray(100, 108), 'mode') & 0o7777;
    if (mode & 0o7000) throw new Error(`Unsupported tar mode for ${name}`);
    const contentStart = offset + 512;
    const contentEnd = contentStart + size;
    if (contentEnd > raw.length) throw new Error(`Truncated tar entry: ${name}`);
    if (entries.has(name)) throw new Error(`Duplicate tar entry: ${name}`);
    if (type !== '0' && type !== '\0' && type !== '5') throw new Error(`Unsupported tar entry type for ${name}`);
    const relative = safeRelativePath(name);
    const top = relative.split('/')[0];
    root = root || top;
    if (top !== root) throw new Error(`Archive has multiple top-level directories: ${root}, ${top}`);
    entries.set(name, {
      relative,
      directory: type === '5',
      mode,
      bytes: type === '5' ? null : raw.subarray(contentStart, contentEnd),
    });
    offset = contentEnd + ((512 - (size % 512)) % 512);
    if (entries.size > maxEntries) throw new Error('Archive exceeds entry limit');
  }
  if (!root || entries.size === 0) throw new Error('Archive is empty');
  for (const required of requiredSkillFiles) {
    if (!entries.has(`${root}/${required}`)) throw new Error(`Release archive is missing ${required}`);
  }
  for (const [name, entry] of entries) {
    const relative = entry.relative;
    if (relative !== root && !relative.startsWith(`${root}/`)) {
      throw new Error(`Entry outside archive root: ${name}`);
    }
    if (entry.directory) {
      fs.mkdirSync(path.join(destination, relative), { recursive: true, mode: 0o700 });
      fs.chmodSync(path.join(destination, relative), 0o700);
    } else {
      const destinationPath = path.join(destination, relative);
      fs.mkdirSync(path.dirname(destinationPath), { recursive: true, mode: 0o700 });
      fs.writeFileSync(destinationPath, entry.bytes, { mode: 0o600 });
      fs.chmodSync(destinationPath, 0o600);
    }
  }
  return path.join(destination, root);
}

function readSkillVersion(root) {
  const metadataPath = path.join(root, 'skill-version.json');
  if (!fs.existsSync(metadataPath)) throw new Error(`Missing skill-version.json in ${root}`);
  const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
  if (metadata.schemaVersion !== 1) throw new Error('Unsupported skill-version schema');
  if (metadata.sourceRepository !== sourceRepository) throw new Error('Unexpected skill source repository');
  if (!/^\d+\.\d+(?:\.\d+)?$/.test(metadata.version)) throw new Error('Invalid skill version');
  if (metadata.releaseTag !== `course-builder-v${metadata.version}`) throw new Error('Skill version and release tag do not match');
  return metadata;
}

function selectAssets(release) {
  if (!release || release.draft || release.prerelease || typeof release.tag_name !== 'string') {
    throw new Error('GitHub release is not a stable published release');
  }
  const tag = release.tag_name;
  const match = /^course-builder-v(\d+\.\d+(?:\.\d+)?)$/.exec(tag);
  if (!match) throw new Error(`Unsupported course-builder release tag: ${tag}`);
  const assets = release.assets || [];
  const archive = assets.find((asset) => asset.name === `course-builder-v${match[1]}.tar.gz`);
  const checksum = assets.find((asset) => asset.name === `course-builder-v${match[1]}.tar.gz.sha256`);
  if (!archive || !checksum) throw new Error(`Release ${tag} is missing its archive or checksum asset`);
  for (const asset of [archive, checksum]) {
    if (asset.state !== 'uploaded' || !Number.isSafeInteger(asset.size) || asset.size < 0) {
      throw new Error(`Release asset is unavailable: ${asset.name}`);
    }
  }
  const digest = /^sha256:([0-9a-f]{64})$/.exec(archive.digest || '');
  const checksumDigest = /^sha256:([0-9a-f]{64})$/.exec(checksum.digest || '');
  if (!digest || !checksumDigest) throw new Error('GitHub release assets do not provide SHA-256 digests');
  return { tag, version: match[1], archive, checksum };
}

async function downloadAndStage(release, workspace) {
  const selected = selectAssets(release);
  const archiveBytes = await downloadAsset(selected.archive, selected.archive.digest.slice(7));
  const sidecarBytes = await downloadAsset(selected.checksum, selected.checksum.digest.slice(7));
  const sidecar = sidecarBytes.toString('latin1');
  if (!/^[0-9a-f]{64}\n$/.test(sidecar)) throw new Error('Invalid checksum sidecar');
  if (!equalHex(sidecar.slice(0, 64), selected.archive.digest.slice(7))) throw new Error('Checksum sidecar does not match release digest');
  const staging = extractTarGz(archiveBytes, workspace.stagingRoot);
  const metadata = readSkillVersion(staging);
  if (metadata.version !== selected.version || metadata.releaseTag !== selected.tag) {
    throw new Error('Staged release metadata does not match the selected GitHub release');
  }
  return { selected, staging, metadata, archiveSha256: sha256(archiveBytes) };
}

function runNode(scriptPath, args, cwd, reportPath) {
  const result = spawnSync(process.execPath, [scriptPath, ...args, '--report', reportPath], {
    cwd,
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
    env: process.env,
  });
  let report = null;
  try {
    report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  } catch (error) {
    report = { status: 'failed', error: `Validation report is missing or invalid: ${error.message}` };
  }
  return {
    exitCode: result.status,
    report,
    stdout: (result.stdout || '').trim(),
    stderr: (result.stderr || '').trim(),
  };
}

function requireValidation(name, result) {
  if (result.exitCode !== 0 || result.report.status !== 'passed') {
    throw new Error(`${name} failed with exit code ${result.exitCode}`);
  }
  return result;
}

function validateStagedSkill(staging, workspace) {
  requireValidation('staged package validation', runNode(
    path.join(staging, 'scripts', 'package.js'),
    ['--check'],
    staging,
    path.join(workspace.reportsRoot, 'staged-package.json'),
  ));
  requireValidation('staged skill validation', runNode(
    path.join(staging, 'scripts', 'validate.js'),
    ['--skip-canonical', '--skip-initialization'],
    staging,
    path.join(workspace.reportsRoot, 'staged-skill.json'),
  ));
}

function validateInstalledSkill(target, workspace, name) {
  requireValidation(name, runNode(
    path.join(target, 'scripts', 'validate.js'),
    ['--skip-canonical', '--skip-initialization'],
    target,
    path.join(workspace.reportsRoot, name),
  ));
}

function nestedPath(parent, child) {
  const relative = path.relative(path.resolve(parent), path.resolve(child));
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function prepareTarget(target) {
  if (!fs.existsSync(target) || !fs.statSync(target).isDirectory()) throw new Error(`Installed skill target does not exist: ${target}`);
  if (!fs.existsSync(path.join(target, 'skill-version.json'))) throw new Error('Target is not a course-builder skill');
}

function createWorkspace() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'course-builder-update-'));
  for (const name of ['staging', 'reports', 'backup']) fs.mkdirSync(path.join(root, name), { recursive: true, mode: 0o700 });
  return {
    root,
    stagingRoot: path.join(root, 'staging'),
    reportsRoot: path.join(root, 'reports'),
    backupRoot: path.join(root, 'backup', 'skill'),
    cleanup() {
      fs.rmSync(root, { recursive: true, force: true });
    },
  };
}

function copySkill(source, destination) {
  fs.mkdirSync(path.dirname(destination), { recursive: true, mode: 0o700 });
  fs.cpSync(source, destination, { recursive: true, force: true, errorOnExist: true });
}

function writeBackupRecord(workspace, target, metadata) {
  const recordPath = path.join(workspace.backupRoot, '..', 'update-backup.json');
  const record = {
    schemaVersion: 1,
    target: path.resolve(target),
    backedUpAt: new Date().toISOString(),
    skill: metadata,
    files: fs.readdirSync(workspace.backupRoot),
  };
  const serialized = JSON.stringify(record, null, 2);
  const content = `${serialized.slice(0, -1)}${' '.repeat(Math.max(0, 1024 - serialized.length + 1))}}`;
  if (content.length < 1024) throw new Error('Backup record is unexpectedly small');
  fs.writeFileSync(recordPath, content, 'utf8');
  fs.chmodSync(recordPath, 0o600);
}

function collectFiles(root) {
  const files = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const entryPath = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...collectFiles(entryPath));
    else if (entry.isFile()) files.push(entryPath);
    else throw new Error(`Unsupported backup entry: ${entryPath}`);
  }
  return files;
}

function hashDirectory(root) {
  return crypto.createHash('sha256')
    .update(JSON.stringify(collectFiles(root).map((filePath) => {
      const stat = fs.statSync(filePath);
      return {
        path: path.relative(root, filePath).split(path.sep).join('/'),
        mode: stat.mode & 0o7777,
        size: stat.size,
        sha256: sha256(fs.readFileSync(filePath)),
      };
    }).sort((left, right) => left.path.localeCompare(right.path))))
    .digest('hex');
}

function verifyCopiedSkill(source, destination) {
  const sourceFiles = collectFiles(source).map((filePath) => path.relative(source, filePath));
  const destinationFiles = collectFiles(destination).map((filePath) => path.relative(destination, filePath));
  const differences = [];
  for (const file of sourceFiles) {
    if (!destinationFiles.includes(file)) differences.push(`missing ${file}`);
  }
  for (const file of destinationFiles) {
    if (!sourceFiles.includes(file)) differences.push(`extra ${file}`);
  }
  for (const file of sourceFiles) {
    const sourcePath = path.join(source, file);
    const destinationPath = path.join(destination, file);
    if (!fs.existsSync(destinationPath)) continue;
    const sourceStat = fs.statSync(sourcePath);
    const destinationStat = fs.statSync(destinationPath);
    if (sourceStat.mode !== destinationStat.mode || sourceStat.size !== destinationStat.size) {
      differences.push(`metadata mismatch ${file}`);
    } else if (sha256(fs.readFileSync(sourcePath)) !== sha256(fs.readFileSync(destinationPath))) {
      differences.push(`content mismatch ${file}`);
    }
  }
  if (differences.length) throw new Error(`Skill copy verification failed: ${differences.join(', ')}`);
}

function installStagedSkill(staging, target, workspace, installedMetadata) {
  const targetParent = path.dirname(path.resolve(target));
  const stagedCopy = path.join(targetParent, `.course-builder-stage-${crypto.randomBytes(8).toString('hex')}`);
  const rollback = path.join(targetParent, `.course-builder-rollback-${crypto.randomBytes(8).toString('hex')}`);
  if (nestedPath(stagedCopy, target) || nestedPath(rollback, target)) throw new Error('Unsafe temporary target paths');
  copySkill(staging, stagedCopy);
  copySkill(target, workspace.backupRoot);
  verifyCopiedSkill(target, workspace.backupRoot);
  writeBackupRecord(workspace, target, installedMetadata);
  let replaced = false;
  try {
    fs.renameSync(target, rollback);
    replaced = true;
    fs.renameSync(stagedCopy, target);
    return { rollback, stagedCopy };
  } catch (error) {
    if (replaced && fs.existsSync(rollback) && !fs.existsSync(target)) fs.renameSync(rollback, target);
    if (fs.existsSync(stagedCopy)) fs.rmSync(stagedCopy, { recursive: true, force: true });
    throw error;
  }
}

function restoreTarget(target, rollbackPath, backupRoot, workspace) {
  if (fs.existsSync(target)) fs.rmSync(target, { recursive: true, force: true });
  if (fs.existsSync(rollbackPath)) {
    fs.renameSync(rollbackPath, target);
  } else {
    copySkill(backupRoot, target);
  }
  const restored = readSkillVersion(target);
  const backupRecord = JSON.parse(fs.readFileSync(path.join(workspace.backupRoot, '..', 'update-backup.json'), 'utf8'));
  if (restored.version !== backupRecord.skill.version || restored.releaseTag !== backupRecord.skill.releaseTag) {
    throw new Error('Rollback verification failed');
  }
}

function writeReport(options, report) {
  if (!options.report) return;
  const reportPath = path.resolve(process.cwd(), options.report);
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
}

async function main() {
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

  const target = path.resolve(options.target || defaultTarget);
  const workspace = createWorkspace();
  workspace.keep = false;
  let report = {
    schemaVersion: 1,
    status: 'failed',
    generatedBy: 'course-builder/scripts/update-skill.js',
    target,
    installed: null,
    selected: null,
    dryRun: options.dryRun,
  };
  try {
    let installed = null;
    if (!options.ref && !options.latest) {
      if (!fs.existsSync(target)) throw new Error(`Installed skill target does not exist: ${target}`);
      installed = readSkillVersion(target);
      const latest = await githubJson('/repos/jensuid/course-factory/releases/latest');
      const selected = selectAssets(latest);
      report.status = 'passed';
      report.installed = installed;
      report.selected = { version: selected.version, tag: selected.tag };
      writeReport(options, report);
      console.log(JSON.stringify(report, null, 2));
      return;
    }
    prepareTarget(target);
    installed = readSkillVersion(target);
    const release = options.latest
      ? await githubJson('/repos/jensuid/course-factory/releases/latest')
      : await githubJson(`/repos/jensuid/course-factory/releases/tags/${encodeURIComponent(options.ref)}`);
    const staged = await downloadAndStage(release, workspace);
    validateStagedSkill(staged.staging, workspace);
    const stagedHash = hashDirectory(staged.staging);
    report.installed = installed;
    report.selected = { version: staged.selected.version, tag: staged.selected.tag, digest: staged.selected.archive.digest };
    if (options.dryRun) {
      report.status = 'passed';
      report.message = 'Dry run passed; installed skill was not modified.';
      writeReport(options, report);
      console.log(JSON.stringify(report, null, 2));
      return;
    }

    validateInstalledSkill(target, workspace, 'pre-update-skill');
    const swap = installStagedSkill(staged.staging, target, workspace, installed);
    try {
      validateInstalledSkill(target, workspace, 'post-update-skill');
      if (hashDirectory(target) !== stagedHash) throw new Error('Installed skill content verification failed');
      fs.rmSync(swap.rollback, { recursive: true, force: true });
      report.status = 'passed';
      report.message = `Updated course-builder from ${installed.version} to ${staged.metadata.version}.`;
      writeReport(options, report);
      console.log(JSON.stringify(report, null, 2));
    } catch (error) {
      workspace.keep = true;
      restoreTarget(target, swap.rollback, workspace.backupRoot, workspace);
      report.rollback = 'succeeded';
      report.postUpdateError = error.message;
      throw new Error(`Post-update validation failed; rollback succeeded. ${error.message}`);
    }
  } catch (error) {
    report.error = error.message;
    if (workspace.keep) report.backupWorkspace = workspace.root;
    writeReport(options, report);
    console.error(JSON.stringify(report, null, 2));
    process.exitCode = 1;
    if (!workspace.keep) workspace.cleanup();
    return;
  }
  workspace.cleanup();
}

main().catch((error) => {
  console.error(error.stack);
  process.exitCode = 1;
});
