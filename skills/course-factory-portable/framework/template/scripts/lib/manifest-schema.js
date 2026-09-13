'use strict';

const fs = require('fs');
const path = require('path');

const idPattern = /^[A-Za-z0-9_-]+$/;
const safeRoutePattern = /^[A-Za-z0-9_./-]+$/;

function get(text, pattern) {
  const match = text.match(pattern);
  return match ? match[1].trim() : null;
}

function parseObjectives(text, modules) {
  const objectivePattern = /^ {2}- id: ([A-Za-z0-9_-]+)\r?\n {4}short: .+\r?\n {4}objectives:\r?\n((?: {6}- .+\r?\n?)+)/gm;
  let objectiveMatch;
  while ((objectiveMatch = objectivePattern.exec(text)) !== null) {
    const module = modules.find((candidate) => candidate.id === objectiveMatch[1]);
    if (!module) continue;
    module.objectives = [...objectiveMatch[2].matchAll(/^ {6}- (.+)$/gm)].map((entry) => {
      const line = entry[1];
      const parsed = line.match(/^([A-Za-z0-9_-]+):\s*(.+)$/);
      return parsed ? { id: parsed[1], text: parsed[2] } : { id: null, text: line };
    });
  }
}

function parseQuizConfig(block) {
  const id = block.match(/^id: (.+)$/m);
  return {
    id: id ? id[1].trim() : null,
    diagnostic: /^diagnostic: true$/m.test(block),
    objectives: (block.match(/^objectives:\r?\n((?: {2}- .+\r?\n?)+)/m) || { 1: '' })[1]
      .match(/^ {2}- (.+)$/gm) || [],
  };
}

function extractObjectiveMap(modules, contentRoot) {
  const objectiveMap = [];
  for (const module of modules) {
    const contentPath = path.join(contentRoot, `${module.id}.md`);
    const text = fs.readFileSync(contentPath, 'utf8');
    const quizPattern = /```quiz\r?\n([\s\S]*?)```/g;
    let match;
    while ((match = quizPattern.exec(text)) !== null) {
      const quiz = parseQuizConfig(match[1]);
      quiz.objectives.forEach((objectiveEntry) => {
        objectiveMap.push({
          objectiveId: objectiveEntry.replace(/^ {2}- /, '').trim(),
          moduleId: module.id,
          checkpointId: quiz.id,
          diagnostic: quiz.diagnostic,
        });
      });
    }
  }
  return objectiveMap;
}

function parseCourseSource(sourcePath, contentRoot) {
  const text = fs.readFileSync(sourcePath, 'utf8');
  const modules = [];
  const modulePattern = /^ {2}- id: ([A-Za-z0-9_-]+)\r?\n {4}short: (.+)$/gm;
  let moduleMatch;
  while ((moduleMatch = modulePattern.exec(text)) !== null) {
    modules.push({ id: moduleMatch[1], short: moduleMatch[2] });
  }
  parseObjectives(text, modules);

  const presentationMatch = text.match(/^presentation:\r?\n((?: {2}.+\r?\n?)+)/m);
  let presentation;
  if (presentationMatch) {
    const block = presentationMatch[1];
    presentation = {
      theme: get(block, /^ {2}theme: (.+)$/m),
      layout: get(block, /^ {2}layout: (.+)$/m),
      customTheme: get(block, /^ {2}customTheme: (.+)$/m),
      componentVariants: {},
    };
    presentation.customTheme = presentation.customTheme === 'null' || presentation.customTheme === null
      ? null
      : presentation.customTheme;
  }

  const componentMatch = text.match(/^components:\r?\n((?: {2,4}.+\r?\n?)+)/m);
  const components = componentMatch
    ? { builtIn: [...componentMatch[1].matchAll(/^ {4}- (.+)$/gm)].map((entry) => entry[1]) }
    : { builtIn: [] };

  const engineMatch = text.match(/^engine:\r?\n((?: {2}.+\r?\n?)+)/m);
  const engine = engineMatch
    ? {
      required: get(engineMatch[1], /^ {2}required: (.+)$/m) === 'true',
      entry: get(engineMatch[1], /^ {2}entry: (.+)$/m),
      capabilities: [...engineMatch[1].matchAll(/^ {4}- (.+)$/gm)].map((entry) => entry[1]),
    }
    : { required: false };

  const datasets = [];
  const lines = text.split(/\r?\n/);
  for (let index = 0; index < lines.length - 1; index += 1) {
    const datasetId = lines[index].match(/^ {2,4}- id: (.+)$/);
    if (!datasetId) continue;
    const datasetFile = lines[index + 1].match(/^ {4,6}file: (.+)$/);
    if (datasetFile) datasets.push({ id: datasetId[1], file: datasetFile[1] });
  }

  const parsed = {
    schemaVersion: Number(get(text, /^schemaVersion: (.+)$/m)),
    course: {
      id: get(text, /^ {2}id: (.+)$/m),
      name: get(text, /^ {2}name: (.+)$/m),
      version: get(text, /^ {2}version: (.+)$/m),
    },
    modules,
    finalQuizHost: get(text, /^finalQuizHost: (.+)$/m),
    presentation,
    components,
    engine,
    datasets,
  };
  parsed.objectiveMap = extractObjectiveMap(modules, contentRoot);
  return parsed;
}

