# Portable Skill v2

Course Factory Portable v2 packages the framework needed to initialize a course
repository outside the original source checkout.

## Runtime Contract

Initialization creates:

```text
AGENT.md
Proposed-Architecture.md
course.yaml
courses.yaml
template/
docs/
notes/
.github/
```

After initialization, all v1 course-factory commands and boundaries apply.
The published site serves the catalog from both `/` and `/courses.html`.

## Initialization

```bash
node scripts/init.js --target /path/to/destination --validate
```

The initializer installs the lockfile-pinned headless test dependency and runs
the same unchanged 14-gate pipeline.

## Maintenance

Re-run the portable validator before distributing or updating this skill. It
must verify structure, completeness, prohibited content, the canonical source
pipeline, and a temporary initialization.
