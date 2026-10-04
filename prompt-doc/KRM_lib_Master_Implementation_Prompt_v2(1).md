# KRM.lib — MASTER IMPLEMENTATION PROMPT

## ROLE

You are the lead product engineer, UI/UX engineer, frontend architect, backend architect, and product designer responsible for turning the provided KRM.lib UI/UX references and product architecture into a complete, production-grade digital publishing and ecommerce platform.

You are NOT starting a generic ecommerce website.

You are building:

# KRM.lib

### Knowledge • Resource • Management

KRM.lib is a premium digital knowledge marketplace for ebooks, guides, workbooks, reference products, collections, and other downloadable digital resources.

The platform should feel like a combination of:

- A premium digital bookstore
- A modern knowledge library
- A curated editorial platform
- A digital product marketplace
- A personal reading library
- A premium ecommerce platform

The final product must feel like a real commercial product, not a template, demo, dashboard mockup, or collection of disconnected pages.

---

# 1. SOURCE OF TRUTH

You have been provided with:

1. UI/UX reference images
2. KRM.lib page architecture / product specification
3. Existing project codebase, if present

Treat these sources in the following priority:

### Priority 1 — Existing functional requirements
Preserve working functionality unless it directly conflicts with the approved design.

### Priority 2 — KRM.lib UI/UX reference images
Use the provided screenshots/designs as the primary visual reference.

### Priority 3 — KRM.lib page architecture
Use the provided page architecture to determine the complete application structure.

### Priority 4 — General design judgment
Only use your own design judgment when something has not been explicitly defined.

DO NOT replace the KRM.lib visual identity with a generic SaaS/ecommerce design.

---

# 2. CORE PRODUCT IDENTITY

The brand is:

## KRM.lib

KRM = Knowledge Resource & Management.

The product should communicate:

- Knowledge
- Books
- Learning
- Organization
- Discovery
- Personal growth
- Digital ownership
- Quality
- Curation
- Editorial sophistication

Avoid making the platform look like:

- Shopify
- Gumroad
- Amazon
- Etsy
- Generic SaaS
- Generic AI dashboard
- Generic Tailwind template

It can use familiar ecommerce UX patterns where appropriate, but the visual identity must remain distinctly KRM.lib.

---

# 3. VISUAL DIRECTION

Follow the supplied UI references extremely closely.

The visual language should be:

- Premium
- Editorial
- Warm
- Intellectual
- Modern
- Minimal
- Soft
- Tactile
- Slightly literary
- High-end digital publishing

Use:

- Liquid glass
- Glassmorphism where appropriate
- Soft translucency
- Warm neutral surfaces
- Deep plum / burgundy accents
- Warm amber accents
- Cream / parchment tones
- Subtle gradients
- Soft shadows
- Fine borders
- Large editorial typography
- Rounded but sophisticated cards
- Elegant spacing
- Premium micro-interactions

Do NOT overuse glassmorphism.

Glass should support hierarchy rather than become visual noise.

---

# 4. DESIGN SYSTEM

Create a centralized KRM.lib design system.

Do not style every page independently.

Create reusable design tokens for:

### Colors

Define semantic tokens for:

- Background
- Surface
- Elevated surface
- Glass surface
- Border
- Text primary
- Text secondary
- Muted text
- Accent
- Accent secondary
- Success
- Warning
- Error
- Info

Use the established KRM warm/plum/amber visual language.

Do not introduce random blue/indigo branding.

---

# 5. TYPOGRAPHY

Create a proper typography hierarchy.

Include:

- Display
- H1
- H2
- H3
- H4
- Body
- Small
- Caption
- Label
- Price
- Metadata
- Navigation

The typography should feel editorial and book-oriented.

Use a high-quality serif/editorial typeface for major headings where appropriate and a clean sans-serif for UI.

Maintain excellent readability.

---

# 6. SPACING SYSTEM

Create a consistent spacing scale.

All components should use the centralized spacing system.

Avoid arbitrary values scattered throughout the application.

---

# 7. COMPONENT SYSTEM

Build a reusable component library.

At minimum include:

## Navigation

- Desktop Navbar
- Mobile Navbar
- Sidebar
- Mobile Bottom Navigation
- Breadcrumbs
- Command Search
- Account Menu
- Cart Button
- Wishlist Button

## Product

