# Unused Code Analysis Report

**Generated:** $(date)  
**Project:** prompt-hub  
**Scope:** Frontend + Backend

---

## Summary

This report identifies unused files, folders, modules, imports, exports, dead components, duplicate logic, and commented-out code blocks that can potentially be removed from the codebase.

**⚠️ IMPORTANT:** All items marked as "REVIEW" require manual verification before deletion. Items marked as "YES" appear safe to remove but should still be verified in a staging environment first.

---

## 1. Backup and Temporary Files

| Type | Path | Reason | Safe to Remove |
|------|------|--------|----------------|
| File | `src/pages/FileManager.tsx.tmp` | Temporary file - duplicate of FileManager.tsx | **YES** |
| File | `src/lib/api.ts.backup` | Backup file - not referenced anywhere | **YES** |
| File | `src/features/auth/pages/ProfileSetup.tsx.backup` | Backup file - not referenced anywhere | **YES** |
| File | `server/routes/employees.js.backup` | Backup file - not referenced anywhere | **YES** |
| File | `server/routes/assets.js.bak` | Backup file - not referenced anywhere | **YES** |

---

## 2. Unused Files and Components

| Type | Path | Reason | Safe to Remove |
|------|------|--------|----------------|
| File | `src/features/employees/pages/EmployeeCreateNew.tsx` | Not imported or referenced anywhere in codebase | **YES** |
| File | `src/features/employees/pages/EmployeeEditNew.tsx` | Not imported or referenced anywhere in codebase | **YES** |
| File | `src/components/FCMDebug.tsx` | Component defined but never imported or used | **YES** |
| Folder | `src/components/forms/` | Empty directory with no files | **YES** |
| File | `src/components/bug/BugComments.tsx` | Duplicate - features/bugs/components/BugComments.tsx is used instead | **REVIEW** |
| File | `src/components/task/TaskForm.tsx` | Likely duplicate - features/tasks/components/TaskForm.tsx is used | **REVIEW** |
| File | `src/components/employee/EmployeeForm.tsx` | Likely duplicate - features/employees/components/EmployeeForm.tsx is used | **REVIEW** |
| File | `src/components/bug/BugForm.tsx` | Only used once in BugEdit.tsx - verify if features version exists | **REVIEW** |

---

## 3. Duplicate Files and Logic

| Type | Path | Reason | Safe to Remove |
|------|------|--------|----------------|
| File | `src/hooks/useProjects.ts` | Duplicate - src/features/projects/hooks/useProjects.ts is used instead | **REVIEW** |
| File | `src/pages/FileManager.tsx.tmp` | Exact duplicate of FileManager.tsx | **YES** |

**Note:** The duplicate `useProjects.ts` in `src/hooks/` has slightly different implementation (missing staleTime/gcTime configs) but the features version is the one being used.

---

## 4. Commented-Out Code Blocks

| Type | Path | Reason | Safe to Remove |
|------|------|--------|----------------|
| Code Block | `server/index.js` (lines 400-450) | Large commented-out server.listen block - replaced by active code below | **YES** |

**Details:**
- Lines 400-450 contain a fully commented-out server initialization block
- This code has been replaced by the active implementation starting at line 451
- The commented code includes health checks, token cleanup, and scheduler initialization that are now handled in the active code

---

## 5. Unused Imports and Exports

| Type | Path | Reason | Safe to Remove |
|------|------|--------|----------------|
| Import | `src/components/GlobalSearch.tsx` (line 4) | TODO comment about fixing import path - verify if useDebounce import is correct | **REVIEW** |

**Note:** The GlobalSearch component has a TODO comment about fixing the import path for `useDebounce`. The import appears to work, but the TODO suggests uncertainty.

---

## 6. TODO Comments (Not Unused, But Worth Reviewing)

| Type | Path | Reason | Action |
|------|------|--------|--------|
| TODO | `src/lib/api.ts` | Multiple TODO comments about migrating to feature-based APIs (lines 204-390) | **REVIEW** - These are migration notes, not unused code |
| TODO | `src/features/kanban/pages/Kanban.tsx` (line 302) | TODO comment about opening board settings | **REVIEW** - Feature not implemented yet |

---

## 7. Empty Directories

| Type | Path | Reason | Safe to Remove |
|------|------|--------|----------------|
| Folder | `src/components/forms/` | Empty directory with no files | **YES** |

---

## Recommendations

### High Priority (Safe to Remove)
1. **Delete all backup files** (.backup, .bak, .tmp extensions)
2. **Delete temporary file** `FileManager.tsx.tmp`
3. **Delete unused employee pages** (EmployeeCreateNew.tsx, EmployeeEditNew.tsx)
4. **Delete FCMDebug component** if not needed for debugging
5. **Remove commented-out code block** in server/index.js (lines 400-450)
6. **Delete empty forms directory**

### Medium Priority (Requires Verification)
1. **Verify duplicate components** in `src/components/` vs `src/features/`:
   - Check if `components/bug/BugComments.tsx` is truly unused
   - Check if `components/task/TaskForm.tsx` is truly unused
   - Check if `components/employee/EmployeeForm.tsx` is truly unused
   - Check if `components/bug/BugForm.tsx` should be migrated to features

2. **Verify duplicate hook**:
   - Confirm `src/hooks/useProjects.ts` is not used anywhere
   - If confirmed unused, delete it

### Low Priority (Documentation/Planning)
1. **Review TODO comments** in `src/lib/api.ts` - these are migration notes
2. **Complete TODO** in `src/features/kanban/pages/Kanban.tsx` if board settings feature is needed

---

## Verification Steps Before Deletion

For items marked as "REVIEW":

1. **Search for imports:**
   ```bash
   grep -r "from.*path/to/file" src/ server/
   ```

2. **Search for dynamic references:**
   ```bash
   grep -r "filename" src/ server/
   ```

3. **Check if file is referenced in:**
   - Route definitions
   - Dynamic imports
   - Environment variables
   - Build configurations

4. **Test in staging environment** after removal

---

## Files to Keep (Do Not Delete)

- All files in `database/` folder (migration files)
- All files in `docs/` folder (documentation)
- All files in `public/` folder (static assets)
- All files in `dist/` folder (build output - regenerated)
- Configuration files (package.json, tsconfig.json, etc.)
- Authentication, permissions, audit logs, encryption, payment-related logic

---

## Notes

- This analysis was performed by scanning imports, exports, and file references
- Some files may be used dynamically or via runtime reflection - manual verification required
- Backup files are safe to delete as they are not referenced in the codebase
- Duplicate files should be verified to ensure the correct version is being used
- Commented-out code blocks serve no purpose and can be removed

---

**End of Report**

