========================================================
MATTHEW STUDIO — MARKETPLACE IMPROVEMENTS & BUILD PLAN
========================================================

PROJECT SCOPE: Convert from single-template resort booking site
to MULTI-CATEGORY marketplace (Templates, T-Shirts, AI Videos,
File Tools, Tutorials, Game Characters).

========================================================
1. HOMEPAGE STRUCTURE (Landing Page Redesign)
========================================================

HERO SECTION
────────────
Headline: "Everything You Need to Build, Design & Create"
Subheading: "Premium templates, designs, tutorials & tools for creators"
CTA Buttons: 
  - Primary: "Browse All Products" → /products
  - Secondary: "See What's New" → /products?sort=newest
Hero Visual: Carousel/mockup showing 3-4 different product types

Animation:
  - Headline: Fade in + slide up 30px on page load (0.6s, ease-out)
  - Subheading: Fade in + slide up 20px on page load, 0.2s delay (0.5s, ease-out)
  - CTA Buttons: Scale 0 → 1 on page load, 0.4s delay (0.4s, cubic-bezier)
  - Hero image: Parallax effect at 0.1x scroll speed (subtle background movement)

Design:
  - Background: Gradient dark (--color-bg to slightly lighter at bottom)
  - Headline: 52px / 64px on desktop, 36px on mobile (semibold, tracked -0.02em)
  - Subheading: 18px on desktop, 16px on mobile (regular, opacity 0.7)
  - Button padding: 16px 32px (min tap target 44px height)
  - Hero container: max-width 1280px, centered


QUICK WINS / TRUST METRICS STRIP
────────────────────────────────
Layout: 3-column grid (desktop), single column (mobile)
Content:
  - "10K+ Creators Trust Us"
  - "₱500M+ in Products Sold"
  - "99.9% Uptime Guarantee"

Each metric has an icon + large number + supporting text.

Animation:
  - Container: Fade in on scroll (IntersectionObserver trigger at 80% visible)
  - Icons: Rotate 0° → 360° + scale 0 → 1 on enter (0.6s, ease-out)
  - Numbers: Counter animation (0 → final number) while scrolling into view (1s)
  - Stagger: 0.1s delay between each metric

Design:
  - Icon size: 48px
  - Number font: 32px / 40px, semibold, accent color (--color-accent)
  - Supporting text: 14px, muted (opacity 0.6)
  - Spacing between items: --space-xl (24px gap)
  - Accent underline under each metric: 3px height, accent color


CATEGORY SHOWCASE GRID (6 CARDS)
───────────────────────────────
Layout: 3 columns (desktop), 2 columns (tablet), 1 column (mobile)
6 Cards (equal size, no priority):
  1. Templates (Showing 3 variants badge)
  2. T-Shirts (Color swatches preview)
  3. AI Videos (Play icon overlay)
  4. File Tools (Tool icon)
  5. Tutorials (Book/course icon)
  6. Game Characters (3D model icon)

Each Card:
  - Icon/image at top (64px)
  - Category name (20px, semibold)
  - Starting price "From ₱10k/mo" (16px, accent color)
  - Brief description (14px, muted, max 2 lines)
  - "Explore →" link (inline, hover animated)

Animation:
  - Cards: Fade in + slide up 40px on scroll enter (0.5s, ease-out)
  - Stagger: 0.08s delay between each card (so 6 cards cascade in)
  - Hover: 
    * Background color shift (--color-surface → --color-surface-hover)
    * Border color shift (--color-border → --color-accent)
    * Translate Y: -4px (subtle lift)
    * Transition: 0.2s ease
  - Icon on hover: Rotate 5° + scale 1.05 (0.3s)
  - "Explore →" arrow: Slide right +8px on hover (0.2s)

Design:
  - Card padding: 24px
  - Card border: 1px solid --color-border (subtle)
  - Card border-radius: 12px
  - Icon background: --color-surface-active (semi-transparent layer behind icon)
  - Icon border-radius: 8px
  - Gap between cards: --space-lg (16px)
  - Min card height: 240px (maintain vertical rhythm)