- Product Card
- Compact Product Card
- Horizontal Product Card
- Product Grid
- Product List
- Product Cover
- Product Spine
- Price Display
- Discount Badge
- Rating
- Product Metadata
- Product Actions
- Product Preview
- Product Carousel

## Library

- Library Shelf
- Book Spine
- Book Stack
- Book Hover
- Book Selected State
- Book Open Animation
- Library Section
- Continue Reading Card
- Reading Progress

## Commerce

- Cart Item
- Cart Summary
- Coupon Input
- Checkout Stepper
- Payment Method Selector
- Order Summary
- Payment State
- Success State
- Failure State

## Forms

- Input
- Select
- Search
- Checkbox
- Radio
- Switch
- File Upload
- Date Picker
- Rich Text Editor
- Form Section
- Validation Message

## Content

- Article Card
- Collection Card
- Category Card
- Author Card
- Reading List Card
- Resource Card

## Feedback

- Toast
- Modal
- Drawer
- Bottom Sheet
- Dialog
- Empty State
- Loading State
- Skeleton
- Error State
- Success State

---

# 8. KRM SIGNATURE EXPERIENCE — THE LIBRARY

This is one of the most important parts of the entire product.

The KRM.lib library should NOT simply be a normal grid of book covers.

It should have a physical-library-inspired digital experience.

Every book should have a vertical spine.

When a new product is added to the catalog, the system should be capable of representing that product as another book/spine in the library.

The homepage library should visually resemble a curated bookshelf.

Each spine should have:

- Product title
- Category/color treatment
- Subtle texture
- Spine typography
- Product-specific visual identity

Interaction:

### Default

Books rest vertically together.

### Hover

The selected book subtly:

- Moves forward
- Rotates slightly
- Increases elevation
- Reveals metadata

### Click

The book:

1. Moves out of the shelf
2. Rotates/open animation
3. Reveals preview
4. Allows user to enter product detail

The interaction should feel physical without becoming gimmicky.

---

# 9. LIBRARY MUST SCALE

Do NOT hardcode books.

The library must be data-driven.

Example conceptual model:

Product
├── id
├── title
├── slug
├── cover
├── spineColor
├── category
├── type
├── price
├── status
└── publishedAt

The library automatically renders products.

If an admin creates a new product, it should become available for the appropriate library/catalog surfaces without manually editing frontend code.

---

# 10. PRODUCT TYPES

Support at minimum:

### Book
Digital ebook/reference book.

### Guide
Focused instructional resource.

### Workbook
Fillable/interactable workbook.

### Collection
Multiple products sold together.

### Bundle
Commercial product bundle.

### Free Resource
Free downloadable resource.

Design the architecture so new product types can be added later.

---

# 11. PUBLIC STOREFRONT

Implement the complete storefront.

Required core pages include:

- Home
- Explore
- Books
- Guides
- Workbooks
- Collections
- New Releases
- Popular / Trending
- Free Resources

Catalog architecture must support:

- Categories
- Category pages
- Search
- Search suggestions
- Search empty state
- Filtering
- Sorting
- Pagination/infinite loading where appropriate

The page architecture supplied with the project is the authoritative feature list.

---

# 12. PRODUCT DETAIL

Product pages are critical.

Every product page should support:

- Cover
- Title
- Subtitle
- Description
- Price
- Original price
- Discount
- Buy Now
- Add to Cart
- Wishlist
- Preview
- Table of contents
- What's inside
- Number of pages
- File format
- File size
- Language
- Version
- Last updated
- Author
- Publisher
- Reviews
- Related products
- Frequently bought together
- FAQ

Do not create a generic product page.

The product page should feel like a premium digital book/product presentation.

---

# 13. PRODUCT PREVIEW

Implement a proper preview experience.

It should support:

- Cover preview
- Selected sample pages
- Page navigation
- Zoom
- Fullscreen where appropriate
- Mobile support
- Watermarked previews where required

Do not expose the complete paid PDF through the preview system.

---

# 14. DIGITAL DELIVERY

Digital products must be delivered securely.

Support:

- Download center
- Download history
- Download limits
- Expired downloads
- Unauthorized downloads
- Missing files
- Updated products
- Version updates

Downloads should NOT expose raw unrestricted storage URLs.

Use controlled delivery / signed URLs / protected endpoints as appropriate.

---

# 15. PERSONAL LIBRARY

Every customer should have:

# MY LIBRARY

The library should contain purchased digital products.

Support:

