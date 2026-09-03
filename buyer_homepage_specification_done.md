# Buyer Homepage — Feature Specification Document

## 1. PURPOSE & OVERVIEW

The **Buyer Homepage** is the primary landing page for the Matthew Studio marketplace, accessible at `/` (root path). It serves as the entry point for all visitors, showcasing the platform's capabilities, available products/services across multiple categories, social proof through testimonials, and clear calls-to-action guiding visitors toward exploration and purchase.

**Target Audience:**

- New visitors discovering the Matthew Studio marketplace
- Returning buyers browsing for products
- Potential customers evaluating the platform's offerings

**Primary Goals:**

1. Educate visitors about the marketplace value proposition and available categories
2. Showcase featured products and trending items
3. Build trust through testimonials and social proof
4. Drive traffic to product discovery (`/products`, category pages, `/shop`)
5. Encourage account creation and first purchase via prominent CTAs

---

## 2. ACCOUNT TYPE & AUTHENTICATION REQUIREMENTS

- **Target Account Type:** Buyer (unauthenticated OR authenticated)
- **Role in Supabase:** `user_metadata.role = "buyer"` (for authenticated buyers)
- **Authentication State:**
  - Unauthenticated visitors can view the homepage in full
  - Authenticated buyers see personalized CTAs (e.g., "Go to Dashboard" instead of "Sign In")
  - No authentication wall — the page is fully public

---

## 3. PAGE STRUCTURE & SECTIONS

The homepage is composed of **14 sections**, rendered in order from top to bottom:

### 3.1 — Hero Section

**Purpose:** Immediate value proposition and primary CTAs

**Content:**

- Headline: "Production-Ready Resort Booking Templates" (or primary value prop)
- Subheading: 1–2 line supporting copy (e.g., "Multi-room booking, promotional management, admin dashboard — live in 48 hours")
- Background: Hero image or video (background-attachment: fixed on desktop, static on mobile)
- Primary CTA: "Browse Products" → `/products`
- Secondary CTA: "Book a Demo" → `/contact`

**Design:**

- Full viewport height on desktop (100dvh), adjusted on mobile
- Centered text overlay, white/light text on darkened background image
- Hero image fades in from bottom (opacity + translateY) on page load (framer-motion)
- Button scale-in delay (0.3s) after text appears

**Responsive:**

- Desktop: 60% image on right, 40% text left
- Tablet: 50/50 split
- Mobile: Full-width stack, image behind text, reduced height (60dvh)

---

### 3.2 — Quick Wins Section (Social Proof)

**Purpose:** Build immediate credibility with visual proof of success

**Content:**

- 4–6 client/partner wordmarks (logos, grayscale, hover tint to accent color)
- 3 key stats with counters (e.g., "500+ Resorts Using", "2M+ Bookings Processed", "98% Uptime")
- Stats animate from 0 to final value (count-up) when section enters viewport

**Design:**

- 2-row grid on desktop, single column on mobile
- Logos have subtle opacity step between them
- Stats use mono font, large numbers (48px desktop) + smaller label below
- Entire section fades and slides up on scroll into viewport

**Data Source:** `lib/quickWinsData.ts` (placeholder, subject to update with real metrics)

---

### 3.3 — Category Showcase (6-Card Grid)

**Purpose:** Introduce marketplace categories and guide discovery

**Content:**

- 6 marketplace categories presented as clickable cards:
  1. **Templates** — pre-built resort booking site templates (3 pricing tiers)
  2. **T-Shirts** — branded merchandise
  3. **AI Videos** — AI-generated video content
  4. **File Tools** — utility/productivity software
  5. **Tutorials** — learning content (beginner/intermediate/advanced)
  6. **Game Characters** — 3D character assets

**Card Structure per Category:**

- Category icon (from `lib/categoryIcons.tsx`, tinted with accent color)
- Category name (heading)
- 1-line description (e.g., "Managed, self-hosted, or custom implementations")
- Small preview/stats (e.g., "12 templates", "3 pricing tiers")
- Click behavior: Navigate to `/shop?category=[categoryName]` OR `/category/[name]` (TBD based on routing)

