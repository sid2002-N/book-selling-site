/**
 * Default navigation (DESIGN_SYSTEM §12). These are fallbacks: once the content module
 * serves `navigation_item` rows from the database, those take precedence.
 */
export type NavLink = { label: string; href: string };

export const primaryNav: NavLink[] = [
  { label: "Home", href: "/" },
  { label: "Explore", href: "/explore" },
  { label: "Books", href: "/books" },
  { label: "Guides", href: "/guides" },
  { label: "Workbooks", href: "/workbooks" },
  { label: "Collections", href: "/collections" },
  { label: "Free Resources", href: "/free-resources" },
];

/** Compact variant used on system-state pages (C8). */
export const compactNav: NavLink[] = [
  { label: "Books", href: "/books" },
  { label: "Guides", href: "/guides" },
  { label: "Collections", href: "/collections" },
  { label: "Journal", href: "/journal" },
];

export const footerNav: { title: string; links: NavLink[] }[] = [
  {
    title: "Explore",
    links: [
      { label: "All Products", href: "/explore" },
      { label: "Books", href: "/books" },
      { label: "Guides", href: "/guides" },
      { label: "Workbooks", href: "/workbooks" },
      { label: "Collections", href: "/collections" },
      { label: "Free Resources", href: "/free-resources" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Journal", href: "/journal" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "Help Center", href: "/help" },
      { label: "FAQ", href: "/faq" },
      { label: "Refund Policy", href: "/refund-policy" },
      { label: "Terms of Service", href: "/terms" },
      { label: "Privacy Policy", href: "/privacy" },
    ],
  },
];

export const accountNav: NavLink[] = [
  { label: "Dashboard", href: "/account" },
  { label: "My Library", href: "/account/library" },
  { label: "Downloads", href: "/account/downloads" },
  { label: "Wishlist", href: "/account/wishlist" },
  { label: "Orders", href: "/account/orders" },
  { label: "Reviews", href: "/account/reviews" },
  { label: "Settings", href: "/account/settings" },
];

export type AdminNavItem = { label: string; href: string; permission: string };
export type AdminNavGroup = { label: string | null; items: AdminNavItem[] };

/** Grouped admin tree (ARCHITECTURE §7). Items render only with the matching permission. */
export const adminNav: AdminNavGroup[] = [
  { label: null, items: [{ label: "Dashboard", href: "/admin", permission: "analytics.read" }] },
  {
    label: "Catalog",
    items: [
      { label: "Products", href: "/admin/products", permission: "products.read" },
      { label: "Categories", href: "/admin/categories", permission: "products.read" },
      { label: "Collections", href: "/admin/collections", permission: "products.read" },
    ],
  },
  {
    label: "Commerce",
    items: [
      { label: "Orders", href: "/admin/orders", permission: "orders.read" },
      { label: "Payments", href: "/admin/payments", permission: "payments.read" },
      { label: "Refunds", href: "/admin/refunds", permission: "orders.read" },
    ],
  },
  {
    label: "Customers",
    items: [{ label: "Customers", href: "/admin/customers", permission: "customers.read" }],
  },
  {
    label: "Marketing",
    items: [{ label: "Coupons", href: "/admin/coupons", permission: "marketing.manage" }],
  },
  {
    label: "Moderation",
    items: [{ label: "Reviews", href: "/admin/reviews", permission: "reviews.moderate" }],
  },
];