- Recently added
- Recently read
- Continue reading
- Favorites
- Downloads
- Available updates
- Archived products

The customer library should use the same KRM visual language as the public library.

---

# 16. PDF READER

Build a premium reading experience.

Support:

- PDF rendering
- Page navigation
- Previous / next
- Page number
- Zoom
- Fullscreen
- Reading progress
- Continue reading
- Last-read page
- Mobile reading
- Keyboard navigation
- Touch gestures where appropriate

Do not make the reader look like a generic browser PDF viewer.

It should feel like a KRM reading environment.

---

# 17. AUTHENTICATION

Implement complete authentication.

Required:

- Login
- Registration
- Google authentication
- Email verification
- Forgot password
- Reset password
- Session management
- Session expiry
- Account lock handling
- Sign out
- Two-factor authentication architecture
- 2FA verification
- 2FA recovery

Use secure authentication patterns.

Never expose secrets to the client.

---

# 18. CUSTOMER ACCOUNT

Implement:

/account

with:

- Dashboard
- My Library
- Orders
- Downloads
- Wishlist
- Reviews
- Recommendations
- Settings
- Security

Account navigation should be consistent across desktop and mobile.

---

# 19. SHOPPING CART

Implement complete cart functionality.

Support:

- Add to cart
- Remove
- Quantity
- Price calculation
- Discounts
- Coupon codes
- Bundles
- Empty cart
- Cart persistence
- Guest cart
- Logged-in cart
- Cart merge after login

Because these are digital products, prevent nonsensical quantity behavior where appropriate.

---

# 20. CHECKOUT

Checkout should be extremely polished.

Support:

- Guest checkout
- Logged-in checkout
- Customer information
- Billing information
- Payment method
- Coupon
- Order summary
- Terms acceptance
- Payment processing
- Payment verification
- Success
- Pending
- Failed
- Cancelled

Keep checkout minimal and conversion-focused.

---

# 21. PAYMENT SYSTEM

Support BOTH:

# INDIA
Razorpay

AND

# GLOBAL
Stripe

Do not fake payment integrations.

Use actual backend payment flows.

Payment architecture must include:

- Payment creation
- Payment intent/order creation
- Checkout
- Verification
- Webhook handling
- Success
- Failure
- Cancellation
- Retry
- Pending verification
- Refund
- Dispute
- Reconciliation

Never trust client-side payment success.

The backend must verify payment status.

---

# 22. CURRENCY

Support:

- INR
- USD

Architecture should allow more currencies later.

Currency should be configurable.

Do not hardcode ₹ throughout the entire application.

---

# 23. ORDERS

Implement:

- My Orders
- Order detail
- Order history
- Invoice
- Invoice download
- Refund request
- Refund status
- Refund completion

Every order should have a unique identifier.

Example:

KRM-102934

---

# 24. WISHLIST / ENGAGEMENT

Support:

- Wishlist
- Saved products
- Recently viewed
- Recently purchased
- Recommendations
- Reviews
- Write review
- Edit review
- Review submitted

Persist this data server-side for authenticated users.

---

# 25. MARKETING

Support:

- Deals
- Discounts
- Bundles
- Bundle details
- Gift products
- Gift checkout
- Coupons
- Referral
- Referral dashboard
- Newsletter

Do not implement discounts as hardcoded frontend values.

All pricing/discount logic must be server-authoritative.

---

# 26. CONTENT / EDITORIAL

KRM.lib is not only a store.

Build the editorial layer.

Support:

- Journal
- Articles
- Topics
- Authors
- Reading Lists
- Knowledge Hub
- Free Resources
- Learning Paths
- Curated Collections

Example:

Build Your Digital Life

6 books → 1 collection

This should connect editorial content directly to products.

---

# 27. BRAND PAGES

Implement:

- About KRM.lib
- Our Philosophy
- How KRM.lib Works
- Why Digital Books
- Our Library
- Publishing / Quality Standards
- Contact
- FAQ

These pages should feel editorial rather than generic corporate pages.

---

# 28. LEGAL

Implement:

- Terms
- Privacy
- Cookie Policy
- Refund Policy
- Digital Product License
- Copyright Policy
- Acceptable Use
- Disclaimer
- Cookie Preferences

Do not write fake legal guarantees.

Create clean placeholder structures where legal content has not yet been supplied.

---

# 29. SUPPORT

Implement:

- Help Center
- Help Article
- Contact Support
- Support Tickets
- Ticket Detail
- Refund Help
- Payment Help
- Download Help
- Account Help

---

# 30. SYSTEM STATES

Every major workflow must have polished states.

Implement:

- 404
- 401
- 403
- 500
- Maintenance
- Offline
- Network Error
- Generic Error
- Empty Search
- Empty Library
- Empty Orders
- Empty Wishlist
- Empty Cart

Do not use generic browser-looking error pages.

They must belong to the KRM.lib design system.

---

# 31. ADMIN APPLICATION

/admin

is a separate application experience.

It should feel like a professional internal management platform while still belonging to the KRM brand.

Build:

- Admin Dashboard
- Products
- Orders
- Customers
- Payments
- Marketing
- Analytics
- Content
- Reviews
- Support
- Security
- Settings
- System

Use appropriate data tables, charts, filters, drawers, forms, modals, and detail pages.

---

# 32. ADMIN DASHBOARD

Display:

- Revenue
- Orders
- Customers
- Products
- Downloads
- Conversion
- Refunds

Include:

- Date filters
- Revenue charts
- Sales charts
- Recent orders
- Recent customers
- Product performance
- Payment status
- System health

Do not overload the dashboard.

Prioritize actionable information.

---

# 33. ADMIN PRODUCT MANAGEMENT

Admin must be able to:

- Create product
- Edit product
- Upload PDF
- Upload cover
- Upload preview
- Manage metadata
- Manage SEO
- Set pricing
- Set categories
- Add collections
- Manage reviews
- Manage FAQ
- Publish
- Unpublish
- Draft
- Archive
- Create versions

Publishing a product should automatically make it available to the relevant storefront systems.

---

# 34. PRODUCT VERSIONING

Support product versions.

Example:

v1.0
v1.1
v2.0

Track:

- Version
- Release date
- Changes
- File
- Status

Customers who purchased an older version should be able to see that an update is available when applicable.

---

# 35. ADMIN CUSTOMER MANAGEMENT

Admin should be able to inspect:

- Customer
- Orders
- Library
- Downloads
- Payments
- Refunds
- Activity
- Sessions
- Support history

Do not expose unnecessary sensitive information.

---

# 36. ADMIN PAYMENTS

Support:

- All payments
- Razorpay payments
- Stripe payments
- Failed payments
- Refunds
- Disputes
- Reconciliation
- Webhooks
- Transaction logs

Payment records should have traceable relationships to:

Customer → Order → Payment → Provider → Transaction → Product

---

# 37. ADMIN MARKETING

Support:

- Coupons
- Discount rules
- Bundles
- Campaigns
- Email campaigns
- Referral program
- Affiliate management
- Promotional banners

---

# 38. ADMIN ANALYTICS

Support:

- Sales analytics
- Revenue analytics
- Product analytics
- Customer analytics
- Conversion funnel
- Traffic analytics
- Download analytics
- Search analytics
- Coupon analytics
- Refund analytics
- Geographic analytics
- Device analytics

Analytics should be designed so new metrics can be added later.

---

# 39. ADMIN CONTENT

Support:

- Blog posts
- Articles
- Categories
- Authors
- Collections
- Learning paths
- Homepage content
- Navigation management
- Footer management
- Announcements

Do not hardcode the homepage content if it is intended to be managed through admin.

---

# 40. ADMIN REVIEWS

Support moderation states:

- Pending
- Approved
- Rejected
- Reported

Admin should be able to inspect review context and take moderation actions.

---

# 41. ADMIN SUPPORT

Support:

- Tickets
- Ticket detail
- Customer conversations
- Refund requests
- Reported problems

---

# 42. ADMIN SECURITY

Implement:

- Security dashboard
- Admin users
- Admin roles
- Permissions
- Login activity
- Security events
- Audit logs
- Blocked users
- Rate limit events
- Webhook security

Use role-based access control.

Do not assume every admin can access every part of the system.

---

# 43. ADMIN SETTINGS

Support:

- General settings
- Brand settings
- Store settings
- Currency
- Tax
- Payment
- Razorpay
- Stripe
- Email
- Storage
- Downloads
- SEO
- Analytics
- Notifications
- Security
- API
- Webhooks
- System

---

# 44. SYSTEM MONITORING

Support:

- System health
- Background jobs
- Webhook logs
- Email logs
- Error logs
- API logs
- Storage usage
- Database status
- System notifications