**Design:**

- 3-col desktop grid, 2-col tablet, 1-col mobile
- Cards have subtle border, layered background (surface-hover), rounded corners
- Hover state: border/background shift to accent color, scale up 1.02x, shadow increases
- Cards fade in with staggered timing (0.1s per card) as section enters viewport

**Data Source:** `lib/categoryShowcaseData.ts`

---

### 3.4 — Featured Products (Auto-Scroll Carousel)

**Purpose:** Highlight bestselling/trending products and drive immediate interest

**Content:**

- Carousel of 5–8 "Bestsellers This Month" products
- Each product card shows: image/placeholder, name, price (starting price), category tag, "Quick View" CTA
- Auto-scrolls right-to-left, pauses on hover
- Navigation arrows (left/right), desktop only
- Manual scroll/swipe on mobile

**Card Design:**

- Product image (aspect-ratio: 4/3, object-fit: cover)
- Gradient overlay (bottom, black-to-transparent)
- Product name + category tag overlay bottom-left
- Price display overlay bottom-right
- Hover state: image darkens, "Quick View" button fades in (centered)

**Carousel Behavior:**

- Auto-scroll every 4 seconds
- 18-second full loop (6 products × 3s each)
- Pause on hover (user interaction priority)
- Smooth scroll via framer-motion
- Fade-out at carousel edges (gradual visibility)

**Data Source:** `lib/featuredProductsData.ts`

---

### 3.5 — Templates Section

**Purpose:** Deep dive into the primary product category (resort booking templates)

**Content:**

- Comparison table: Managed vs Self-Hosted vs Custom (reuses `PRICING_TIERS` from `lib/pricingData.ts`)
- 6-item feature/benefits grid (e.g., "Multi-room booking", "Admin dashboard", "Payment integration")
- "Why Choose Our Templates" trust builder (3-column, icon + heading + copy)
- Demo video carousel (1–3 video samples, manually controlled arrows/dots)
- Product cards for the "templates" category (3 cards minimum)
- CTA: "View All Templates" → `/shop?category=templates`

**Design:**

- Section fades/slides in at 80% viewport visibility
- Comparison table horizontally scrolls on mobile
- Feature grid uses 2x3 on desktop, staggered fade-in per item
- Videos pause/play on intersection (60%+ visibility)
- Product cards scale in with bounce easing on entrance

**Data Source:** `lib/templatesSectionData.ts`, `lib/pricingData.ts`, `lib/productsData.ts`

---

### 3.6 — T-Shirts Section

**Purpose:** Showcase branded merchandise with lifestyle appeal

**Content:**

- Design gallery carousel (3 slides, manually controlled, 60% width from tablet up)
- "The Story" quote callout (italic quote + attribution, accent left border)
- Product cards for the "tshirts" category
- CTA: "Shop T-Shirts" → `/shop?category=tshirts`

**Design:**

- Gallery slides have tinted gradient placeholders (no real product photos yet)
- Overlay: design name + tagline bottom-right per slide
- Story quote has subtle parallax (image slightly moves on scroll)
- Cards fade in with slight stagger

**Data Source:** `lib/tshirtsSectionData.ts`, `lib/productsData.ts`

---

### 3.7 — AI Videos Section

**Purpose:** Introduce AI-generated video content as a marketplace offering

**Content:**

- Video carousel (3 sample videos, reuses Phase 1 VideoCarousel component)
- "Need Custom Videos?" callout (2-col on tablet+: text left, CTA right, accent border)
- Product cards for the "ai-videos" category
- CTA: "Explore AI Videos" → `/shop?category=ai-videos`

**Design:**

- Videos auto-play at 60%+ viewport visibility, pause on <60%
- Custom callout has bounce scale-in entrance
- Cards scale with stagger timing

**Data Source:** `lib/aiVideosSectionData.ts`, `lib/productsData.ts`

