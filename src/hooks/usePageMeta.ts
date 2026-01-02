import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';

interface PageMetaOptions {
  title: string;
  description?: string;
  entityName?: string;
  entityType?: 'project' | 'task' | 'bug' | 'user' | 'employee';
  customMeta?: Record<string, string>;
}

export const usePageMeta = ({
  title,
  description,
  entityName,
  entityType,
  customMeta = {}
}: PageMetaOptions) => {
  // Generate dynamic title
  const fullTitle = entityName && entityType
    ? `${entityType.charAt(0).toUpperCase() + entityType.slice(1)}: ${entityName} | ${title}`
    : entityName
    ? `${entityName} | ${title}`
    : `${title} | Admin Panel`;

  // Generate description
  const metaDescription = description || `Manage ${entityType || 'content'} in the admin panel`;

  useEffect(() => {
    // Set page title directly for immediate effect
    document.title = fullTitle;
  }, [fullTitle]);

  // Return the Helmet component for rendering
  return React.createElement(Helmet, null,
    React.createElement('title', null, fullTitle),
    React.createElement('meta', { name: 'description', content: metaDescription }),
    React.createElement('meta', { name: 'robots', content: 'noindex, nofollow' }),

    // Open Graph tags for internal sharing
    React.createElement('meta', {
      property: 'og:title',
      content: entityName && entityType
        ? `${entityType.charAt(0).toUpperCase() + entityType.slice(1)}: ${entityName}`
        : entityName || title
    }),
    React.createElement('meta', {
      property: 'og:description',
      content: metaDescription
    }),
    React.createElement('meta', { property: 'og:type', content: 'website' }),

    // Custom meta tags
    ...Object.entries(customMeta).map(([key, value]) =>
      React.createElement('meta', { key, name: key, content: value })
    )
  );
};

// Predefined meta configurations for common pages
export const pageMeta = {
  dashboard: {
    title: "Dashboard",
    description: "Admin dashboard with system overview and key metrics"
  },

  projects: {
    title: "Projects",
    description: "View and manage all projects"
  },

  projectDetail: (projectName: string) => ({
    title: "Project Details",
    description: `View and manage project details and tasks`,
    entityName: projectName,
    entityType: 'project' as const
  }),

  tasks: {
    title: "Tasks",
    description: "View and manage all tasks"
  },

  taskDetail: (taskName: string) => ({
    title: "Task Details",
    description: `View and manage task details and progress`,
    entityName: taskName,
    entityType: 'task' as const
  }),

  bugs: {
    title: "Bugs",
    description: "View and manage all bug reports"
  },

  bugDetail: (bugName: string) => ({
    title: "Bug Details",
    description: `View and manage bug details and resolution`,
    entityName: bugName,
    entityType: 'bug' as const
  }),

  employees: {
    title: "Employees",
    description: "View and manage employee information"
  },

  employeeDetail: (employeeName: string) => ({
    title: "Employee Details",
    description: `View and manage employee profile and information`,
    entityName: employeeName,
    entityType: 'employee' as const
  }),

  settings: {
    title: "Settings",
    description: "Configure system settings and preferences"
  },

  profile: {
    title: "Profile",
    description: "Manage your user profile and preferences"
  }
};