function parseCatalogSource(sourcePath) {
  const text = fs.readFileSync(sourcePath, 'utf8');
  const courses = [];
  const coursePattern = /^ {2}- id: (.+)\r?\n {4}name: (.+)\r?\n {4}version: (.+)\r?\n {4}manifest: (.+)\r?\n {4}route: (.+)$/gm;
  let match;
  while ((match = coursePattern.exec(text)) !== null) {
    courses.push({ id: match[1], name: match[2], version: match[3], manifest: match[4], route: match[5] });
  }
  return {
    schemaVersion: Number(get(text, /^schemaVersion: (.+)$/m)),
    courses,
  };
}

function validateCourse(manifest, options = {}) {
  const errors = [];
  const push = (message) => errors.push(message);
  const contentRoot = options.contentRoot;
  const appRoot = options.appRoot;

  if (manifest.schemaVersion !== 1) push('schemaVersion must be 1');
  if (!manifest.course || typeof manifest.course !== 'object') {
    push('course object is required');
  } else {
    ['id', 'name', 'version'].forEach((key) => {
      if (!manifest.course[key]) push(`course.${key} is required`);
    });
    if (manifest.course.id && !idPattern.test(manifest.course.id)) push('course.id contains invalid characters');
  }

  if (!Array.isArray(manifest.modules) || manifest.modules.length === 0) {
    push('at least one module is required');
  } else {
    const moduleIds = [];
    manifest.modules.forEach((module, index) => {
      if (!module || !idPattern.test(module.id)) push(`module ${index + 1} has an invalid id`);
      if (!module || !module.short) push(`module ${module ? module.id : index + 1} requires a short label`);
      if (module && module.id) moduleIds.push(module.id);
      if (module && Array.isArray(module.objectives)) {
        module.objectives.forEach((objective, objectiveIndex) => {
          if (!objective || typeof objective !== 'object' || Array.isArray(objective)) {
            push(`module ${module.id} objective ${objectiveIndex + 1} must be an object`);
          } else {
            if (!objective.id || !idPattern.test(objective.id)) push(`module ${module.id} objective ${objectiveIndex + 1} has an invalid ID`);
            if (!objective.text) push(`module ${module.id} objective ${objectiveIndex + 1} requires text`);
          }
        });
      }
    });
    const duplicateModules = moduleIds.filter((id, index) => moduleIds.indexOf(id) !== index);
    if (duplicateModules.length) push(`duplicate module IDs: ${[...new Set(duplicateModules)].join(', ')}`);
    const finalIndex = moduleIds.indexOf('final-assessment');
    if (finalIndex !== -1 && finalIndex !== moduleIds.length - 1) push('final-assessment module must be last');
    if (contentRoot && manifest.modules.every(Boolean)) {
      manifest.modules.forEach((module) => {
        if (idPattern.test(module.id) && !fs.existsSync(path.join(contentRoot, `${module.id}.md`))) {
          push(`missing content file: content/${module.id}.md`);
        }
      });
    }
    if (manifest.finalQuizHost !== null && manifest.finalQuizHost !== undefined) {
      const host = String(manifest.finalQuizHost);
      if (host !== 'null' && !moduleIds.includes(host)) push('finalQuizHost must be null or an existing module ID');
    }
  }

  if (manifest.objectiveMap !== undefined) {
    if (!Array.isArray(manifest.objectiveMap)) {
      push('objectiveMap must be an array');
    } else {
      const objectives = (manifest.modules || []).flatMap((module) => module && module.objectives || []);
      const objectiveIds = objectives.map((objective) => objective && objective.id).filter(Boolean);
      const duplicateObjectives = objectiveIds.filter((id, index) => objectiveIds.indexOf(id) !== index);
      if (duplicateObjectives.length) push(`duplicate objective IDs: ${[...new Set(duplicateObjectives)].join(', ')}`);
      const moduleIds = (manifest.modules || []).map((module) => module && module.id).filter(Boolean);
      manifest.objectiveMap.forEach((entry, index) => {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
          push(`objectiveMap entry ${index + 1} must be an object`);
          return;
        }
        if (!entry.objectiveId || !idPattern.test(entry.objectiveId)) push(`objectiveMap entry ${index + 1} has an invalid objective ID`);
        if (entry.objectiveId && !objectiveIds.includes(entry.objectiveId)) {
          push(`objectiveMap entry ${index + 1} references unknown objective ${entry.objectiveId}`);
        }
        if (!moduleIds.includes(entry.moduleId)) push(`objectiveMap entry ${index + 1} references unknown module ${entry.moduleId}`);
        if (!entry.checkpointId) push(`objectiveMap entry ${index + 1} requires a checkpoint ID`);
        if (typeof entry.diagnostic !== 'boolean') push(`objectiveMap entry ${index + 1} requires a diagnostic boolean`);
      });
      objectiveIds.forEach((id) => {
        if (!manifest.objectiveMap.some((entry) => entry && entry.objectiveId === id)) {
          push(`objective ${id} has no checkpoint or diagnostic`);
        }
      });
    }
  }

  const presentation = manifest.presentation;
  if (presentation !== undefined) {
    const allowedThemes = ['default', 'slate', 'warm', 'nord', 'blossom', 'architecture-studio'];
    if (!presentation || typeof presentation !== 'object') push('presentation must be an object');
    else {
      if (!allowedThemes.includes(presentation.theme)) push('presentation.theme is unsupported');
      if (presentation.layout !== 'sidebar-left') push('presentation.layout is unsupported');
      if (presentation.customTheme !== null && presentation.customTheme !== undefined) {
        if (!safeRoutePattern.test(String(presentation.customTheme))) push('presentation.customTheme contains invalid route characters');
        else if (appRoot && !fs.existsSync(path.join(appRoot, presentation.customTheme))) push('presentation.customTheme asset is missing');
      }
      if (presentation.componentVariants !== undefined && (
        presentation.componentVariants === null
        || typeof presentation.componentVariants !== 'object'
        || Array.isArray(presentation.componentVariants)
      )) push('presentation.componentVariants must be an object');
    }
  }

  return errors;
}