---

### 3.8 — File Tools Section

**Purpose:** Lightweight intro to utility/productivity tools

**Content:**

- 3-item feature grid (no separate reusable component — uses existing FeatureGrid)
- Product cards for the "file-tools" category
- CTA: "View File Tools" → `/shop?category=file-tools`

**Design:**

- Minimal section, relies on existing component patterns
- Simple fade-in, no complex animations

**Data Source:** `lib/fileToolsSectionData.ts`, `lib/productsData.ts`

---

### 3.9 — Tutorials Section

**Purpose:** Establish the marketplace as an educational resource

**Content:**

- "Who's This For?" persona callout (3 personas: Developers, Designers, Founders; icon + role + bullets, fade-in stagger 0.15s per persona)
- Product cards for the "tutorials" category with level badges (Beginner/Intermediate/Advanced, color-coded: green/amber/red)
- Duration overlay per card
- CTA: "View All Tutorials" → `/shop?category=tutorials`

**Design:**

- Persona callout has no hover state (per spec)
- Role-based background uses opacity steps of single accent, not a second hue
- Level badge positioned top-right, duration positioned bottom-right per card
- Cards scale and fade in with stagger

**Data Source:** `lib/tutorialsSectionData.ts`, `lib/productsData.ts`

---

### 3.10 — Game Characters Section

**Purpose:** Showcase 3D asset offerings with visual appeal

**Content:**

- 3D model carousel (manually controlled, supports swipe on mobile)
- "Commission Custom Characters" callout (centered, accent border top/bottom)
- Product cards for the "game-characters" category
- CTA: "Browse Game Characters" → `/shop?category=game-characters`

**Design:**

- Carousel supports drag/swipe on touch
- Models load lazily (IntersectionObserver)
- Callout has subtle scale-up on entrance

**Data Source:** `lib/gameCharactersSectionData.ts`, `lib/productsData.ts`

---

### 3.11 — How It Works Section

**Purpose:** Demystify the marketplace experience in 3 simple steps

**Content:**

- Universal 3-step flow (distinct from the per-tier flow on `/how-it-works`):
  1. **Browse** — Explore categories and products
  2. **Choose** — Select products and tier
  3. **Start** — Get access and begin
- Each step: number badge + icon + heading + description (1 sentence)
- All steps visible simultaneously (not tabbed/accordion)

**Design:**

- Vertical timeline on desktop (center line, alternating left/right cards)
- Vertical stack on mobile (no alternation)
- Cards fade and slide in with stagger per step
- Icons scale up on entrance

**Data Source:** `lib/howItWorksHomeData.ts`

---

### 3.12 — Testimonials Section (Carousel)

**Purpose:** Build trust via customer success stories

**Content:**

- Auto-scroll testimonials carousel (right-to-left, opposite direction from FeaturedProducts)
- 6 quotes, one per marketplace category (matches category icons for visual cohesion)
- Each testimonial: quote text (italic), attribution (name + company + role), optional avatar
- Auto-scroll every 5 seconds, 30-second full loop, pause on hover
- Navigation arrows + dot indicators
- Mobile: stack single quote per screen, swipe support

**Design:**

- Fade-out gradient at carousel edges
- Quote cards have accent left border
- Avatars (if present) are small circles, 32px, grayscale, hover tint to color
- Text animates in per quote (opacity + slide-up)

**Data Source:** `lib/homeTestimonialsData.ts` (distinct from `/testimonials` page quotes)

---

### 3.13 — FAQ Accordion (Marketplace Questions)

**Purpose:** Address common buyer questions and reduce purchase hesitation

**Content:**

- 6 common marketplace questions:
  1. "What payment methods do you accept?"
  2. "What's the refund policy?"
  3. "How long does access take?"
  4. "Do you offer support?"
  5. "Can I use templates commercially?"
  6. "How often is the catalog updated?"
- Single-open accordion (opening one collapses any previous)
- Chevron icon rotates 180° on expand
- Answer panel animates height/opacity via framer-motion AnimatePresence

