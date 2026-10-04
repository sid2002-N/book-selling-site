/** Granular permission keys (docs/API.md §4) — never a single "admin" permission. */
export const PERMISSIONS = {
  "products.read": "View products and catalog",
  "products.create": "Create products",
  "products.update": "Edit products, versions, uploads",
  "products.delete": "Archive products",
  "products.publish": "Publish and unpublish products",
  "orders.read": "View orders",
  "orders.refund": "Issue and decide refunds",
  "customers.read": "View customers",
  "customers.manage": "Block customers, revoke sessions, grant access",
  "payments.read": "View payments, disputes, webhooks",
  "payments.manage": "Reconcile payments",
  "marketing.manage": "Manage coupons, bundles and campaigns",
  "content.manage": "Manage editorial and site content",
  "reviews.moderate": "Moderate reviews",
  "support.manage": "Manage support tickets",
  "analytics.read": "View dashboards and analytics",
  "security.read": "View security and audit logs",
  "security.manage": "Manage admin users and roles",
  "settings.manage": "Change store settings",
  "system.read": "View system health and logs",
  "creator.manage": "Manage the creator system (reserved)",
} as const;

export type PermissionKey = keyof typeof PERMISSIONS;

export const ALL_PERMISSIONS = Object.keys(PERMISSIONS) as PermissionKey[];

/** Default roles (API §4). */
export const DEFAULT_ROLES: Record<string, { name: string; description: string; permissions: PermissionKey[] }> = {
  super_admin: { name: "Super Admin", description: "Full access", permissions: ALL_PERMISSIONS },
  catalog_manager: {
    name: "Catalog Manager",
    description: "Products and content",
    permissions: ["products.read", "products.create", "products.update", "products.delete", "products.publish", "content.manage"],
  },
  finance: {
    name: "Finance",
    description: "Orders, refunds, payments and analytics",
    permissions: ["orders.read", "orders.refund", "payments.read", "payments.manage", "analytics.read"],
  },
  support: {
    name: "Support",
    description: "Customers, orders, tickets and reviews",
    permissions: ["orders.read", "customers.read", "support.manage", "reviews.moderate"],
  },
  content_editor: { name: "Content Editor", description: "Editorial content", permissions: ["content.manage", "products.read"] },
  analyst: { name: "Analyst", description: "Read-only analytics", permissions: ["analytics.read", "orders.read"] },
};