FEATURED PRODUCTS CAROUSEL
──────────────────────────
Title: "Bestsellers This Month"
Layout: Horizontal scroll carousel (desktop), vertical stack (mobile)
Shows: 4-6 top products from different categories

Each Product Card:
  - Thumbnail image (300px wide on desktop)
  - Product name (16px, semibold)
  - Category badge (small, muted background)
  - Star rating "4.8/5 ⭐" (14px)
  - Price (18px, accent color, semibold)
  - "View Details" CTA (button)

Animation:
  - Container: Fade in on scroll (trigger at 70% visible)
  - Cards: Auto-scroll left (infinite loop, 20s duration, pause on hover)
  - Hover effect:
    * Image zoom 1 → 1.08 (0.3s ease)
    * Card lift: -8px (0.2s ease)
    * Border color: accent (0.2s ease)
  - Navigation arrows (prev/next): Fade in on hover over carousel

Design:
  - Carousel max-width: 1200px
  - Card gap: 20px
  - Image aspect ratio: 4/3
  - Image border-radius: 8px top, card border-radius: 12px
  - Background: --color-surface (slightly lighter than page bg)
  - Padding: 32px (top/bottom), 40px (left/right)
  - Border-radius of carousel container: 16px


HOW IT WORKS (3-STEP UNIVERSAL)
───────────────────────────────
Title: "How It Works"
3 vertical steps:
  Step 1: "Browse Products"
    Icon: Magnifying glass
    Description: "Explore 100+ products across all categories"
  
  Step 2: "Choose What Fits"
    Icon: Checkmark
    Description: "Pick the right variant, design, or tier for you"
  
  Step 3: "Start Using It"
    Icon: Rocket
    Description: "Get instant access and start creating today"

CTA at bottom: "View All Products" → /products

Animation:
  - Container: Fade in on scroll (trigger at 75% visible)
  - Each step:
    * Icon: Scale 0 → 1 + rotate 0° → 360° (0.7s, ease-out)
    * Text: Fade in + slide left 30px (0.6s, ease-out)
    * Stagger: 0.15s between each step
  - Connecting line between steps: Animate width 0 → 100% (0.8s, ease-in-out)
  - Hover on step:
    * Background: --color-surface-hover (0.2s)
    * Icon color: accent (0.2s)
    * Scale: 1 → 1.05 (0.2s)

Design:
  - Step container: Column layout, centered
  - Icon size: 64px
  - Icon background: circular, --color-surface-active
  - Icon color: --color-accent
  - Step number: 32px, accent color, position absolute (top-left of circle)
  - Heading: 18px, semibold
  - Description: 14px, muted (opacity 0.65)
  - Connecting line: 2px height, accent color, 40px width (between steps)
  - Spacing between steps: --space-2xl (48px)
  - Max-width: 600px, centered


TESTIMONIALS CAROUSEL
─────────────────────
Title: "What Our Creators Say"
Layout: Horizontal scroll carousel (desktop), vertical (mobile)
Shows: 4-6 testimonials from mixed product categories

Each Testimonial Card:
  - Quote text (16px, italic)
  - Author name (14px, semibold)
  - Author role (12px, muted)
  - Author avatar (40px circular)
  - Product category badge (small)
  - Star rating (5 stars)

Animation:
  - Container: Fade in on scroll (trigger at 70% visible)
  - Cards: Auto-scroll right (infinite loop, 18s duration, pause on hover)
  - Hover effect:
    * Card lift: -8px (0.2s ease)
    * Border: accent color (0.2s ease)
    * Avatar scale: 1 → 1.1 (0.3s ease)
  - Navigation arrows: Fade in on carousel hover

Design:
  - Card padding: 28px
  - Card border: 1px solid --color-border
  - Card border-radius: 12px
  - Background: --color-surface
  - Quote color: --color-text-primary
  - Gap between cards: 20px
  - Avatar border-radius: 50% (circle)
  - Avatar border: 2px solid --color-accent
  - Max-width carousel: 1200px


FAQ SECTION (5-6 QUESTIONS)
──────────────────────────
Title: "Frequently Asked Questions"
Accordion style (expand/collapse)

