# Vite React to Next.js Migration Guide

## Overview

Converting your Vite React app to Next.js is possible but requires significant refactoring. This guide outlines the process and challenges.

## Key Differences

### 1. **Routing**
- **Vite/React Router**: Client-side routing with `<BrowserRouter>`, `<Routes>`, `<Route>`
- **Next.js**: File-based routing (Pages Router) or App Router (Next.js 13+)

### 2. **Project Structure**
- **Vite**: `src/pages/` contains React components
- **Next.js**: `pages/` or `app/` directory for routes

### 3. **Build System**
- **Vite**: Uses Vite bundler
- **Next.js**: Uses Webpack/SWC with built-in optimizations

### 4. **API Calls**
- **Vite**: All API calls go to external backend
- **Next.js**: Can use API Routes (`/api/*`) for server-side endpoints

## Migration Steps

### Step 1: Install Next.js

```bash
npm install next@latest react@latest react-dom@latest
npm uninstall vite @vitejs/plugin-react-swc react-router-dom
```

### Step 2: Update package.json

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  }
}
```

### Step 3: Create Next.js Configuration

Create `next.config.js`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // If using path aliases
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, './src'),
    };
    return config;
  },
  // Environment variables
  env: {
    VITE_API_URL: process.env.VITE_API_URL,
    // ... other env vars
  },
}

module.exports = nextConfig
```

### Step 4: Restructure Project

#### Option A: Pages Router (Traditional)

```
project-root/
├── pages/
│   ├── _app.tsx          # App wrapper (replaces App.tsx)
│   ├── _document.tsx     # HTML document customization
│   ├── index.tsx         # Home/Login page
│   ├── dashboard.tsx
│   ├── users.tsx
│   ├── projects/
│   │   ├── index.tsx     # /projects
│   │   ├── [id].tsx      # /projects/:id
│   │   ├── create.tsx    # /projects/create
│   │   └── edit/
│   │       └── [id].tsx  # /projects/edit/:id
│   └── ...
├── src/
│   ├── components/       # Keep as is
│   ├── lib/             # Keep as is
│   └── hooks/           # Keep as is
└── public/              # Keep as is
```

#### Option B: App Router (Next.js 13+, Recommended)

```
project-root/
├── app/
│   ├── layout.tsx        # Root layout
│   ├── page.tsx          # Home/Login
│   ├── dashboard/
│   │   └── page.tsx
│   ├── projects/
│   │   ├── page.tsx      # /projects
│   │   ├── [id]/
│   │   │   └── page.tsx # /projects/:id
│   │   ├── create/
│   │   │   └── page.tsx
│   │   └── edit/
│   │       └── [id]/
│   │           └── page.tsx
│   └── ...
├── src/
│   ├── components/
│   ├── lib/
│   └── hooks/
└── public/
```

### Step 5: Convert Routing

#### Before (React Router):
```tsx
// App.tsx
<BrowserRouter>
  <Routes>
    <Route path="/projects" element={<Projects />} />
    <Route path="/projects/:id" element={<ProjectDetail />} />
  </Routes>
</BrowserRouter>
```

#### After (Pages Router):
```tsx
// pages/projects/index.tsx
export default function Projects() {
  return <ProjectsPage />;
}

// pages/projects/[id].tsx
import { useRouter } from 'next/router';

export default function ProjectDetail() {
  const router = useRouter();
  const { id } = router.query;
  return <ProjectDetailPage id={id} />;
}
```

#### After (App Router):
```tsx
// app/projects/page.tsx
export default function Projects() {
  return <ProjectsPage />;
}

// app/projects/[id]/page.tsx
export default function ProjectDetail({ params }: { params: { id: string } }) {
  return <ProjectDetailPage id={params.id} />;
}
```

### Step 6: Convert Components

#### Client Components
For components using hooks, state, or browser APIs, add `'use client'`:

```tsx
'use client';

import { useState } from 'react';

export function MyComponent() {
  const [state, setState] = useState();
  // ...
}
```

#### Server Components
Default in App Router - no React hooks, no browser APIs:

```tsx
// Server component (default)
export default function ServerComponent() {
  // Can fetch data directly
  const data = await fetchData();
  return <div>{data}</div>;
}
```

### Step 7: Update Navigation

#### Before (React Router):
```tsx
import { useNavigate } from 'react-router-dom';

const navigate = useNavigate();
navigate('/projects');
```

#### After (Next.js):
```tsx
import { useRouter } from 'next/router'; // Pages Router
// or
import { useRouter } from 'next/navigation'; // App Router

const router = useRouter();
router.push('/projects');
```

### Step 8: Handle Environment Variables

#### Before (Vite):
```env
VITE_API_URL=https://api.example.com
```

#### After (Next.js):
```env
NEXT_PUBLIC_API_URL=https://api.example.com
```

Update code:
```tsx
// Before
const apiUrl = import.meta.env.VITE_API_URL;

// After
const apiUrl = process.env.NEXT_PUBLIC_API_URL;
```

### Step 9: Update Imports

#### Path Aliases
Update `tsconfig.json`:
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### Step 10: Convert App.tsx to _app.tsx (Pages Router)

```tsx
// pages/_app.tsx
import type { AppProps } from 'next/app';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import '@/styles/globals.css';

const queryClient = new QueryClient();

export default function App({ Component, pageProps }: AppProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <Component {...pageProps} />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
```

### Step 11: Convert App.tsx to layout.tsx (App Router)

```tsx
// app/layout.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import '@/styles/globals.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </QueryClientProvider>
      </body>
    </html>
  );
}
```

## Challenges & Considerations

### 1. **Large Codebase**
- You have 60+ pages to convert
- Estimated time: 2-4 weeks for full migration

### 2. **React Router Dependencies**
- All `<Link>`, `<Navigate>`, `useNavigate` need conversion
- Protected routes logic needs refactoring

### 3. **Client-Side Features**
- PWA features may need adjustment
- Service workers work differently
- Client-side state management stays the same

### 4. **Build Output**
- Vite: Static files in `dist/`
- Next.js: `.next/` directory with server/client bundles

### 5. **Deployment**
- Vite: Static hosting
- Next.js: Can be static export or server-rendered

## Benefits of Migration

✅ **SEO**: Better SEO with server-side rendering  
✅ **Performance**: Automatic code splitting, image optimization  
✅ **Developer Experience**: Built-in routing, API routes  
✅ **Deployment**: Easy deployment on Vercel (or other platforms)

## Drawbacks

❌ **Migration Effort**: Significant refactoring required  
❌ **Learning Curve**: New concepts (Server Components, etc.)  
❌ **Breaking Changes**: Some patterns need rethinking  
❌ **Bundle Size**: May be larger initially

## Recommendation

**Consider staying with Vite if:**
- Your app is primarily client-side
- SEO is not critical
- You're happy with current performance
- Migration effort outweighs benefits

**Consider migrating to Next.js if:**
- You need better SEO
- You want server-side rendering
- You plan to add API routes
- You want Next.js optimizations

## Quick Start Migration Script

Would you like me to:
1. Create a migration script to automate some conversions?
2. Start converting specific pages/components?
3. Set up the Next.js project structure?

Let me know which approach you prefer!
