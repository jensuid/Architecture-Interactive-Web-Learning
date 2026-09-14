# Course Builder

This is skill v2: a portable copy of the course framework and its deterministic
validation pipeline. It can initialize an empty destination repository and then
operate exactly like the v1 workflow after initialization.

## Package Layout

```text
course-builder/
  SKILL.md
  README.md
  agents/
  references/
  templates/
  scripts/
  framework/
    AGENT.md
    course.yaml
    courses.yaml
    template/
    docs/
    notes/
    .github/
```

The package deliberately excludes dependencies, `dist/`, `graphify-out/`,
generated reports, and repository history.

## Initialize A Repository

From a repository containing this skill:

```bash
node skills/course-builder/scripts/init.js --target ../my-course-repo
```

The command:

1. checks the destination for conflicting framework paths;
2. copies the runtime and required root contracts;
3. optionally installs jsdom from the packaged lockfile with `npm ci`;
4. optionally runs the full 14-gate canonical pipeline.

Dependency installation is opt-in. Add `--install` when the destination has
not already installed the packaged test dependency.

Add `--validate` to run the pipeline during initialization:

```bash
node skills/course-builder/scripts/init.js \
  --target ../my-course-repo --validate
```

Initialization will refuse to replace existing framework paths unless you pass:

```bash
--force
```

Use force only after reviewing the destination because it replaces the packaged
framework paths.

## Validate The Portable Skill

The portable packaging command:

```bash
node skills/course-builder/scripts/package.js
```

It rebuilds the embedded framework from canonical `template/` and root
contracts, applies only the source-baseline catalog transform, and records a
SHA-256 checksum manifest. Run `--check` to detect canonical drift and
checksum changes without rebuilding.

The portable validator checks:

1. skill structure;
2. required framework files;
3. prohibited package content;
4. reproducible packaging, canonical drift, and checksums;
5. the canonical source pipeline when this skill is located in its source repository;
6. a full temporary empty-directory initialization and canonical gate.

Run:

```bash
node skills/course-builder/scripts/validate.js
```

Optional arguments:

- `--report <path>` writes a machine-readable JSON result;
- `--skip-canonical` skips the source-repository pipeline check;
- `--skip-initialization` skips the temporary destination check.

The validator exits nonzero if any selected check fails.

## Update The Installed Skill

Check the installed and latest published versions without downloading:

```bash
node skills/course-builder/scripts/update-skill.js
```

Test an exact tagged release without modifying the installation:

```bash
node skills/course-builder/scripts/update-skill.js \
  --ref course-builder-v2.1 --dry-run
```

Install an exact tagged release:

```bash
node skills/course-builder/scripts/update-skill.js \
  --ref course-builder-v2.1
```

Install the latest stable release only after review:

```bash
node skills/course-builder/scripts/update-skill.js --latest --confirm
```

The updater accepts exact `course-builder-v<version>` release tags only. It downloads
the GitHub release archive and checksum sidecar, verifies both against GitHub's
recorded SHA-256 asset digests, extracts into a private staging directory, and runs
the portable package and skill validators before replacement. Installation backs up
the existing skill, swaps it as a unit, runs final validation, and automatically
restores the previous skill if final validation fails. Use `--target <path>` to
select an installation and `--report <path>` for a machine-readable result.

Read `references/user-guide.md` for a complete installation, authoring,
validation, publishing, maintenance, and troubleshooting walkthrough.

Read `references/mockup-topic-walkthrough.md` for a complete, concrete
end-to-end mockup topic.

## Course Workflow

After initialization:

```bash
cd ../my-course-repo
node template/scripts/course-factory.js curriculum.json
node template/scripts/agent-run.js
```

Stop only when `template/tests/generated/agent-run.json` has:

```json
{
  "status": "success"
}
```

Generated framework rules, the player core, vendor libraries, progress
semantics, certificate gating, and validation gates must not be weakened.
