# Course Factory

Course Factory is a deterministic framework and portable skill for building
validated interactive static courses.

## Start Here

- [Documentation index](docs/DOCUMENTATION.md) — user, technical, portable, and release documentation.
- [Framework README](template/README.md) — canonical runtime and content contract.
- [Framework architecture](template/ARCHITECTURE.md) — technical design and validation model.
- [Portable skill README](skills/course-builder/README.md) — portable package and initialization.

## Build A Course

1. Create a `curriculum.json` using the [portable user guide](skills/course-builder/references/user-guide.md).
2. Initialize an empty destination repository:

   ```bash
   node skills/course-builder/scripts/init.js \
     --target /absolute/path/to/destination \
     --install \
     --validate
   ```

3. Generate the course:

   ```bash
   node template/scripts/course-factory.js curriculum.json
   ```

4. Run the full validation pipeline:

   ```bash
   node template/scripts/agent-run.js
   ```

## Validate The Framework

```bash
node template/scripts/agent-run.js
node skills/course-builder/scripts/package.js --check
node skills/course-builder/scripts/validate.js
node template/scripts/verify-publish.js
```

## Portable Release

- Repository: [jensuid/course-factory](https://github.com/jensuid/course-factory)
- Latest portable package name: `course-builder` (pending a new tagged release)
- Embedded framework mirror: `skills/course-builder/framework/`
- Rebuild command: `node skills/course-builder/scripts/package.js`

The installed local skill at
`/Users/jensu/.codex/skills/course-factory` remains intentionally unchanged.

## Static Hosting

GitHub Pages is intentionally not enabled in this repository. The deployment
workflow is disabled until hosting is ready; the CI workflow still validates and
archives the generated distribution on every change.
