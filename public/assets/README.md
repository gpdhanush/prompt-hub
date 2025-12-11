# Assets Folder

This folder contains static assets for the application.

## Folder Structure

```
public/
├── assets/
│   ├── images/
│   │   └── logo.png          # Main logo image
│   └── README.md             # This file
├── favicon.ico
└── robots.txt
```

## How to Use Assets

### Images
Place your logo and other images in `public/assets/images/`

**Example:**
- Logo: `public/assets/images/logo.png`
- Reference in code: `/assets/images/logo.png`

### In React Components

```tsx
// Using public folder assets
<img src="/assets/images/logo.png" alt="Logo" />

// Or import if in src folder
import logo from '@/assets/images/logo.png';
<img src={logo} alt="Logo" />
```

## Recommended Logo Specifications

- **Format:** PNG or SVG (SVG recommended for scalability)
- **Size:** 200x200px minimum (or larger for high DPI)
- **Background:** Transparent preferred
- **File name:** `logo.png` or `logo.svg`

## Current Logo Usage

The logo is used in:
1. **Sidebar** - `src/components/layout/AdminSidebar.tsx`
2. **Login Page** - `src/pages/Login.tsx`
3. **Header** - `src/components/layout/AdminHeader.tsx` (if needed)

## Project Information

- **Project Name:** Naethra EMS
- **Full Name:** Employee and Project Management System
- **Company:** Naethra Technologies Pvt. Ltd
- **Created by:** gpdhanush
