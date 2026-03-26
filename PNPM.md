# pnpm - Package Manager Guide

Hướng dẫn sử dụng **pnpm** (package manager hiệu quả) cho MOCU project.

---

## 📦 pnpm là gì?

**pnpm** = "performant npm" (npm hiệu quả)

Một package manager thay thế npm/yarn với lợi thế:

| Tiêu Chí | npm | pnpm |
|----------|-----|------|
| **Tốc độ** | Chậm | 3x nhanh hơn |
| **Disk space** | 800MB-1GB | 100-200MB (90% nhỏ hơn) |
| **Lock file** | Lớn, hay conflict | Nhỏ, hiếm conflict |
| **Security** | Phantom dependencies | Strict (an toàn hơn) |
| **Parallelization** | Bình thường | Tối ưu (song song) |

---

## 🚀 Cài Đặt pnpm

### Install Global
```bash
# Cài từ npm
npm install -g pnpm

# Hoặc cài từ Corepack (tích hợp Node.js 16.9+)
corepack enable
corepack prepare pnpm@latest --activate
```

### Verify Installation
```bash
pnpm --version
# Output: 8.x.x hoặc mới hơn

pnpm store status
# Check local store size
```

---

## 📋 Commands Tương Đương

### Cài Đặt Dependencies

```bash
# npm
npm install

# pnpm (tương đương)
pnpm install

# npm (specific)
npm install react@18.2.0

# pnpm (specific - cũng hỗ trợ)
pnpm add react@18.2.0
```

### Dev Dependencies

```bash
# npm
npm install --save-dev prettier

# pnpm
pnpm add -D prettier
# hoặc
pnpm add --save-dev prettier
```

### Remove Package

```bash
# npm
npm uninstall prettier

# pnpm
pnpm remove prettier
```

### Update Dependencies

```bash
# npm
npm update

# pnpm
pnpm update
```

### Run Scripts

```bash
# npm
npm run dev
npm test
npm run build

# pnpm (tương đương)
pnpm dev
pnpm test
pnpm build

# hoặc
pnpm run dev
pnpm run test
pnpm run build
```

---

## 🎯 MOCU Project Commands

### Backend (pnpm)

```bash
cd backend

# Install dependencies
pnpm install

# Development
pnpm dev              # Start local server

# Testing
pnpm test             # Run test suite

# Building
pnpm type-check       # Type checking
pnpm build            # Production build

# Deployment
pnpm deploy           # Deploy to Cloudflare
pnpm deploy:prod      # Deploy to production

# Database
pnpm db:migrate:local # Apply migrations locally
pnpm db:create        # Create D1 database
```

### Frontend (pnpm)

```bash
cd frontend

# Install dependencies
pnpm install

# Development
pnpm dev              # Start Vite dev server
pnpm preview          # Preview production build

# Building
pnpm build            # Build for production
pnpm lint             # Lint code

# Bundling
pnpm build --outDir dist  # Explicit output dir
```

---

## 🏗️ Project Structure với pnpm

```
mocu/
├── pnpm-workspace.yaml      # Workspace config (optional)
├── backend/
│   ├── package.json
│   ├── pnpm-lock.yaml       # pnpm lock file
│   └── node_modules/        # Smaller (symlinks)
├── frontend/
│   ├── package.json
│   ├── pnpm-lock.yaml       # pnpm lock file
│   └── node_modules/        # Smaller (symlinks)
└── pnpm-store/              # Global package store (shared)
```

---

## 🔍 pnpm Store (Unique Feature)

### Content-Addressable Store

pnpm uses **global content-addressable store** (`~/.pnpm-store/`):

```
~/.pnpm-store/
├── v3/
│   ├── files/
│   │   ├── abc123... (package files, unique hash)
│   │   └── def456...
│   └── index-v5.json
```

### Benefits

- ✅ **Disk space:** Mỗi version của package chỉ lưu 1 lần
- ✅ **Speed:** Reuse packages từ store (không download lại)
- ✅ **Integrity:** Hash-based verification

