# Publishing Guide for voyager-x402-sdk

This document explains how to publish the SDK to NPM.

## Prerequisites

1. NPM account with publishing access
2. NPM authentication token configured
3. Repository pushed to GitHub

## Setup NPM Authentication

### Option 1: Local Publishing (Manual)

```bash
# Login to npm
npm login

# Test publish (dry-run)
npm publish --dry-run

# Publish to NPM
npm publish --access public
```

### Option 2: Automated Publishing via GitHub Actions

1. Create an NPM access token:
   - Go to https://www.npmjs.com/settings/YOUR_USERNAME/tokens
   - Generate a new "Automation" token
   - Copy the token

2. Add token to GitHub repository secrets:
   - Go to repository Settings → Secrets and variables → Actions
   - Create a new secret named `NPM_TOKEN`
   - Paste your NPM token

3. Create a GitHub release:

   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

   - Go to GitHub → Releases → Draft a new release
   - Choose the tag you just created
   - Publish the release

4. The GitHub Action will automatically:
   - Run tests
   - Build the package
   - Publish to NPM with provenance

## Version Management

Update version in `package.json` before publishing:

```bash
# Patch version (1.0.0 → 1.0.1)
npm version patch

# Minor version (1.0.0 → 1.1.0)
npm version minor

# Major version (1.0.0 → 2.0.0)
npm version major
```

## Pre-publish Checklist

Before publishing, ensure:

- [ ] All tests pass: `bun run test`
- [ ] Types are valid: `bun run type-check`
- [ ] Linting passes: `bun run lint`
- [ ] Build succeeds: `bun run build`
- [ ] README is up to date
- [ ] Version is bumped in package.json
- [ ] CHANGELOG is updated (if you have one)
- [ ] Examples work correctly

## Repository Configuration

Update these URLs in `package.json` before first publish:

```json
{
  "repository": {
    "type": "git",
    "url": "https://github.com/YOUR_ORG/voyager-x402-sdk.git"
  },
  "bugs": {
    "url": "https://github.com/YOUR_ORG/voyager-x402-sdk/issues"
  },
  "homepage": "https://github.com/YOUR_ORG/voyager-x402-sdk#readme"
}
```

## Publishing Workflow

1. Make changes and test locally
2. Update version: `npm version [patch|minor|major]`
3. Commit changes: `git commit -am "chore: bump version to X.Y.Z"`
4. Create git tag: `git tag vX.Y.Z`
5. Push with tags: `git push && git push --tags`
6. Create GitHub release (triggers auto-publish)
7. Verify package on NPM: https://www.npmjs.com/package/voyager-x402-sdk

## After Publishing

Update the main repository to use the published version:

```bash
cd ../voyager-x402
# Edit package.json to change:
# "voyager-x402-sdk": "file:../voyager-x402-sdk"
# to:
# "voyager-x402-sdk": "^1.0.0"
bun install
```

## Troubleshooting

### Package name already taken

If `voyager-x402-sdk` is taken, consider:

- `@your-org/voyager-x402-sdk` (scoped package)
- `voyager-sdk-x402`
- Another unique name

### Permission denied

Ensure you have publish access to the package namespace.

### Build failures

Run `bun run prepublishOnly` locally to test the full build pipeline.