Questions (examples):
  1. "What payment methods do you accept?"
  2. "Can I get a refund?"
  3. "How long does it take to access after purchase?"
  4. "Do you offer support?"
  5. "Can I use these for commercial purposes?"
  6. "How often do you add new products?"

CTA below FAQ: "See All FAQs" → /faq

Animation:
  - Container: Fade in on scroll (trigger at 75% visible)
  - Each accordion item:
    * Fade in + slide down 20px on scroll enter (0.4s, ease-out)
    * Stagger: 0.06s between each item
  - On accordion expand:
    * Chevron icon: Rotate 0° → 180° (0.3s ease)
    * Content: Slide down + fade in (0.4s ease)
    * Background: shift to --color-surface-hover (0.2s ease)
  - On accordion collapse:
    * Reverse all animations (0.3s)

Design:
  - Accordion padding: 20px
  - Question font: 16px, semibold
  - Answer font: 14px, muted (opacity 0.7)
  - Border: 1px solid --color-border (top + bottom)
  - Border-radius: 8px per item
  - Gap between items: 12px
  - Chevron icon: 20px, accent color
  - Max-width: 800px, centered


CTA BANNER (Bottom of Homepage)
───────────────────────────────
Text: "Ready to Get Started?"
Subtext: "Join 10K+ creators building amazing things"
CTA Buttons:
  - Primary: "Browse All Products" → /products
  - Secondary: "Book a Demo" → /contact

Animation:
  - Container: Fade in on scroll (trigger at 80% visible)
  - Text: Slide up 30px + fade in (0.6s, ease-out)
  - Buttons: Scale 0 → 1 (0.5s, cubic-bezier), 0.2s delay
  - Button hover:
    * Primary: Background darker, scale 1.05 (0.2s)
    * Secondary: Border + text color to accent (0.2s)

Design:
  - Background: Gradient (dark to slightly lighter, or overlay on image)
  - Padding: 60px (vertical), 40px (horizontal)
  - Text alignment: Center
  - Heading: 40px on desktop, 28px on mobile (semibold)
  - Subtext: 16px, muted (opacity 0.7)
  - Button gap: 16px
  - Border-radius: 16px


========================================================
2. DESIGN TOKENS & ANIMATION SYSTEM (Reference)
========================================================

COLORS (CSS Variables in globals.css)
─────────────────────────────────────
--color-bg:              #09090b          (page background)
--color-surface:         rgba(255,255,255,0.03)  (cards/panels)
--color-surface-hover:   rgba(255,255,255,0.06)  (hover state)
--color-surface-active:  rgba(255,255,255,0.10)  (active state)
--color-border:          rgba(255,255,255,0.08)  (subtle borders)
--color-border-hover:    rgba(255,255,255,0.16)  (hover border)
--color-text-primary:    #f4f4f5          (main text)
--color-text-secondary:  rgba(255,255,255,0.55) (supporting text)
--color-text-muted:      rgba(255,255,255,0.35) (labels/eyebrows)
--color-accent:          #22c55e          (CTAs, highlights, primary action)
--color-accent-hover:    #16a34a          (accent on hover)


SPACING (CSS Variables)
───────────────────────
--space-xs:   0.25rem  (4px)
--space-sm:   0.5rem   (8px)
--space-md:   1rem     (16px)
--space-lg:   1.5rem   (24px)
--space-xl:   2rem     (32px)
--space-2xl:  3rem     (48px)


Z-INDEX SCALE
──────────────
--z-base:            0
--z-raised:         10    (sticky elements within sections)
--z-dropdown:      100    (dropdowns, select menus)
--z-sticky:        200    (sticky nav, sticky headers)
--z-drawer:        300    (side panels)
--z-modal-backdrop:400    (modal overlay)
--z-modal:         500    (modal dialog)
--z-toast:         600    (toast notifications)
--z-tooltip:       700    (tooltips)


TRANSITIONS (CSS Variables)
────────────────────────────
--transition-fast:  0.15s ease         (micro-interactions: color, opacity)
--transition-base:  0.25s ease         (standard changes: background, shadow)
--transition-slow:  0.4s cubic-bezier(0.22, 1, 0.36, 1)  (transforms, modals)


FRAMER MOTION ANIMATION PATTERNS
─────────────────────────────────