**Design:**

- Accordion items have subtle border, layered background
- Closed items have semi-transparent text
- Open item highlights with accent color/background
- CTA at bottom: "See All FAQs" → `/faq` (pending Phase 3)

**Accessibility:**

- aria-expanded on toggle button
- aria-controls linking button to answer panel
- role="region" on answer panel
- Keyboard support: arrow up/down between items, Enter to toggle

**Data Source:** `lib/homeFaqData.ts`

---

### 3.14 — CTA Banner (Bottom Call-to-Action)

**Purpose:** Final engagement opportunity before visitor leaves

**Content:**

- Headline: "Ready to Get Started?"
- Subheading: 1–2 lines of encouragement
- Two CTAs:
  - Primary: "Browse All Products" → `/products` (pending — forward-linked)
  - Secondary: "Book a Demo" → `/contact`

**Design:**

- Full-width gradient card (surface-active to surface)
- Centered, white text on dark gradient
- Container fades in at 80% viewport visibility
- Text slides up + fades in
- Buttons scale in with 0.2s delay (primary first, secondary second)
- Primary button scales up on hover (1.05x)
- Secondary button's border/text shift to accent color on hover
- Heading: 28px mobile → 40px desktop

**Responsive:**

- Desktop: centered layout
- Mobile: full-width with padding, text step-down

---

## 4. ANIMATIONS & INTERACTIONS

### 4.1 — Entrance Animations

- **Fade + Slide Up:** All major sections fade in + slide up (translateY: 24px → 0) triggered by IntersectionObserver (80% visibility)
- **Stagger:** Cards within grids fade in sequentially (0.1–0.15s delay between items)
- **Scale In:** Buttons, icons, product cards scale from 0.9 → 1.0 with ease-out timing
- **Count-Up:** Stats in Quick Wins animate from 0 to final value over 2 seconds on section entrance

### 4.2 — Scroll Interactions

- **Parallax:** Background images in hero and sections move at 0.1–0.2x scroll speed (subtle depth)
- **Scroll-Linked Transform:** T-Shirts section gallery image has subtle parallax (moves on manual scroll, not auto)

### 4.3 — Hover States

- **Cards:** Border/background shift, scale 1.02x, shadow increase (0.25s transition)
- **Buttons:** Scale 1.05x or 1.08x, color/opacity shift per button type (0.18s)
- **Links:** Color shift to accent, optional underline slide-in (0.15s)

### 4.4 — Carousel Auto-Play

- **Featured Products:** Auto-scroll right-to-left every 4s, 18s full loop, pause on hover, smooth transition (framer-motion)
- **Testimonials:** Auto-scroll right-to-left every 5s, 30s full loop, pause on hover
- **Arrows/Dots:** Always visible on desktop, appear on mobile hover, disable at carousel ends

### 4.5 — Accordion Behavior

- **Toggle:** Click expands current item, collapses previous
- **Animation:** Answer panel height animates from 0 → auto via framer-motion, opacity fades in (0.25s)
- **Chevron:** Icon rotates 180° smoothly on expand/collapse

---

## 5. RESPONSIVE DESIGN

### 5.1 — Breakpoints

- **Mobile:** 375px–767px (single-col layouts, stacked carousels)
- **Tablet:** 768px–1023px (2-col grids, adjusted spacing)
- **Desktop:** 1024px+ (full 3-col grids, hero split layouts)

### 5.2 — Layout Adjustments per Section

| Section           | Desktop                           | Tablet             | Mobile                                   |
| ----------------- | --------------------------------- | ------------------ | ---------------------------------------- |
| Hero              | 60/40 split (img/text)            | 50/50 split        | Full-width stack, 60dvh                  |
| Categories        | 3-col grid                        | 2-col grid         | 1-col stack                              |
| Featured Products | Carousel visible                  | Carousel visible   | Swipeable carousel, 1 product per screen |
| Templates Table   | Horizontal scroll (sticky header) | Horizontal scroll  | Vertical stack with accordion            |
| How It Works      | Alternating timeline              | Vertical stack     | Vertical stack                           |
| FAQ               | Full-width                        | Full-width, padded | Full-width, reduced padding              |
| CTA Banner        | Centered max-width                | Centered, padded   | Full-width, tight padding                |

