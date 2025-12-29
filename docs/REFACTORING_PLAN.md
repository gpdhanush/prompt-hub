# Employees Route Refactoring Plan

## Current Issues
- Single file with 2682 lines
- 17 routes mixed together
- Hard to maintain and navigate
- Affects IDE performance

## Proposed Structure

```
server/routes/employees/
├── index.js                    # Main router (imports all sub-routers)
├── employees.js                # Core CRUD operations (~600 lines)
├── employees-documents.js     # Document management routes (~400 lines)
├── employees-profile.js        # Profile management routes (~300 lines)
├── employees-hierarchy.js      # Hierarchy route (~200 lines)
└── upload-config.js            # Multer configuration (~100 lines)
```

## Route Distribution

### employees.js (Core CRUD)
- GET / (list all)
- GET /:id (get by ID)
- GET /:id/basic (get basic info)
- GET /by-user/:userId (get by user ID)
- POST / (create)
- PUT /:id (update)
- DELETE /:id (delete)
- GET /available-positions

### employees-documents.js
- GET /:id/documents
- POST /:id/documents
- PUT /:id/documents/:docId/verify
- PUT /:id/documents/:docId/unverify
- DELETE /:id/documents/:docId

### employees-profile.js
- POST /upload-profile-photo
- PUT /my-profile
- POST /my-documents

### employees-hierarchy.js
- GET /hierarchy

### upload-config.js
- Multer configurations for profile photos and documents

## Benefits
1. Better maintainability
2. Faster IDE performance
3. Easier code navigation
4. Reduced merge conflicts
5. Better separation of concerns