### Manage Store

```bash
# Check store size
pnpm store status

# Clean unused packages
pnpm store prune

# Check if files exist
pnpm store path
```

---

## 🔐 pnpm-lock.yaml

### Tại Sao Commit Lock File?

```bash
# Commit lock file để ensure consistent versions
git add pnpm-lock.yaml
git commit -m "lock: update dependencies"

# Team members sẽ get exact same versions
pnpm install  # Uses pnpm-lock.yaml
```

### Structure

```yaml
lockfileVersion: 5.4

importers:
  .:
    dependencies:
      react: 18.2.0
      typescript: 5.0.0

packages:
  /react@18.2.0:
    resolution: {integrity: sha...}
    dependencies:
      react-dom: 18.2.0

  /typescript@5.0.0:
    resolution: {integrity: sha...}
```

---

## 🚀 Performance Comparison

### npm install (Fresh)
```
Time: 45-60 seconds
Disk: 800MB
Lock file: 5000+ lines
```

### pnpm install (Fresh)
```
Time: 15-20 seconds
Disk: 100-150MB
Lock file: 2000+ lines
```

### npm install (Cached)
```
Time: 30-40 seconds
Disk: 800MB
```

### pnpm install (Cached)
```
Time: 2-5 seconds
Disk: 100-150MB (reused)
```

**pnpm is 5-20x faster with caching!**

---

## 🔧 Configuration Files

### pnpm-workspace.yaml (Monorepo)

If you want monorepo support:

```yaml
packages:
  - 'backend'
  - 'frontend'
```

Then run from root:
```bash
pnpm install              # Installs for all packages
pnpm --filter backend run dev   # Run backend dev
pnpm --filter frontend run dev  # Run frontend dev
```

### .npmrc (Global Config)

```ini
# ~/.npmrc

# Use shamefully-hoist for compatibility
shamefully-hoist=true

# Store directory
store-dir=~/.pnpm-store

# Node modules directory strategy
node-modules-dir=node_modules
```

### .pnpmrc (Project-specific)

```ini
# mocu/.pnpmrc

# Prefer offline
prefer-offline=true

# Auto-install peer dependencies
auto-install-peers=true
```

---

## ✅ Troubleshooting pnpm

### Issue: "Module not found"

**Cause:** pnpm's strict mode (phantom dependencies not allowed)

**Solution:** Install missing dependencies
```bash
pnpm add missing-module
```

### Issue: "EACCES: permission denied"

**Solution:** Fix node_modules permissions
```bash
pnpm install --force
```

### Issue: "Lock file conflict"

**Solution:** Regenerate lock file
```bash
rm pnpm-lock.yaml
pnpm install
```

### Issue: "pnpm command not found"

**Solution:** Reinstall pnpm
```bash
npm install -g pnpm@latest
corepack prepare pnpm@latest --activate
```

---

## 🔄 Migrate from npm to pnpm

### Step 1: Remove npm artifacts

```bash
rm -rf node_modules package-lock.json
rm -rf backend/node_modules backend/package-lock.json
rm -rf frontend/node_modules frontend/package-lock.json
```

### Step 2: Install with pnpm

```bash
pnpm install
cd backend && pnpm install && cd ..
cd frontend && pnpm install && cd ..
```

### Step 3: Verify everything works

```bash
cd backend && pnpm dev    # Should work
# In another terminal:
cd frontend && pnpm dev   # Should work
```

### Step 4: Commit changes

```bash
git add -A
git commit -m "chore: migrate from npm to pnpm

- Remove node_modules and package-lock.json files
- Install dependencies using pnpm
- Generate pnpm-lock.yaml for reproducible installs
- pnpm provides 90% smaller node_modules and 3x faster installs
- Lock file conflicts are less likely with pnpm

Benefits:
✅ Faster installation (15-20s vs 45-60s)
✅ Smaller disk space (100MB vs 800MB)
✅ Stricter dependency management
✅ Better parallel execution
"