function validateCatalog(catalog, root) {
  const errors = [];
  if (catalog.schemaVersion !== 1) errors.push('catalog schemaVersion must be 1');
  if (!Array.isArray(catalog.courses) || !catalog.courses.length) errors.push('catalog requires at least one course');
  if (!Array.isArray(catalog.courses)) return errors;
  const ids = catalog.courses.map((course) => course.id);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  if (duplicates.length) errors.push(`duplicate course IDs: ${[...new Set(duplicates)].join(', ')}`);
  const routes = catalog.courses.map((course) => course.route);
  const duplicateRoutes = routes.filter((route, index) => routes.indexOf(route) !== index);
  if (duplicateRoutes.length) errors.push(`duplicate course routes: ${[...new Set(duplicateRoutes)].join(', ')}`);

  catalog.courses.forEach((course, index) => {
    if (!course || !idPattern.test(course.id || '')) errors.push(`course ${index + 1} has an invalid ID`);
    if (course && !course.name) errors.push(`course ${course.id || index + 1} requires a name`);
    if (course && !course.version) errors.push(`course ${course.id || index + 1} requires a version`);
    if (!course || !safeRoutePattern.test(course.manifest || '')) errors.push(`course ${course ? course.id : index + 1} manifest contains invalid route characters`);
    if (!course || !safeRoutePattern.test(course.route || '')) errors.push(`course ${course ? course.id : index + 1} route contains invalid route characters`);
    if (!course || !root) return;
    ['manifest', 'route'].forEach((field) => {
      if (!fs.existsSync(path.join(root, course[field]))) errors.push(`${course.id} ${field} is missing: ${course[field]}`);
    });
    if (course.manifest && fs.existsSync(path.join(root, course.manifest))) {
      const manifest = JSON.parse(fs.readFileSync(path.join(root, course.manifest), 'utf8'));
      if (manifest.course.id !== course.id) errors.push(`${course.id} manifest ID does not match catalog`);
      if (manifest.course.name !== course.name) errors.push(`${course.id} manifest name does not match catalog`);
      if (manifest.course.version !== course.version) errors.push(`${course.id} manifest version does not match catalog`);
      errors.push(...validateCourse(manifest).map((message) => `${course.id}: ${message}`));
    }
  });
  return errors;
}

module.exports = {
  parseCourseSource,
  parseCatalogSource,
  validateCourse,
  validateCatalog,
};