---

# 45. FUTURE CREATOR SYSTEM

Prepare architecture for future multi-creator functionality.

Do not necessarily expose it publicly yet.

Architecture should allow:

- Creator application
- Creator dashboard
- Creator products
- Product creation
- Orders
- Revenue
- Analytics
- Payouts
- Creator profile
- Creator settings
- Verification
- Documents
- Support

Do not prematurely complicate the current UX.

Build the architecture so this can be enabled later.

---

# 46. MOBILE EXPERIENCE

The mobile version must NOT simply be the desktop website compressed.

Create intentional mobile UX.

Important mobile surfaces:

- Mobile Home
- Mobile Explore
- Mobile Search
- Mobile Product
- Mobile Cart
- Mobile Checkout
- Mobile Library
- Mobile Reader
- Mobile Account
- Mobile Orders
- Mobile Downloads
- Mobile Navigation
- Bottom Sheets
- Filter Drawer
- Product Preview

Use:

- Touch-friendly controls
- Bottom navigation
- Bottom sheets
- Swipe gestures where appropriate
- Mobile-first spacing
- Sticky actions
- Safe-area support
- Responsive typography

---

# 47. RESPONSIVE BREAKPOINTS

Design for:

- Small mobile
- Mobile
- Tablet
- Laptop
- Desktop
- Large desktop

Do not simply scale everything proportionally.

Each breakpoint should have deliberate layout behavior.

---

# 48. ACCESSIBILITY

Build with accessibility in mind.

Support:

- Semantic HTML
- Keyboard navigation
- Focus states
- Screen-reader labels
- Sufficient contrast
- Reduced motion
- Accessible forms
- Accessible dialogs
- Accessible menus
- Accessible buttons
- Accessible navigation

Never make interaction dependent only on hover.

---

# 49. PERFORMANCE

The application must be production-grade.

Optimize:

- Images
- Fonts
- PDF loading
- Product images
- Library rendering
- Animations
- Client JavaScript
- API calls
- Database queries

Avoid unnecessary client components.

Use server rendering where appropriate.

Use lazy loading for heavy content.

Do not load the entire product catalog unnecessarily.

---

# 50. SEO

Every public product/category/content page should be SEO-friendly.

Implement:

- Metadata
- Open Graph
- Twitter/X metadata
- Canonical URLs
- Structured data where appropriate
- Sitemap
- Robots
- Semantic URLs
- Dynamic metadata

Products should have unique metadata.

Categories should have SEO-friendly landing pages.

---

# 51. URL ARCHITECTURE

Follow the supplied architecture.

Examples:

/
 /explore
 /books
 /guides
 /workbooks
 /collections
 /new
 /popular

/categories
/categories/productivity
/categories/technology
/categories/career

/books/[slug]
/guides/[slug]
/workbooks/[slug]
/collections/[slug]

/search

/cart
/checkout
/checkout/success
/checkout/failed

/login
/register
/forgot-password
/reset-password
/verify-email

/account
/account/library
/account/orders
/account/orders/[id]
/account/downloads
/account/wishlist
/account/reviews
/account/settings
/account/security

/read/[productId]

/about
/journal
/journal/[slug]
/contact
/faq
/help

/terms
/privacy
/refund-policy
/license

Admin:

/admin
/admin/products
/admin/products/new
/admin/products/[id]
/admin/orders
/admin/orders/[id]
/admin/customers
/admin/customers/[id]
/admin/payments
/admin/refunds
/admin/coupons
/admin/bundles
/admin/reviews
/admin/content
/admin/analytics
/admin/support
/admin/security
/admin/settings
/admin/system

---

# 52. DO NOT CREATE 330 COMPLETELY DIFFERENT PAGE IMPLEMENTATIONS

The architecture contains many states.

DO NOT duplicate code.

Instead build reusable templates.

For example:

Product Page
├── Normal
├── Discounted
├── Purchased
├── Unavailable
└── Updated

Payment
├── Processing
├── Success
├── Failed
├── Cancelled
└── Pending

This should be handled through reusable components/state.

---

# 53. DATA ARCHITECTURE

Design the backend around proper entities.

At minimum consider:

User
Account
Session
Product
ProductVersion
ProductCategory
Collection
Bundle
Author
Order
OrderItem
Payment
PaymentTransaction
Refund
Download
LibraryItem
ReadingProgress
WishlistItem
Review
Coupon
Discount
Referral
Article
ArticleCategory
LearningPath
SupportTicket
SupportMessage
Notification
AdminUser
AdminRole
Permission
AuditLog
WebhookEvent