### 5.3 — Typography Scaling

- **Headings:** Scale from mobile `24px` → `40px` via CSS custom property + mediaQueries.css
- **Body:** Scale from mobile `14px` → `16px`
- **All font sizes use `rem` units, never `px`**

---

## 6. PERFORMANCE & OPTIMIZATION

### 6.1 — Image & Video Optimization

- **Product images:** Lazy-loaded via Next.js `<Image>` component, WebP with JPEG fallback
- **Hero image:** `next/image` with `priority` prop (above-fold)
- **Section background images:** `background-image` URLs optimized via Cloudflare R2 (Rule 35.6)
- **Videos:** IntersectionObserver triggers play/pause at 60%+ viewport visibility, `<video preload="metadata">` (load only metadata until playback)

### 6.2 — Animation Performance

- **GPU-Accelerated:** All animations use `transform` (scale, translateX/Y, rotate) and `opacity`, never `width`/`height`/`top`/`left`
- **Framer-Motion:** Used for complex entrance/exit (Suspense, AnimatePresence), not for every hover (CSS transitions preferred for micro-interactions)
- **will-change:** Applied to elements with frequent transforms (carousels, parallax sections)

### 6.3 — Bundle Size

- **Icons:** lucide-react (tree-shakable, only imported icons included)
- **Animations:** framer-motion (core only, no extras)
- **No third-party tracking** for anonymous public traffic (Rule 41 — homepage is fully public, no analytics cookies required)

---

## 7. ACCESSIBILITY REQUIREMENTS

### 7.1 — Semantic HTML

- Main content wrapped in `<main>`
- Sections grouped in `<section>` elements
- Headings follow h1 → h2 → h3 hierarchy (one h1 per page, in hero section)
- Lists use `<ul>` / `<li>` for features, testimonials, etc.

### 7.2 — ARIA Labels

- Buttons: `aria-label` for icon-only buttons (e.g., arrow nav, close)
- Form inputs (if any): `aria-label` or associated `<label>`
- Carousel: `aria-label="Product carousel"`, `aria-live="polite"` for auto-scroll announcements
- Accordion: `aria-expanded`, `aria-controls` per item

### 7.3 — Keyboard Navigation

- Tab order follows visual flow (left-to-right, top-to-bottom)
- Enter/Space triggers buttons and accordion toggles
- Escape closes any expanded accordion items
- Arrow keys navigate carousel on desktop (manual, not auto-play during keyboard nav)

### 7.4 — Color Contrast

- Text on background: minimum 4.5:1 (WCAG AA)
- Interactive elements: focus-visible ring with 2px solid outline (accent color) + 3px offset

### 7.5 — Motion Preferences

- Animations respect `prefers-reduced-motion: reduce` media query
- Auto-play carousels pause/disable if user prefers reduced motion
- Entrance animations replace with opacity-only fade if reduced motion

---

## 8. DATA STRUCTURES & API INTEGRATION

### 8.1 — Data Sources (Local)

All homepage data is currently **static** and sourced from `/lib/*.ts` files:

