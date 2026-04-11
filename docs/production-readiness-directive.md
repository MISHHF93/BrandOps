# BrandOps Production Readiness Directive

This branch applies a minimum production-readiness baseline for BrandOps.

## Directive controls implemented

1. **Shift-left quality gate**
   - A single `npm run check` command now enforces type safety and linting checks.
2. **CI enforcement**
   - GitHub Actions workflow runs install, quality checks, build, and artifact verification on every push to `main` and all pull requests.
3. **Release artifact verification**
   - `npm run verify:dist` validates required packaged files and checks critical MV3 manifest keys before release distribution.

## Operator runbook

Before cutting a release, run:

```bash
npm ci
npm run check
npm run build
npm run verify:dist
```

If any command fails, fix the issue before publishing the `dist/` bundle.
