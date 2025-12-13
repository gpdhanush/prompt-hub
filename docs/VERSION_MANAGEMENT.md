# Version Management Guide

## Overview

The application version is displayed on the login page and is managed through environment variables for easy updates during production deployments.

---

## Setup

### 1. Add Version to `.env` File

Add the following line to your `.env` file:

```env
VITE_APP_VERSION=1.0.0
```

**Note**: For Vite, all environment variables must be prefixed with `VITE_` to be accessible in the frontend.

---

## Usage

### Manual Version Update

Set a specific version:

```bash
npm run version:set 1.2.3
# or
node scripts/update-version.js 1.2.3
```

### Automated Version Bumping

Automatically increment version:

```bash
# Patch version (1.0.0 -> 1.0.1) - for bug fixes
npm run version:patch

# Minor version (1.0.0 -> 1.1.0) - for new features
npm run version:minor

# Major version (1.0.0 -> 2.0.0) - for breaking changes
npm run version:major
```

---

## Production Deployment Workflow

### Option 1: Manual Update (Before Each Deployment)

```bash
# 1. Update version in .env
npm run version:set 1.2.3

# 2. Build the application
npm run build

# 3. Deploy
```

### Option 2: Automated Bump (Recommended)

```bash
# 1. Bump version automatically
npm run version:patch  # or minor/major

# 2. Review the change
git diff .env

# 3. Commit the version change
git add .env
git commit -m "Bump version to 1.0.1"

# 4. Build and deploy
npm run build
```

### Option 3: CI/CD Integration

Add to your deployment pipeline:

```yaml
# Example GitHub Actions
- name: Bump version
  run: npm run version:patch

- name: Build
  run: npm run build

- name: Deploy
  run: # your deployment commands
```

---

## Version Display

The version is automatically displayed on:
- **Login Page**: Bottom of the login form (footer area)

The version is read from `ENV_CONFIG.APP_VERSION` which comes from `VITE_APP_VERSION` in your `.env` file.

---

## Scripts Available

| Script | Description | Example |
|--------|-------------|---------|
| `npm run version:set [version]` | Set specific version | `npm run version:set 1.2.3` |
| `npm run version:patch` | Increment patch (1.0.0 → 1.0.1) | For bug fixes |
| `npm run version:minor` | Increment minor (1.0.0 → 1.1.0) | For new features |
| `npm run version:major` | Increment major (1.0.0 → 2.0.0) | For breaking changes |

---

## Version Format

Follows [Semantic Versioning](https://semver.org/):

- **Format**: `MAJOR.MINOR.PATCH[-PRERELEASE]`
- **Examples**: 
  - `1.0.0` (stable)
  - `1.2.3` (stable)
  - `1.0.0-beta` (prerelease)
  - `2.0.0-rc.1` (release candidate)

---

## Troubleshooting

### Version Not Showing

1. **Check `.env` file exists** and has `VITE_APP_VERSION` set
2. **Rebuild the app** - Environment variables are baked in at build time:
   ```bash
   npm run build
   ```
3. **Check browser console** for any errors

### Version Not Updating

- Environment variables are read at **build time**, not runtime
- You must rebuild after changing `.env`:
  ```bash
  npm run build
  ```

---

## Best Practices

1. **Always bump version before production deployment**
2. **Use semantic versioning** (MAJOR.MINOR.PATCH)
3. **Commit version changes** to git for tracking
4. **Document version changes** in release notes
5. **Automate in CI/CD** for consistent versioning

---

## Example Workflow

```bash
# Before deploying to production:

# 1. Bump version
npm run version:patch

# 2. Review changes
git status
git diff .env

# 3. Commit
git add .env
git commit -m "Bump version to 1.0.1 for production release"

# 4. Build
npm run build

# 5. Deploy
# ... your deployment process
```

---

**Last Updated**: After implementation
**Status**: ✅ Ready to use