Pattern 1: Fade In + Slide Up (Page load or scroll enter)
──────────────────────────────────────────────────────
<motion.div
  initial={{ opacity: 0, y: 30 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.6, ease: "easeOut" }}
>
  Content
</motion.div>

Pattern 2: Staggered Children (Carousel cards, grid items)
──────────────────────────────────────────────────────────
<motion.div
  initial="hidden"
  animate="visible"
  variants={{
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.1,
      },
    },
  }}
>
  {items.map((item, i) => (
    <motion.div
      key={i}
      variants={{
        hidden: { opacity: 0, y: 40 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
      }}
    >
      {item}
    </motion.div>
  ))}
</motion.div>

Pattern 3: Hover Scale + Border Color Shift
────────────────────────────────────────────
<motion.div
  whileHover={{
    scale: 1.05,
    y: -4,
    borderColor: "var(--color-accent)",
    backgroundColor: "var(--color-surface-hover)",
  }}
  transition={{ duration: 0.2 }}
  style={{ border: "1px solid var(--color-border)" }}
>
  Card Content
</motion.div>

Pattern 4: Scroll-Triggered Animation (IntersectionObserver)
──────────────────────────────────────────────────────────
Use framer-motion's useInView hook:

const ref = useRef(null);
const isInView = useInView(ref, { once: true, margin: "0px 0px -100px 0px" });

<motion.div
  ref={ref}
  initial={{ opacity: 0, y: 40 }}
  animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
  transition={{ duration: 0.6 }}
>
  Content
</motion.div>

Pattern 5: Auto-Scrolling Carousel (Infinite Loop)
──────────────────────────────────────────────────
<motion.div
  animate={{ x: [-1200, 0] }}
  transition={{
    x: {
      repeat: Infinity,
      duration: 20,
      ease: "linear",
    },
  }}
  onHoverStart={() => setAutoPlay(false)}
  onHoverEnd={() => setAutoPlay(true)}
>
  {/* Carousel items duplicated to create seamless loop */}
</motion.div>

Pattern 6: Accordion Expand/Collapse
──────────────────────────────────────
<motion.div
  initial={false}
  animate={{ height: isOpen ? "auto" : 0 }}
  transition={{ duration: 0.3 }}
  style={{ overflow: "hidden" }}
>
  {/* Accordion content */}
</motion.div>

<motion.div
  animate={{ rotate: isOpen ? 180 : 0 }}
  transition={{ duration: 0.3 }}
>
  <ChevronIcon />
</motion.div>

Pattern 7: Counter Animation (Numbers)
──────────────────────────────────────
import { useMotionValue, useTransform, animate } from "framer-motion";

const count = useMotionValue(0);
const rounded = useTransform(count, latest => Math.round(latest));

useEffect(() => {
  const animation = animate(count, targetNumber, { duration: 1 });
  return animation.stop;
}, []);

<motion.span>{rounded}</motion.span>


TYPOGRAPHY SCALE
─────────────────
Eyebrow:       12px, semibold, uppercase, --color-text-muted, letter-spacing: 0.2em
Hero Title:    52px / 64px desktop, 36px mobile (semibold, tight tracking)
Section Title: 32px / 40px desktop, 24px mobile (semibold)
Heading 2:     24px (semibold)
Heading 3:     18px (semibold)
Body:          16px (regular, line-height 1.65)
Small:         14px (regular)
Tiny:          12px (regular)

Font Family:
  Display/Headings: Geist Sans (500-600 weight)
  Body: Geist Sans (400 weight)


BORDER RADIUS SCALE
────────────────────
Button/Input:  8px
Card:          12px
Large sections: 16px


SHADOW SCALE
─────────────
Subtle:    0 1px 2px rgba(0,0,0,0.1)
Small:     0 2px 8px rgba(0,0,0,0.15)
Medium:    0 4px 16px rgba(0,0,0,0.2)
Large:     0 8px 32px rgba(0,0,0,0.25)

(Only use on floating elements: modals, dropdowns, tooltips — not cards on the page)


========================================================
3. SITE MAP (Complete Visitor + Admin Structure)
========================================================

VISITOR SIDE (Public - no auth required)
────────────────────────────────────────
/ ........................ HOME (Landing page with all sections above)
/products ................. ALL PRODUCTS (Master grid, filterable)
/templates ................ TEMPLATES CATEGORY
/templates/[slug] ......... TEMPLATE DETAIL (with variant selector)
/tshirts .................. T-SHIRTS CATEGORY
/tshirts/[slug] ........... T-SHIRT DETAIL
/ai-videos ................ AI VIDEOS CATEGORY
/ai-videos/[slug] ......... AI VIDEO DETAIL
/file-tools ............... FILE TOOLS CATEGORY
/file-tools/[slug] ........ FILE TOOL DETAIL
/tutorials ................ TUTORIALS CATEGORY
/tutorials/[slug] ......... TUTORIAL DETAIL
/game-characters .......... GAME CHARACTERS CATEGORY
/game-characters/[slug] ... CHARACTER DETAIL
/pricing .................. PRICING PAGE (Templates tiers)
/compare .................. COMPARISON TOOL
/case-studies ............. CASE STUDIES
/how-it-works ............. HOW IT WORKS
/blog ..................... BLOG INDEX
/blog/[slug] .............. BLOG DETAIL
/testimonials ............. TESTIMONIALS
/faq ...................... COMPREHENSIVE FAQ
/about .................... ABOUT YOU
/contact .................. CONTACT / SUPPORT
/security ................. SECURITY & TRUST
/privacy .................. PRIVACY POLICY
/terms .................... TERMS OF SERVICE
/refund-policy ............ REFUND POLICY

ADMIN SIDE (Protected - superAdmin auth required)
───────────────────────────────────────────────────
/superAdmin/dashboard ............ Main dashboard
/superAdmin/products ............. Manage all products (CRUD)
/superAdmin/templates ............ Manage templates
/superAdmin/tshirts ............. Manage T-shirts
/superAdmin/ai-videos ............ Manage AI videos
/superAdmin/file-tools ........... Manage file tools
/superAdmin/tutorials ............ Manage tutorials
/superAdmin/game-characters ...... Manage game characters
/superAdmin/case-studies ......... Manage case studies
/superAdmin/testimonials ......... Manage testimonials
/superAdmin/orders ............... View orders (if applicable)


========================================================
4. BUILD PRIORITY & EXECUTION PLAN
========================================================

PHASE 1 — FOUNDATION (Week 1) ⭐ START HERE
────────────────────────────────────────────

Task 1.1: Enhance Homepage "/"
Files to create/modify:
  - app/(public)/page.tsx (add new sections: Featured Products + FAQ)
  - app/styles/home.css (add styles for new sections)
  - lib/homeData.ts (create: featured products, FAQ data)
  - components/home/FeaturedProducts.tsx (new carousel component)
  - components/home/FAQAccordion.tsx (new accordion component)

Sections to add to homepage:
  ✓ Featured Products Carousel (auto-scroll + hover pause)
  ✓ FAQ Accordion (5-6 questions, expand/collapse)
  ✓ Existing: Hero, Quick Wins, Category Grid, How It Works, 
    Testimonials, CTA Banner

Animations: All patterns 1-7 from design tokens section

Task 1.2: Create "/products" Master Grid
Files to create:
  - app/(public)/products/page.tsx
  - app/styles/products.css
  - components/products/ProductGrid.tsx
  - lib/productsData.ts (all products from all categories)

Features:
  ✓ Grid layout (responsive: 4 cols → 2 → 1)
  ✓ Filters: Category, Price range, Rating, Newest
  ✓ Sort: Trending, Newest, Top Rated, Price (asc/desc)
  ✓ Product cards: Image + name + price + rating + "View" CTA
  ✓ Search bar (scoped to all products)
  ✓ Empty state + loading skeleton

Animations: Pattern 2 (staggered children for grid items)

Task 1.3: Create Category Pages (6 pages)
Files to create per category:
  - app/(public)/[category]/page.tsx
  - components/[category]/[Category]Grid.tsx
  - lib/[category]Data.ts (products for that category)

Categories to create:
  ✓ /templates
  ✓ /tshirts
  ✓ /ai-videos
  ✓ /file-tools
  ✓ /tutorials
  ✓ /game-characters

Each category page has:
  ✓ Hero (category name + icon + starting price)
  ✓ Search + filter bar (category-specific filters)
  ✓ Product grid (same as /products but filtered)
  ✓ Sort options
  ✓ Empty/loading states

Animations: Pattern 2 (staggered grid), Pattern 1 (hero fade-in)


PHASE 2 — INDIVIDUAL PRODUCT PAGES (Week 2)
──────────────────────────────────────────────

Task 2.1: "/templates/[slug]" Detail Page
Files to create:
  - app/(public)/templates/[slug]/page.tsx
  - components/templates/TemplateDetail.tsx
  - components/templates/VariantSelector.tsx
  - components/templates/DesignGallery.tsx

Features:
  ✓ Variant selector (Static/Dynamic/Modern - radio buttons)
  ✓ Design gallery (3 designs per variant, thumbnails + full preview)
  ✓ Live demo link
  ✓ Features spec table (per variant)
  ✓ Pricing per tier (Managed SaaS/Self-Hosted/Custom)
  ✓ Reviews & ratings section
  ✓ Related products carousel
  ✓ "Get Started" CTA

Price updates dynamically based on selected variant.

Task 2.2: "/tshirts/[slug]" Detail Page
Files to create:
  - app/(public)/tshirts/[slug]/page.tsx
  - components/tshirts/TshirtDetail.tsx
  - components/tshirts/ColorSizeSelector.tsx

Features:
  ✓ Design mockup on actual shirt image
  ✓ Color selector (with swatch preview)
  ✓ Size selector (with size guide modal)
  ✓ Material specs (fabric, print method, care)
  ✓ Reviews & ratings
  ✓ "Add to Cart" / "Buy Now" CTA

Task 2.3: "/ai-videos/[slug]" Detail Page
Files to create:
  - app/(public)/ai-videos/[slug]/page.tsx
  - components/ai-videos/AIVideoDetail.tsx
  - components/ai-videos/VideoPlayer.tsx

Features:
  ✓ Sample output video player
  ✓ Template preview gallery
  ✓ Features list
  ✓ Processing specs (speed, quality, output formats)
  ✓ Reviews & ratings
  ✓ "Get Access" CTA

Task 2.4: "/file-tools/[slug]" Detail Page
Features:
  ✓ Before/after example screenshots
  ✓ Step-by-step walkthrough
  ✓ Supported file formats
  ✓ Speed/size limits
  ✓ Reviews & ratings
  ✓ "Try Free" / "Get Full Access" CTAs

Task 2.5: "/tutorials/[slug]" Detail Page
Features:
  ✓ Course curriculum (modules/lessons list)
  ✓ First lesson video teaser
  ✓ Difficulty level badge
  ✓ Prerequisites list
  ✓ Certificate info
  ✓ Duration
  ✓ Reviews & ratings
  ✓ "Enroll Now" CTA

Task 2.6: "/game-characters/[slug]" Detail Page
Features:
  ✓ 3D/2D model viewer (interactive if 3D)
  ✓ Different poses/animations
  ✓ Scale/size reference
  ✓ File formats included (FBX, PNG, etc.)
  ✓ License info (commercial use?)
  ✓ Reviews & ratings
  ✓ "Purchase" CTA


PHASE 3 — TRUST & SUPPORT PAGES (Week 3)
──────────────────────────────────────────

Task 3.1: "/pricing" — Dedicated Pricing Page
Features:
  ✓ Full tier comparison (Managed SaaS / Self-Hosted / Custom)
  ✓ Feature matrix (per tier)
  ✓ FAQ specific to templates
  ✓ Comparison with competitors (Agency vs Freelancer vs You)
  ✓ Guarantee badges ("30-day refund", etc.)
  ✓ Tier selector quiz ("Which tier is right for me?")

Task 3.2: "/compare" — Comparison Tool
Features:
  ✓ Variant comparison (Static vs Dynamic vs Modern)
  ✓ Feature matrix per variant
  ✓ Price difference highlight
  ✓ "Which is best for me?" decision helper

Task 3.3: "/faq" — Comprehensive FAQ
Topics to cover:
  ✓ General marketplace questions
  ✓ Per-category questions
  ✓ Payment & refunds
  ✓ Support & customization
  ✓ Variant/design questions (for templates)

Task 3.4: "/about" — About Page
Features:
  ✓ Who is Ceron Matthew (bio + photo)
  ✓ Mission/story (why products were built)
  ✓ You vs Agency vs Freelancer comparison table
  ✓ Products timeline

Task 3.5: "/case-studies" — Case Studies
Rebrand existing /portfolio with product tags:
  ✓ Grid of success stories
  ✓ Filter by product category
  ✓ Link to template/product used
  ✓ Results metrics
  ✓ Live link to deployed project


PHASE 4 — TRUST & LEGAL PAGES (Week 4)
───────────────────────────────────────

Task 4.1-4.4: Create legal pages
  - /security (encryption, monitoring, compliance)
  - /privacy (data usage, GDPR compliance)
  - /terms (terms of service)
  - /refund-policy (per-product refund terms)

Simple static pages, minimal animation.


========================================================
5. DATA STRUCTURE (lib/productsData.ts)
========================================================

Each product object should have:
{
  id: "unique-id",
  category: "templates" | "tshirts" | "ai-videos" | "file-tools" | "tutorials" | "game-characters",
  name: "Product Name",
  description: "Short description",
  price: {
    startingPrice: 10000,  // For templates: per tier
    managed: { monthly: 10000, annual: 120000 },
    selfHosted: 250000,
    custom: 50000,
  },
  rating: { average: 4.8, count: 124 },
  image: "/path/to/image.jpg",
  badge: "bestseller" | "new" | "limited" | null,
  
  // For templates:
  variants: [
    { 
      name: "Static", 
      description: "...", 
      designs: ["Design A", "Design B", "Design C"],
      pricing: { managed: 10000, selfHosted: 250000 }
    },
    { name: "Dynamic", ... },
    { name: "Modern", ... }
  ],
  
  // For others: category-specific fields
}


========================================================
6. ANIMATION CHECKLIST (Use This During Build)
========================================================

HERO SECTION:
  ☐ Headline: Fade in + slide up (0.6s, ease-out)
  ☐ Subheading: Fade in + slide up (0.5s, ease-out, 0.2s delay)
  ☐ CTAs: Scale 0→1 (0.4s, 0.4s delay)
  ☐ Hero image: Parallax at 0.1x scroll speed

QUICK WINS:
  ☐ Container: Fade in on scroll enter
  ☐ Icons: Rotate 360° + scale 0→1 (0.6s)
  ☐ Numbers: Counter animation (1s)
  ☐ Stagger: 0.1s between each metric

CATEGORY GRID:
  ☐ Cards: Fade in + slide up on scroll enter (0.5s)
  ☐ Stagger: 0.08s between cards
  ☐ Hover: Scale 1→1.05, y -4px, border color shift (0.2s)
  ☐ Icon hover: Rotate 5°, scale 1.05 (0.3s)
  ☐ Arrow hover: Slide right +8px (0.2s)

FEATURED PRODUCTS CAROUSEL:
  ☐ Container: Fade in on scroll enter
  ☐ Auto-scroll: Linear 20s loop (pause on hover)
  ☐ Hover: Image zoom 1→1.08, card lift -8px (0.3s/0.2s)
  ☐ Border: Color shift to accent (0.2s)

HOW IT WORKS:
  ☐ Container: Fade in on scroll enter
  ☐ Icons: Scale 0→1 + rotate 360° (0.7s, ease-out)
  ☐ Text: Fade in + slide left 30px (0.6s, ease-out)
  ☐ Stagger: 0.15s between steps
  ☐ Connecting line: Width 0→100% (0.8s)
  ☐ Step hover: Background shift + icon color, scale 1→1.05

TESTIMONIALS CAROUSEL:
  ☐ Container: Fade in on scroll enter
  ☐ Auto-scroll: Linear 18s loop (pause on hover)
  ☐ Hover: Card lift -8px, border color, avatar scale (0.2s/0.3s)

FAQ ACCORDION:
  ☐ Items: Fade in + slide down on scroll enter (0.4s, staggered 0.06s)
  ☐ Expand: Chevron rotate 180° (0.3s)
  ☐ Content slide: Slide down + fade in (0.4s)
  ☐ Background: Shift to hover color (0.2s)

CTA BANNER:
  ☐ Container: Fade in on scroll enter
  ☐ Text: Slide up + fade in (0.6s)
  ☐ Buttons: Scale 0→1 (0.5s, 0.2s delay)
  ☐ Button hover: Scale/color shifts (0.2s)

PRODUCT GRID (all pages):
  ☐ Items: Fade in + slide up (0.5s, staggered 0.08s)
  ☐ Card hover: Scale 1→1.05, lift -4px, border color (0.2s)

CAROUSEL AUTO-SCROLL:
  ☐ Pause on hover (set autoPlay state)
  ☐ Resume on hover end
  ☐ Prev/next arrows: Fade in on carousel hover


========================================================
7. RESPONSIVE BREAKPOINTS (mediaQueries.css)
========================================================

Mobile-first approach (base CSS is mobile, breakpoints add up):

@media (min-width: 480px) {
  /* Small phones in landscape */
}

@media (min-width: 768px) {
  /* Tablets */
  - Hero title: increase font size
  - Grid columns: 2 → 3
  - Carousel: adjustments
  - Spacing: increase gaps
}

@media (min-width: 1024px) {
  /* Small laptops */
  - Full desktop layout
  - All 3-column grids active
  - Hero title: full size (52-64px)
}

@media (min-width: 1280px) {
  /* Wide screens */
  - Max-width: 1280px constraints
  - Extra spacing refinements
}


========================================================
8. PERFORMANCE TARGETS
========================================================

Lighthouse Scores (target):
  - Performance: 90+
  - Accessibility: 95+
  - Best Practices: 90+
  - SEO: 95+

Core Web Vitals:
  - LCP (Largest Contentful Paint): < 2.5s
  - FID (First Input Delay): < 100ms
  - CLS (Cumulative Layout Shift): < 0.1

Image Optimization:
  - All images: WebP format
  - Carousel images: lazy loading
  - Thumbnail images: ~300-400px wide (let CSS scale)
  - Use Next.js <Image> component with priority/lazy

Bundle Size:
  - Framer Motion: ~40KB (gzipped)
  - Target JS bundle: < 200KB (gzipped, after splitting)


========================================================
9. IMPLEMENTATION NOTES
========================================================

1. START WITH HOMEPAGE ("/")
   - Build all 10 sections with animations
   - Get animation patterns working smoothly
   - This unblocks everything else

2. REUSABLE COMPONENTS
   Create these once, use everywhere:
   - ProductCard (template for all product cards)
   - CategoryCard (for /products grid)
   - TestimonialCard (for testimonials section)
   - FAQAccordion (for FAQ sections)
   - Carousel (generic auto-scroll wrapper)
   - SkeletonLoader (for loading states)

3. DATA STRUCTURE
   Keep all product data in lib/productsData.ts
   Import and use throughout the site
   Makes it easy to swap static data for a DB later

4. ANIMATION PATTERNS
   Copy/paste the patterns from section 2 above
   Just update the delay/duration/easing as needed
   Don't create new animation styles — keep consistent

5. MOBILE OPTIMIZATION
   Test every page on mobile (375px viewport)
   Ensure carousel works with touch swipe
   Buttons are always 44px+ tap target
   No horizontal scroll (except carousels)

6. ACCESSIBILITY
   - All images: descriptive alt text
   - Form labels: associated with inputs
   - Color contrast: >= 4.5:1 for text
   - Focus states: always visible (use :focus-visible)
   - Accordion: proper aria-expanded states
   - Carousel: pause/play accessible


========================================================
END OF MARKETPLACE IMPROVEMENTS DOCUMENTATION
========================================================

QUICK START:
1. Read this file entirely (you just did ✓)
2. Update homepage "/" with all 10 sections + animations
3. Build /products master grid
4. Build 6 category pages in parallel
5. Then build individual product detail pages (week 2)
6. Then trust/support pages (week 3+)

Good luck building! Keep this file open while coding. 🚀
