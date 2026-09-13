/* ============================================================
   Unit tests for the template ENGINE (pure functions, plain Node).
   Replace these with your domain function's checks.
   Run: node tests/unit.js
   ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');

// load engine.js with a window shim (it attaches to window.TS)
global.window = {};
eval(fs.readFileSync(path.join(__dirname, '..', 'app', 'js', 'engine.js'), 'utf8'));
const E = global.window.TS.engine;
const { execFileSync } = require('child_process');
const compilerPath = path.join(__dirname, '..', 'scripts', 'compile-course.js');

let pass = 0, fail = 0;
const t = (name, ok, info) => {
  if (ok) { pass++; console.log(`  ✔ ${name}`); }
  else { fail++; console.log(`  ✘ ${name}${info ? ' — ' + info : ''}`); }
};

// seeded rng determinism
const a = E.seedRng(42);
const b = E.seedRng(42);
const seqA = [a(), a(), a()];
const seqB = [b(), b(), b()];
t('seedRng deterministic for same seed', JSON.stringify(seqA) === JSON.stringify(seqB));
t('seedRng in [0,1)', seqA.every((x) => x >= 0 && x < 1));

// different seeds diverge
const c = E.seedRng(7);
t('different seeds diverge', c() !== seqA[0]);

// walk: length + start
const walk = E.walk(10, 100, 6, 42);
t('walk returns n points', walk.length === 10);
t('walk starts at start', walk[0] === 100);
t('walk deterministic', JSON.stringify(walk) === JSON.stringify(E.walk(10, 100, 6, 42)));

// rolling mean
const vals = [1, 2, 3, 4, 5];
const mean = E.rolling(vals, 3, 'mean');
t('rolling mean window fills after w-1', mean[0] === null && mean[1] === null);
t('rolling mean value', mean[2] === 2 && mean[3] === 3 && mean[4] === 4);

// rolling std (population)
const std = E.rolling([2, 2, 2, 2], 3, 'std');
t('rolling std of constant is 0', std[2] === 0);
t('course compiler is deterministic', (() => {
  const output = execFileSync(process.execPath, [compilerPath], { encoding: 'utf8' });
  const lint = JSON.parse(fs.readFileSync(path.join(__dirname, 'generated', 'content-lint.json'), 'utf8'));
  return /wrote app\/course-manifest\.json/.test(output)
    && /course content lint: PASSED/.test(output)
    && lint.schemaVersion === 1
    && lint.errors.length === 0;
})());

t('objective contract is complete', (() => {
  const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'app', 'course-manifest.json'), 'utf8'));
  const objectives = manifest.modules.flatMap((module) => module.objectives || []);
  const objectiveIds = new Set(objectives.map((objective) => objective.id));
  const mapped = new Set(manifest.objectiveMap.map((entry) => entry.objectiveId));
  const diagnostics = manifest.objectiveMap.filter((entry) => entry.diagnostic);
  return objectiveIds.size === objectives.length
    && objectiveIds.size === 6
    && [...objectiveIds].every((id) => mapped.has(id))
    && diagnostics.length === 1
    && diagnostics[0].checkpointId === 'm2-diagnostic';
})());

console.log(`\nunit: ${pass} passed, ${fail} failed`);
process.exitCode = fail ? 1 : 0;