Design relationships carefully.

Do not create a flat database.

---

# 54. DATABASE PRINCIPLES

Use:

- Proper indexes
- Unique constraints
- Foreign keys / relationships
- Transactional operations where needed
- Soft deletion where appropriate
- Timestamps
- Audit information
- Version tracking

Do not store derived values when they can become inconsistent unless there is a clear performance reason.

---

# 55. SECURITY

Security is critical because the platform handles:

- Accounts
- Payments
- Digital products
- Private downloads
- Personal data
- Admin access

Implement:

- Secure sessions
- Password hashing
- CSRF protection where applicable
- Rate limiting
- Input validation
- Authorization
- RBAC
- Secure cookies
- Signed download URLs
- Webhook signature verification
- Server-side payment verification
- File access protection
- Audit logs
- Security headers
- Environment secret protection

Never trust:

- Client-side prices
- Client-side roles
- Client-side payment success
- Client-side download permissions

---

# 56. DIGITAL FILE SECURITY

Paid PDFs must not be publicly accessible through predictable URLs.

Use protected file delivery.

A user should only be able to download a product if the backend determines that they have permission.

The frontend should never be the authority for ownership.

---

# 57. ADMIN PRODUCT UPLOAD FLOW

Create a professional product creation workflow.

Example:

STEP 1 — Basic Information
STEP 2 — Cover
STEP 3 — PDF
STEP 4 — Preview
STEP 5 — Metadata
STEP 6 — Pricing
STEP 7 — Categories
STEP 8 — SEO
STEP 9 — FAQ
STEP 10 — Preview
STEP 11 — Publish

Include validation.

Do not allow publishing an incomplete product.

---

# 58. STATE MANAGEMENT

Use state management deliberately.

Do not put everything into global state.

Separate:

- Server state
- Authentication state
- Cart state
- UI state
- Reader state
- Admin state

Keep state predictable.

---

# 59. API ARCHITECTURE

Create clean APIs/services for:

- Authentication
- Products
- Categories
- Collections
- Search
- Cart
- Checkout
- Payments
- Orders
- Downloads
- Library
- Reviews
- Wishlist
- Content
- Admin
- Analytics
- Support

Use proper validation and authorization.

---

# 60. SEARCH

Search should eventually support:

- Product title
- Subtitle
- Description
- Category
- Author
- Tags
- Content metadata

Implement:

- Search suggestions
- Recent searches
- Empty results
- Filters
- Sorting
- Search result ranking

The command-search UI should feel premium.

---

# 61. MICRO-INTERACTIONS

Use animation deliberately.

Examples:

- Product hover
- Book spine movement
- Library interactions
- Add to cart
- Wishlist
- Page transitions
- Modal transitions
- Drawer transitions
- Toasts
- Checkout progress
- Download progress
- Reading progress

Animations should be:

- Fast
- Smooth
- Purposeful
- Subtle

Avoid excessive animations.

---

# 62. LIQUID GLASS

Use liquid glass particularly for:

- Navigation
- Floating controls
- Search
- Filters
- Bottom sheets
- Account menus
- Library overlays
- Product preview overlays

Avoid applying glass to every card.

The interface needs visual hierarchy.

---

# 63. EMPTY STATES

Every empty state should be designed.

Do not simply display:

"No products found."

Instead provide:

- Context
- Helpful message
- Illustration where appropriate
- Suggested action
- Navigation back to relevant content

Examples:

Empty Library
Empty Cart
Empty Wishlist
Empty Search
Empty Orders

---

# 64. LOADING STATES

Every asynchronous experience needs proper loading UI.

Use:

- Skeletons
- Progressive loading
- Button loading states
- Page loading states
- Reader loading
- Payment loading
- Download loading

Never leave users staring at a blank page.

---

# 65. ERROR HANDLING

Errors must be user-friendly.

Do not expose raw:

- Stack traces
- Database errors
- API errors
- Provider errors

Map technical errors to meaningful user-facing messages.

Log the technical error internally.

---

# 66. ANALYTICS EVENTS

Prepare analytics for:

