# Portable Skill v2

Course Builder v2 packages the framework needed to initialize a course
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
node scripts/init.js --target /path/to/destination --no-install --validate
```

The initializer copies the packaged framework and runs the same unchanged
14-gate pipeline. Use `--install` to install the lockfile-pinned test
dependency, or `--no-install` when jsdom is already available through a Node
module path.

## Maintenance

Rebuild only through `scripts/package.js`; do not manually edit the embedded
framework mirror. Before distributing or updating the skill, run
`scripts/package.js --check` and `scripts/validate.js`. They verify structure,
completeness, prohibited content, canonical drift, checksums, the canonical
source pipeline, and a temporary initialization.
