# Static Course Deployment

## GitHub Pages

The repository includes a GitHub Actions deployment workflow:

```text
.github/workflows/deploy-pages.yml
```

It builds and validates the complete static distribution before publishing.
The deployed site serves the catalog from:

```text
/courses.html
```

The site root (`/`) serves the same catalog through `dist/index.html`.
`/courses.html` remains available for compatibility.

Each course is isolated under:

```text
/courses/<course-id>/
```

### One-time GitHub setup

1. Open the repository on GitHub.
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, choose **GitHub Actions**.
4. Save the setting.
5. Push to `main`, `master`, or a `v*` tag, or run **Deploy Interactive Courses**
   manually.

### Deployment contract

- Deployment runs only after the full validation pipeline succeeds.
- GitHub Pages receives the checksum-verified `dist/` directory.
- Catalog routes are relative and remain valid at the site root.
- Validation reports and the static build are produced by the same workflow.

## Local preflight

Run the exact build and validation chain used by deployment:

```bash
node template/scripts/agent-run.js
```

The command publishes `dist/`, verifies every file checksum, and emits the
release readiness report.
