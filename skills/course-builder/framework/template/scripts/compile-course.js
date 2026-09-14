'use strict';

const fs = require('fs');
const path = require('path');
const { parseCourseSource } = require('./lib/manifest-schema');

const templateRoot = path.join(__dirname, '..');
const sourcePath = path.join(templateRoot, '..', 'course.yaml');
const outputPath = path.join(templateRoot, 'app', 'course-manifest.json');
const answersPath = path.join(templateRoot, 'tests', 'generated', 'expected-answers.json');
const lintPath = path.join(templateRoot, 'tests', 'generated', 'content-lint.json');
const domainPath = path.join(templateRoot, 'tests', 'generated', 'domain-validation.json');
const supportedComponents = ['certificate', 'chartlab', 'diagram', 'flashcard', 'progresskit', 'quiz', 'reviewpack'];
const supportedMediaTypes = ['image', 'video', 'youtube'];

function get(text, pattern) {
  const match = text.match(pattern);
  return match ? match[1].trim() : null;
}

function parseCourseYaml() {
  return parseCourseSource(sourcePath, path.join(templateRoot, 'app', 'content'));
}

function formatManifest(manifest) {
  return `${JSON.stringify(manifest, null, 2)}\n`;
}

function extractQuizAnswers(modules) {
  const answers = {};
  for (const module of modules) {
    const contentPath = path.join(templateRoot, 'app', 'content', `${module.id}.md`);
    const text = fs.readFileSync(contentPath, 'utf8');
    const quizPattern = /```quiz\r?\n([\s\S]*?)```/g;
    const moduleAnswers = [];
    let match;
    while ((match = quizPattern.exec(text)) !== null) {
      const answer = match[1].match(/^answer: (\d+)$/m);
      if (!answer) throw new Error(`quiz in ${module.id}.md is missing a numeric answer`);
      moduleAnswers.push(Number(answer[1]));
    }
    if (moduleAnswers.length) answers[module.id] = moduleAnswers;
  }
  return answers;
}

function extractObjectiveMap(modules) {
  const objectiveMap = [];
  for (const module of modules) {
    const contentPath = path.join(templateRoot, 'app', 'content', `${module.id}.md`);
    const text = fs.readFileSync(contentPath, 'utf8');
    const quizPattern = /```quiz\r?\n([\s\S]*?)```/g;
    let match;
    while ((match = quizPattern.exec(text)) !== null) {
      const block = match[1];
      const objectives = block.match(/^objectives:\r?\n((?: {2}- .+\r?\n?)+)/m);
      const objectiveList = objectives
        ? [...objectives[1].matchAll(/^ {2}- (.+)$/gm)].map((entry) => entry[1].trim())
        : [];
      objectiveList.forEach((objectiveId) => {
        objectiveMap.push({
          objectiveId,
          moduleId: module.id,
          checkpointId: getConfigValue(block, 'id'),
          diagnostic: getConfigValue(block, 'diagnostic') === 'true',
        });
      });
    }
  }
  return objectiveMap;
}

function extractFences(module, text, kind) {
  const pattern = new RegExp('```' + kind + '\\r?\\n([\\s\\S]*?)```', 'g');
  const blocks = [];
  let match;
  while ((match = pattern.exec(text)) !== null) blocks.push(match[1]);
  return blocks;
}

function getConfigValue(block, key) {
  const match = block.match(new RegExp('^' + key + ': (.+)$', 'm'));
  return match ? match[1].trim() : null;
}

