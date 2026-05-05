export interface PermissionDef {
  key: string;
  label: string;
  description: string;
  group: string;
}

export const PERMISSION_GROUPS = [
  "User Management",
  "Compliance Records",
  "Students & Instructors",
  "Documents",
  "Digital Forms",
  "Regulatory & FAA",
  "Audit & Reports",
  "Administration",
] as const;

export const PERMISSION_DEFINITIONS: PermissionDef[] = [
  // User Management
  { key: "users:view",       label: "View Users",          description: "See the full list of platform users",               group: "User Management" },
  { key: "users:invite",     label: "Invite Users",        description: "Send invitations and create new user accounts",    group: "User Management" },
  { key: "users:edit_role",  label: "Edit User Roles",     description: "Change the role assigned to any user",             group: "User Management" },
  { key: "users:deactivate", label: "Deactivate Users",    description: "Suspend or reactivate user accounts",              group: "User Management" },
  { key: "users:delete",     label: "Delete Users",        description: "Permanently remove users from the platform",       group: "User Management" },

  // Compliance Records
  { key: "compliance:view",   label: "View Records",       description: "View all training event and compliance records",   group: "Compliance Records" },
  { key: "compliance:add",    label: "Log Events",         description: "Add new training events and compliance records",   group: "Compliance Records" },
  { key: "compliance:edit",   label: "Edit Records",       description: "Modify existing training records",                 group: "Compliance Records" },
  { key: "compliance:export", label: "Export CSV",         description: "Download compliance data as CSV",                  group: "Compliance Records" },

  // Students & Instructors
  { key: "students:view",     label: "View Students",      description: "See the student roster",                           group: "Students & Instructors" },
  { key: "students:manage",   label: "Manage Students",    description: "Add, edit, and update student records",            group: "Students & Instructors" },
  { key: "instructors:view",  label: "View Instructors",   description: "See the instructor list",                          group: "Students & Instructors" },
  { key: "instructors:manage",label: "Manage Instructors", description: "Add, edit, and update instructor records",         group: "Students & Instructors" },

  // Documents
  { key: "documents:view",    label: "View Documents",     description: "Access the document repository",                   group: "Documents" },
  { key: "documents:upload",  label: "Upload Documents",   description: "Upload new documents for processing",              group: "Documents" },
  { key: "documents:delete",  label: "Delete Documents",   description: "Remove documents from the repository",             group: "Documents" },

  // Digital Forms
  { key: "forms:view",        label: "View Forms",         description: "View form templates and submissions",              group: "Digital Forms" },
  { key: "forms:submit",      label: "Submit Forms",       description: "Fill out and submit forms",                        group: "Digital Forms" },
  { key: "forms:manage",      label: "Manage Templates",   description: "Create, edit, and delete form templates",          group: "Digital Forms" },
  { key: "forms:ai_generate", label: "AI Generate",        description: "Generate templates from FAA checklists using AI",  group: "Digital Forms" },
  { key: "forms:review",      label: "Review Submissions", description: "Approve or reject form submissions",               group: "Digital Forms" },

  // Regulatory & FAA
  { key: "faa:view",           label: "FAA Repository",    description: "Browse the monitored FAA document repository",     group: "Regulatory & FAA" },
  { key: "regulatory:view",    label: "Regulatory Alerts", description: "View regulatory monitoring alerts",                group: "Regulatory & FAA" },
  { key: "regulatory:manage",  label: "Manage Monitoring", description: "Configure regulatory link monitoring",             group: "Regulatory & FAA" },

  // Audit & Reports
  { key: "audit:view",         label: "View Audit Log",    description: "Access the full audit history",                    group: "Audit & Reports" },
  { key: "audit:export",       label: "Export Audit Log",  description: "Download audit history as CSV",                    group: "Audit & Reports" },
  { key: "reports:generate",   label: "Generate Reports",  description: "Create and print compliance reports",              group: "Audit & Reports" },

  // Administration
  { key: "admin:settings",     label: "System Settings",   description: "Access system configuration and settings",         group: "Administration" },
  { key: "admin:roles",        label: "Manage Roles",      description: "Edit role permissions and create custom roles",    group: "Administration" },
];

export const ALL_PERMISSIONS = PERMISSION_DEFINITIONS.map((p) => p.key);

export const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: [...ALL_PERMISSIONS],

  auditor: [
    "users:view",
    "compliance:view", "compliance:export",
    "students:view",
    "instructors:view",
    "documents:view",
    "forms:view", "forms:review",
    "faa:view", "regulatory:view",
    "audit:view", "audit:export",
    "reports:generate",
  ],

  instructor: [
    "compliance:view", "compliance:add", "compliance:export",
    "students:view", "students:manage",
    "instructors:view",
    "documents:view", "documents:upload",
    "forms:view", "forms:submit", "forms:manage",
    "faa:view", "regulatory:view",
    "reports:generate",
  ],

  viewer: [
    "compliance:view",
    "students:view",
    "instructors:view",
    "documents:view",
    "forms:view",
    "faa:view", "regulatory:view",
    "audit:view",
    "reports:generate",
  ],
};

export interface RoleDefinition {
  roleName: string;
  displayName: string;
  description: string;
  color: string;
  isSystem: boolean;
}

export const SYSTEM_ROLES: RoleDefinition[] = [
  {
    roleName: "admin",
    displayName: "Administrator",
    description: "Full system access with all permissions",
    color: "bg-red-100 text-red-700",
    isSystem: true,
  },
  {
    roleName: "auditor",
    displayName: "Auditor",
    description: "Read-only plus export and reporting capabilities",
    color: "bg-purple-100 text-purple-700",
    isSystem: true,
  },
  {
    roleName: "instructor",
    displayName: "Instructor",
    description: "Manages training events, students, and forms",
    color: "bg-blue-100 text-blue-700",
    isSystem: true,
  },
  {
    roleName: "viewer",
    displayName: "Viewer",
    description: "Read-only access across all modules",
    color: "bg-gray-100 text-gray-700",
    isSystem: true,
  },
];

export function getRoleDisplay(role: string): RoleDefinition {
  return (
    SYSTEM_ROLES.find((r) => r.roleName === role) ?? {
      roleName: role,
      displayName: role.charAt(0).toUpperCase() + role.slice(1),
      description: "Custom role",
      color: "bg-teal-100 text-teal-700",
      isSystem: false,
    }
  );
}