| Section           | Data File                                    | Type                           | Notes                              |
| ----------------- | -------------------------------------------- | ------------------------------ | ---------------------------------- |
| Quick Wins        | `quickWinsData.ts`                           | Logos, stats                   | Placeholder metrics                |
| Categories        | `categoryShowcaseData.ts`                    | 6 category items               | Links to shop                      |
| Featured Products | `featuredProductsData.ts`                    | 5–8 product IDs                | References `productsData.ts`       |
| Templates         | `templatesSectionData.ts` + `pricingData.ts` | Section copy + comparison rows | Tier data reused                   |
| T-Shirts          | `tshirtsSectionData.ts`                      | Gallery slides, story quote    |                                    |
| AI Videos         | `aiVideosSectionData.ts`                     | Video URLs, callout copy       |                                    |
| File Tools        | `fileToolsSectionData.ts`                    | 3 feature items                |                                    |
| Tutorials         | `tutorialsSectionData.ts`                    | Persona data, metadata         | Level/duration per product         |
| Game Characters   | `gameCharactersSectionData.ts`               | Model carousel data, callout   |                                    |
| How It Works      | `howItWorksHomeData.ts`                      | 3-step flow                    | Distinct from `/how-it-works` page |
| Testimonials      | `homeTestimonialsData.ts`                    | 6 quotes per category          | Distinct from `/testimonials` page |
| FAQ               | `homeFaqData.ts`                             | 6 Q&A items                    |                                    |

### 8.2 — Future Database Integration (Phase 2)

Once a products/content database is available:

- Featured products fed from `products` table (sort by `trendingScore` + `dateAdded`)
- Testimonials pulled from a `testimonials` table (filtered by homepage flag)
- Category stats (product count, newest) computed from `products` table aggregation
- Lazy-loaded images from Cloudflare R2 (`NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL`)

### 8.3 — No Authenticated Data

- The homepage contains no user-specific data — same content for all visitors
- No API calls required to render the page (all static data)
- Server Component structure ensures zero client-side data fetching overhead

---

## 9. RELATED PAGES & NAVIGATION

### 9.1 — Primary CTAs & Navigation Targets

- **"Browse Products"** → `/products` (master product grid — Phase 2, pending)
- **"Book a Demo"** → `/contact` (existing, live)
- **Category cards** → `/shop?category=[name]` OR `/category/[name]` (routing TBD)
- **"View All FAQs"** → `/faq` (pending, Phase 3)
- **"Shop [Category]"** → `/shop?category=[name]` (per-section CTAs)

### 9.2 — Related Existing Pages

- `/shop` — Pricing tiers for templates (3-tier grid, live)
- `/portfolio` — Showcase / case studies (live)
- `/features` — Why Choose template (live)
- `/how-it-works` — Per-tier onboarding flow (live, distinct from homepage 3-step)
- `/testimonials` — Full testimonials page (live, distinct from homepage carousel)
- `/blog` — Tutorials & programming guides (live)
- `/contact` — Contact/demo booking form (live)

### 9.3 — Navigation UI