function lintCourseContent(manifest) {
  const errors = [];
  const warnings = [];
  const moduleIds = manifest.modules.map((module) => module.id);

  for (const module of manifest.modules) {
    const contentPath = path.join(templateRoot, 'app', 'content', `${module.id}.md`);
    const text = fs.readFileSync(contentPath, 'utf8');

    extractFences(module, text, 'quiz').forEach((block, index) => {
      const id = getConfigValue(block, 'id');
      const answer = block.match(/^answer: (\d+)$/m);
      const options = block.match(/^opts:\r?\n((?: {2}- .+\r?\n?)+)/m);
      if (!id) errors.push(`${module.id}.md quiz ${index + 1}: missing id`);
      if (!answer) errors.push(`${module.id}.md quiz ${index + 1}: missing numeric answer`);
      if (!options) errors.push(`${module.id}.md quiz ${index + 1}: missing options list`);
      const objectives = block.match(/^objectives:\r?\n((?: {2}- .+\r?\n?)+)/m);
      if (objectives) {
        const declaredObjectives = new Set((module.objectives || []).map((objective) => objective.id));
        [...objectives[1].matchAll(/^ {2}- (.+)$/gm)].forEach((entry) => {
          const objectiveId = entry[1].trim();
          if (!declaredObjectives.has(objectiveId)) {
            errors.push(`${module.id}.md quiz ${index + 1}: references unknown objective "${objectiveId}"`);
          }
        });
      }
      if (options) {
        const count = options[1].match(/^ {2}- /gm).length;
        if (answer && Number(answer[1]) >= count) errors.push(`${module.id}.md quiz ${index + 1}: answer index is outside options`);
      }
    });

    extractFences(module, text, 'interactive').forEach((block, index) => {
      const component = getConfigValue(block, 'component');
      if (!component) errors.push(`${module.id}.md interactive ${index + 1}: missing component`);
      if (component && !supportedComponents.includes(component)) errors.push(`${module.id}.md interactive ${index + 1}: unsupported component "${component}"`);
      const dataset = getConfigValue(block, 'dataset');
      if (component === 'diagram') {
        const groups = block.match(/^groups:\r?\n((?: {2,}- .+[\s\S]*?)+)$/m);
        if (!groups) errors.push(`${module.id}.md interactive ${index + 1}: diagram requires groups`);
      }
      if (component === 'chartlab') {
        if (!dataset) errors.push(`${module.id}.md interactive ${index + 1}: chartlab requires dataset`);
        const dataPath = path.join(templateRoot, 'app', 'content', 'data', `${dataset}.json`);
        if (dataset && !fs.existsSync(dataPath)) errors.push(`${module.id}.md interactive ${index + 1}: missing dataset data/${dataset}.json`);
      }
    });

    extractFences(module, text, 'media').forEach((block, index) => {
      const type = getConfigValue(block, 'type');
      const source = getConfigValue(block, 'src');
      const youtube = getConfigValue(block, 'youtube');
      if (!type || !supportedMediaTypes.includes(type)) errors.push(`${module.id}.md media ${index + 1}: unsupported type`);
      if (type === 'youtube' && !youtube) errors.push(`${module.id}.md media ${index + 1}: youtube requires an ID`);
      if ((type === 'image' || type === 'video') && !source) errors.push(`${module.id}.md media ${index + 1}: ${type} requires src`);
      if (source) {
        const mediaPath = path.join(templateRoot, 'app', source);
        if (!fs.existsSync(mediaPath)) errors.push(`${module.id}.md media ${index + 1}: missing media ${source}`);
      }
    });

    const routePattern = /href="#\/module\/([A-Za-z0-9_-]+)"/g;
    let match;
    while ((match = routePattern.exec(text)) !== null) {
      if (!moduleIds.includes(match[1])) errors.push(`${module.id}.md: route points to unknown module ${match[1]}`);
    }
  }

  return {
    schemaVersion: 1,
    checksRun: ['quiz-schema', 'component-registry', 'media-assets', 'module-routes', 'datasets'],
    errors,
    warnings,
  };
}