- Product viewed
- Product previewed
- Added to cart
- Removed from cart
- Checkout started
- Payment started
- Payment completed
- Payment failed
- Download started
- Download completed
- Book opened
- Reading progress
- Search
- Wishlist added
- Review submitted
- Coupon applied

Use an abstraction so the analytics provider can be changed later.

---

# 67. EMAIL SYSTEM

Prepare transactional emails for:

- Welcome
- Email verification
- Password reset
- Order confirmation
- Payment success
- Payment failed
- Payment pending
- Download available
- Product updated
- Refund initiated
- Refund completed
- Support ticket created
- Support response

Use reusable email templates.

---

# 68. NOTIFICATIONS

Support:

- In-app notifications
- Email notifications

Architecture should allow future push notifications.

---

# 69. ADMIN PERMISSIONS

Do not use one giant "admin" permission.

Create granular permissions.

Example:

products.read
products.create
products.update
products.delete
orders.read
orders.refund
customers.read
payments.read
analytics.read
content.manage
support.manage
security.manage
settings.manage

---

# 70. DESIGN CONSISTENCY RULE

If a new page is needed that is not represented in the provided reference images:

DO NOT invent a completely new visual language.

Instead:

1. Identify the closest existing KRM pattern.
2. Reuse its components.
3. Extend the design system.
4. Maintain typography, spacing, colors, radius, shadows, and interaction behavior.

Everything should look like one coherent product.

---

# 71. IMAGE / ASSET HANDLING

Use the provided UI/UX images as visual references.

Do not literally place screenshots inside the final UI as substitutes for implementation.

Recreate the actual interface.

For image assets:

- Optimize them
- Use appropriate formats
- Lazy load where appropriate
- Provide responsive sizes
- Maintain aspect ratios
- Avoid layout shifts

---

# 72. MOBILE NAVIGATION

Use an intentional mobile navigation system.

Primary destinations should include appropriate combinations of:

- Home
- Explore
- Library
- Orders
- Account

Secondary functionality should be accessible through menus/drawers.

Do not overcrowd bottom navigation.

---

# 73. ADMIN NAVIGATION

Admin should use a dedicated navigation system.

Example structure:

Dashboard

Catalog
- Products
- Categories
- Collections

Commerce
- Orders
- Payments
- Refunds

Customers
- Customers
- Library
- Activity

Marketing
- Coupons
- Bundles
- Campaigns

Content
- Articles
- Authors
- Learning Paths

Analytics

Support

Security

Settings

System

---

# 74. IMPLEMENTATION STRATEGY

DO NOT attempt to manually build every page one by one without architecture.

Build in this order:

## PHASE 1 — FOUNDATION

- Project structure
- Design system
- Theme
- Typography
- Layout
- Navigation
- Core components

## PHASE 2 — DATA

- Database schema
- Authentication
- Product model
- Categories
- Collections
- Users
- Orders

## PHASE 3 — STOREFRONT

- Home
- Explore
- Catalog
- Product
- Search
- Collections

## PHASE 4 — COMMERCE

- Cart
- Checkout
- Razorpay
- Stripe
- Orders
- Payments

## PHASE 5 — CUSTOMER

- Account
- Library
- Downloads
- Reader
- Wishlist
- Reviews

## PHASE 6 — ADMIN

- Dashboard
- Product management
- Orders
- Customers
- Payments
- Content
- Analytics
- Support
- Security
- Settings

## PHASE 7 — POLISH

- Mobile
- Animations
- Loading
- Error states
- Accessibility
- SEO
- Performance

---

# 75. DO NOT BREAK EXISTING FUNCTIONALITY

Before modifying the project:

1. Inspect the existing codebase.
2. Understand the architecture.
3. Identify existing functionality.
4. Identify existing database models.
5. Identify existing APIs.
6. Identify authentication.
7. Identify payment integrations.
8. Identify storage.
9. Identify environment variables.
10. Identify reusable components.

Do not rewrite functioning systems unnecessarily.

If something already works, integrate the new UI into it.

---

# 76. DO NOT USE FAKE FUNCTIONALITY

Do not create buttons that appear functional but do nothing.

Everything that appears functional should either:

1. Actually work, or
2. Be clearly marked as unavailable/not yet implemented.

Do not create fake payment success, fake download URLs, fake publish operations, or fake checkout behavior.

---

# 77. NO PLACEHOLDER DESIGN

Avoid:

- Lorem ipsum
- Random placeholder text
- Generic stock cards
- Generic dashboard widgets
- Fake testimonials
- Fake customer statistics
- Fake payment success
- Fake reviews presented as real