- **NavBar:** Sticky on desktop, drawer on mobile (existing, unchanged)
- **Footer:** Social links, quick navigation, copyright (existing, unchanged)
- **Breadcrumbs:** None on homepage (it's the root)

---

## 10. TESTING & VERIFICATION CHECKLIST

Before marking the homepage as complete, verify:

### 10.1 — Functionality

- [ ] All 14 sections render without console errors (`npx tsc --noEmit` passes)
- [ ] All CTAs navigate to correct routes (internal links via next/link, external links via `target="_blank"`)
- [ ] Carousels auto-play and pause on hover
- [ ] FAQ accordion expands/collapses correctly, only one item open at a time
- [ ] All images/videos load successfully (no 404s)
- [ ] Forms (contact CTA) route correctly to `/contact`

### 10.2 — Responsive Design

- [ ] Layout tested at 375px (mobile), 768px (tablet), 1024px (desktop)
- [ ] Typography scales correctly (mobile `24px` → desktop `40px` for headings)
- [ ] Carousels are swipeable on mobile
- [ ] No horizontal scroll on any viewport
- [ ] Touch targets are minimum 44px × 44px (Rule 29)

### 10.3 — Animations & Performance

- [ ] Animations respect `prefers-reduced-motion` media query
- [ ] Entrance animations trigger correctly at 80% viewport visibility
- [ ] Scroll performance is smooth (60 FPS, monitored via Chrome DevTools Performance tab)
- [ ] Largest Contentful Paint (LCP) < 2.5s (Google Core Web Vitals target)
- [ ] No layout shift (Cumulative Layout Shift CLS < 0.1)

### 10.4 — Accessibility

- [ ] Keyboard navigation works end-to-end (Tab, Enter, Arrow keys)
- [ ] Screen reader announces sections, headings, buttons correctly
- [ ] Color contrast passes WCAG AA (4.5:1 for text)
- [ ] Focus-visible rings appear on all interactive elements
- [ ] No auto-playing video with sound (videos pause by default until user interaction)

### 10.5 — SEO & Metadata

- [ ] `<title>` and `<meta description>` are set and unique (existing in `metadata` export)
- [ ] Open Graph (og:image, og:title, og:description) configured for social sharing
- [ ] Heading hierarchy is correct (h1 → h2 → h3, no skipped levels)
- [ ] Internal links use next/link (SEO benefit vs raw `<a>`)

### 10.6 — Loading States & Error Handling

- [ ] Images have alt text (accessibility + SEO)
- [ ] Fallback content shown if JavaScript fails (graceful degradation)
- [ ] No 404s in Network tab for images/fonts/styles

---

## 11. FILE STRUCTURE & COMPONENTS REFERENCE

```
app/(public)/
  page.tsx                           ← Homepage (Server Component, renders all sections)
  styles/
    home.css                         ← Homepage-specific styles

components/home/
  HeroSection.tsx                    ← Hero banner + primary CTAs
  QuickWins.tsx                      ← Client logos + stats
  CategoryShowcase.tsx               ← 6-category card grid
  FeaturedProducts.tsx               ← Auto-scroll carousel
  TemplatesSection.tsx               ← Template tier deep-dive
  TShirtsSection.tsx                 ← Merchandise section
  AIVideosSection.tsx                ← Video content section
  FileToolsSection.tsx               ← File tools intro
  TutorialsSection.tsx               ← Learning content section
  GameCharactersSection.tsx          ← 3D asset showcase
  HowItWorksSection.tsx              ← 3-step universal flow
  TestimonialsSection.tsx            ← Testimonials carousel
  FAQAccordion.tsx                   ← FAQ accordion
  CTABanner.tsx                      ← Bottom CTA banner

lib/
  categoryShowcaseData.ts            ← 6 categories
  featuredProductsData.ts            ← Bestsellers carousel
  templatesSectionData.ts            ← Template section copy
  tshirtsSectionData.ts              ← T-shirt section copy
  aiVideosSectionData.ts             ← AI videos section copy
  fileToolsSectionData.ts            ← File tools section copy
  tutorialsSectionData.ts            ← Tutorials section copy + metadata
  gameCharactersSectionData.ts       ← Game characters section copy
  howItWorksHomeData.ts              ← 3-step flow data
  homeTestimonialsData.ts            ← Homepage testimonials (distinct)
  homeFaqData.ts                     ← Homepage FAQ (distinct)
  productsData.ts                    ← Unified product catalog (reused across sections)
  pricingData.ts                     ← Template pricing tiers (reused)
  categoryIcons.tsx                  ← Category icon mappings
```

---

## 12. NOTES & KNOWN LIMITATIONS

- **Phase 1 Complete:** Homepage structure + all 14 sections built and non-interactive animated
- **Phase 2 Complete:** `/products` master grid (filter/sort/search), all 6 category detail
  pages, and product detail pages are built — see `improvement_1_done.md`
- **Phase 3 — mostly complete:** `/faq` is intentionally a redirect to `/support` (which already
  has a searchable, category-grouped FAQ accordion) rather than a duplicate page — see the
  file header comment in `app/(public)/faq/page.tsx`. Product search/filtering is done
  (`ProductsGrid`). Only **personalized recommendations** remains unbuilt.
- **Phase 4 — Front-End Modernization (Section 13):** planned, not yet built — this is the only
  substantial work left against this document
- **Database:** All data currently static (lib/\*.ts files); will migrate to live database (Supabase) once products table is created
- **Product Images:** Placeholder tinted gradients; real product photos to be sourced and uploaded to Cloudflare R2
- **Third-Party Services:** Contact form → EmailJS (Rule 35.5, not yet wired); hero/section CTAs → internal routes only (no external links)
- **Analytics:** Homepage follows Rule 41 (anonymous public traffic, aggregate analytics only, no per-visitor tracking)

---

## 13. FRONT-END MODERNIZATION ENHANCEMENT PLAN (2026)

**Goal:** Make the buyer-facing experience (this homepage + `app/buyer/dashboard`) feel alive, modern, and smooth on both wide and small screens — companion effort to `visitor_specification.md`, which covers the rest of the public marketing pages. Same design-token system (`app/globals.css`), same `framer-motion` dependency already installed — no new libraries needed.

**13.1 — Scope**

- `/` homepage (all 14 sections above)
- `app/buyer/dashboard/page.tsx` + `app/styles/buyerDashboard.css`
- Shared buyer-facing components under `components/buyer/`, `components/home/`

**13.2 — Motion upgrades to apply**
| Area | Current state | Enhancement |
|---|---|---|
| Section entrances | Some sections already fade/translate on load | Standardize every section on scroll-triggered `IntersectionObserver` + `framer-motion` `whileInView` (once: true), 24px translateY → 0, per Rule 17.5 |
| Hero | Static fade-in on mount | Add subtle parallax on the hero background layer (0.10–0.15x scroll speed), CTA buttons stagger in after headline |
| Product/category cards | Hover color change only | Add lift + shadow-soften on hover/focus (`transform: translateY(-4px)`, `transition: var(--transition-base)`), staggered entrance per card (60–80ms delay per index) |
| Testimonials / carousels | Instant slide switch | Crossfade + slight scale transition between slides (`--transition-slow`) |
| Buyer dashboard cards/widgets | Static render | Skeleton-in → fade/scale-in on data arrival (ties into Rule 25 loading states already required) |
| Mobile (≤768px) | Same animations as desktop | Reduce translate distances (12px instead of 24px) and disable parallax entirely — parallax on text/foreground is already forbidden per Rule 17.5 |
| Reduced motion | Not yet handled | Respect `prefers-reduced-motion: reduce` — drop to opacity-only transitions, no translate/parallax |

**13.3 — Non-negotiables carried over from this spec's existing rules**

- All new transition values reference `--transition-fast/base/slow` tokens (Section 4 / Rule 33.4) — never ad-hoc durations.
- No `min/max-width` layout hacks introduced to achieve animation effects — flex/grid stays the layout mechanism (Rule 23.3).
- No parallax on readable text, ever.

**13.4 — Delivery approach**
Following Rule 8A, each section/page is enhanced and delivered as its own turn (e.g. Hero + Quick Wins first, then Category Showcase + Featured Products, etc.) rather than one giant diff — full component + CSS files delivered per change, ZIP if 5+ files touch the same response.

---

## 14. CHANGE LOG

| Date       | Change                                                                                                                                                                                                                                                                                                                                                        |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-09-01 | Initial homepage specification created; all 14 sections documented; component mappings added.                                                                                                                                                                                                                                                                 |
| 2026-09-03 | Added Section 13 (Front-End Modernization Enhancement Plan) — scroll-triggered motion, card hover/lift, carousel crossfade, reduced-motion handling, buyer dashboard entrance states. Companion to new `visitor_specification.md`.                                                                                                                            |
| 2026-09-04 | Corrected Section 12 — Phase 2 (`/products`, category pages, product detail pages) and most of Phase 3 (`/faq` retirement, search/filtering) were already built (verified against `improvement_1_done.md` and live files) but this doc still listed them as pending. Only personalized recommendations (Phase 3) and Section 13's Modernization Phase remain. |

---

**Document Version:** 1.2  
**Last Updated:** 2026-09-04  
**Status:** Specification Complete (Implementation Phase 1–2 done, Phase 3 done except personalized recommendations; Modernization Phase — planned, not yet built)