function validateDomain(manifest) {
  const errors = [];
  const warnings = [];
  const enginePath = path.join(templateRoot, 'app', manifest.engine.entry || '');
  const engineExists = fs.existsSync(enginePath);

  if (manifest.engine.required && !engineExists) errors.push(`domain engine is required but missing: ${manifest.engine.entry}`);
  if (manifest.engine.entry && engineExists) {
    const source = fs.readFileSync(enginePath, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '');
    if (/\bdocument\b/.test(source)) errors.push('domain engine must not access document');
    if (/\bfetch\s*\(/.test(source)) errors.push('domain engine must not fetch');
    if (/\blocalStorage\b/.test(source)) errors.push('domain engine must not access localStorage');
  }

  for (const dataset of manifest.datasets) {
    const datasetPath = path.join(templateRoot, 'app', dataset.file);
    if (!fs.existsSync(datasetPath)) {
      errors.push(`dataset ${dataset.id} is missing: ${dataset.file}`);
      continue;
    }
    try {
      const data = JSON.parse(fs.readFileSync(datasetPath, 'utf8'));
      if (data.id !== dataset.id) errors.push(`dataset ${dataset.file} id does not match manifest id`);
      if (!Array.isArray(data.labels) || data.labels.length < 2) errors.push(`dataset ${dataset.id} requires labels with at least two entries`);
      if (!Array.isArray(data.values) || data.values.length !== data.labels.length) errors.push(`dataset ${dataset.id} values must match labels length`);
      if (Array.isArray(data.values) && data.values.some((value) => typeof value !== 'number' || !Number.isFinite(value))) {
        errors.push(`dataset ${dataset.id} values must be finite numbers`);
      }
    } catch (error) {
      errors.push(`dataset ${dataset.id} is invalid JSON: ${error.message}`);
    }
  }

  return {
    schemaVersion: 1,
    required: manifest.engine.required,
    entry: manifest.engine.entry || null,
    capabilities: manifest.engine.capabilities,
    datasets: manifest.datasets,
    checksRun: ['engine-asset', 'pure-engine', 'dataset-asset', 'dataset-schema'],
    errors,
    warnings,
  };
}

function main() {
  const check = process.argv.includes('--check');
  const manifest = parseCourseYaml();
  const output = formatManifest(manifest);
  const answers = extractQuizAnswers(manifest.modules);
  const answersOutput = `${JSON.stringify(answers, null, 2)}\n`;
  const lint = lintCourseContent(manifest);
  const lintOutput = `${JSON.stringify(lint, null, 2)}\n`;
  const domain = validateDomain(manifest);
  const domainOutput = `${JSON.stringify(domain, null, 2)}\n`;

  if (check) {
    const current = fs.readFileSync(outputPath, 'utf8');
    const currentAnswers = fs.readFileSync(answersPath, 'utf8');
    const currentLint = fs.readFileSync(lintPath, 'utf8');
    const currentDomain = fs.readFileSync(domainPath, 'utf8');
    if (current !== output || currentAnswers !== answersOutput || currentLint !== lintOutput || currentDomain !== domainOutput) {
      console.error('✘ course-manifest.json is out of sync with course.yaml');
      console.error('✘ expected-answers.json is out of sync with course content');
      console.error('✘ content-lint.json is out of sync with course content');
      console.error('✘ domain-validation.json is out of sync with course manifest');
      console.error('Run: node template/scripts/compile-course.js');
      process.exitCode = 1;
      return;
    }
    console.log('course manifest compiler: IN SYNC');
    return;
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.mkdirSync(path.dirname(answersPath), { recursive: true });
  fs.writeFileSync(outputPath, output, 'utf8');
  fs.writeFileSync(answersPath, answersOutput, 'utf8');
  fs.writeFileSync(lintPath, lintOutput, 'utf8');
  fs.writeFileSync(domainPath, domainOutput, 'utf8');
  console.log(`course manifest compiler: wrote ${path.relative(templateRoot, outputPath)}`);
  console.log(`course answer compiler: wrote ${path.relative(templateRoot, answersPath)}`);
  console.log(`course content lint compiler: wrote ${path.relative(templateRoot, lintPath)}`);
  console.log(`domain validator: wrote ${path.relative(templateRoot, domainPath)}`);

  if (lint.errors.length) {
    console.error(`✘ course content lint failed (${lint.errors.length} error${lint.errors.length === 1 ? '' : 's'})`);
    lint.errors.forEach((error) => console.error(`  - ${error}`));
    process.exitCode = 1;
  } else {
    console.log('course content lint: PASSED');
  }

  if (domain.errors.length) {
    console.error(`✘ domain validation failed (${domain.errors.length} error${domain.errors.length === 1 ? '' : 's'})`);
    domain.errors.forEach((error) => console.error(`  - ${error}`));
    process.exitCode = 1;
  } else {
    console.log('domain validation: PASSED');
  }
}

main();