If seed data is required for development, clearly structure it as demo/seed data.

---

# 78. QUALITY BAR

The final product should look like something that could realistically launch as a premium digital publishing company.

The standard should be:

- Pixel-conscious
- Responsive
- Accessible
- Fast
- Secure
- Maintainable
- Scalable
- SEO-friendly
- Production-ready

---

# 79. FINAL ACCEPTANCE TEST

Before considering the project complete, verify:

### Storefront

- Home works
- Explore works
- Search works
- Categories work
- Product pages work
- Collections work

### Commerce

- Cart works
- Checkout works
- Razorpay works
- Stripe works
- Payment verification works
- Orders work
- Refund architecture works

### Customer

- Registration works
- Login works
- Google authentication works
- Email verification works
- Password reset works
- Library works
- Downloads work
- Reader works
- Wishlist works
- Reviews work

### Admin

- Admin login works
- RBAC works
- Products work
- Product publishing works
- Orders work
- Customers work
- Payments work
- Refunds work
- Analytics work
- Content works
- Support works
- Security works
- Settings work

### Mobile

Test:

- iPhone-sized viewport
- Android-sized viewport
- Tablet
- Desktop
- Large desktop

### System

Test:

- Loading
- Empty states
- Errors
- Unauthorized access
- Expired sessions
- Failed payments
- Failed downloads
- Offline state
- Network failure

---

# 80. IMPORTANT: DO NOT RUSH

Do not sacrifice architecture for speed.

Do not generate hundreds of repetitive files simply because the page architecture contains hundreds of states.

Build reusable systems.

The supplied architecture represents the full product surface, but many of those entries should be implemented as states, variations, drawers, modals, or reusable templates.

The goal is:

### FEWER, BETTER, REUSABLE SYSTEMS.

---

# 81. FINAL PRODUCT VISION

When the application is complete, a user should feel:

> "I am browsing a beautifully curated digital library."

Not:

> "I am shopping on a generic ecommerce template."

The experience should move naturally:

DISCOVER
↓
EXPLORE
↓
PREVIEW
↓
BUY
↓
OWN
↓
LIBRARY
↓
READ
↓
LEARN
↓
RETURN

KRM.lib should feel like a digital library that happens to have an exceptional ecommerce system underneath it.

---

# 82. YOUR FIRST TASK

Before writing large amounts of code:

### STEP 1
Inspect the existing project completely.

### STEP 2
Inspect all provided KRM.lib UI/UX reference images.

### STEP 3
Read the complete KRM.lib page architecture.

### STEP 4
Map the existing codebase against the required architecture.

Create a concise implementation plan identifying:

- Existing functionality
- Existing components
- Existing routes
- Existing database
- Existing APIs
- Existing authentication
- Existing payment integrations
- Existing storage
- Missing functionality
- UI areas requiring redesign
- Architecture risks
- Security risks
- Performance risks

### STEP 5
Do NOT immediately start rewriting everything.

First establish the correct architecture.

Then implement incrementally.

---

# 83. MOST IMPORTANT DESIGN RULE

The supplied KRM.lib screenshots are NOT optional inspiration.

They define the intended visual direction.

Use them to maintain:

- Layout
- Hierarchy
- Spacing
- Typography
- Colors
- Cards
- Navigation
- Library experience
- Product presentation
- Mobile behavior
- Glass effects
- Visual rhythm

Where a screenshot does not cover a specific state, extrapolate from the existing KRM.lib design system rather than introducing a new design language.

---

# FINAL COMMAND

Build KRM.lib as a complete, cohesive, production-grade digital publishing ecommerce platform.

Do not build a collection of disconnected screens.

Build ONE PRODUCT.

Every route, component, state, database entity, payment flow, library interaction, admin tool, mobile experience, and system state must feel like part of the same KRM.lib ecosystem.

Prioritize:

1. Architecture
2. Design consistency
3. Security
4. Real functionality
5. Reusability
6. Performance
7. Accessibility
8. Mobile UX
9. SEO
10. Polish

The final result should be launch-quality.

## IMPLEMENTATION PRINCIPLE

### 330 functional surfaces → reusable UI templates → one unified design system → one actual product.

Do not optimize for the number of screens created.

Optimize for the quality, consistency, maintainability, and completeness of the KRM.lib experience.
