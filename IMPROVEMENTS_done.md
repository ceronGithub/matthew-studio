# Homepage Design & Implementation Spec

## Overview

Single-page scrollable homepage with 6 custom category sections (Templates, T-Shirts, AI Videos, File Tools, Tutorials, Game Characters). Each section has unique depth based on product importance and conversion potential.

---

## 1. LAYOUT & STRUCTURE

### Page Flow

```
1. Navigation Bar (sticky)
2. Hero Section (existing)
3. Quick Wins (existing)
4. Templates Section ↓
5. T-Shirts Section ↓
6. AI Videos Section ↓
7. File Tools Section ↓
8. Tutorials Section ↓
9. Game Characters Section ↓
10. How It Works (existing)
11. Testimonials (existing)
12. FAQ (existing)
13. CTA Banner (existing)
14. Footer
```

### Section Anatomy (standard pattern)

```
<section className="categorySection">
  <div className="sectionContainer">

    <!-- HEADER -->
    <div className="sectionHeader">
      <p className="eyebrow">Category badge or descriptor</p>
      <h2 className="sectionTitle">Main headline/slogan</h2>
      <p className="sectionSubtitle">Supporting description (optional)</p>
    </div>

    <!-- CUSTOM CONTENT (varies by section) -->
    <div className="sectionContent">
      [Comparison table | Design gallery | Video demos | Feature grid]
    </div>

    <!-- PRODUCT CARDS -->
    <div className="productCardsGrid">
      [3-column responsive grid of product cards]
    </div>

    <!-- CTA -->
    <div className="sectionCTA">
      <button className="buttonPrimary">Primary action</button>
    </div>

  </div>
</section>
```

---

## 2. DESIGN SYSTEM

### Colors (via CSS variables)

- **Primary accent:** `var(--color-accent)` = `#22c55e` (green)
- **Text primary:** `var(--color-text-primary)` = `#f4f4f5`
- **Text secondary:** `var(--color-text-secondary)` = `rgba(255,255,255,0.55)`
- **Surface base:** `var(--color-surface)` = `rgba(255,255,255,0.03)`
- **Surface hover:** `var(--color-surface-hover)` = `rgba(255,255,255,0.06)`
- **Border:** `var(--color-border)` = `rgba(255,255,255,0.08)`

### Typography

- **Section eyebrow:** 0.75rem, uppercase, letter-spacing 0.15em, `var(--color-text-muted)`, opacity 0.4
- **Section title (h2):** 2.25rem (responsive: 1.75rem mobile), font-weight 600, `var(--color-text-primary)`, tight tracking
- **Section subtitle (p):** 1.125rem, `var(--color-text-secondary)`, line-height 1.7
- **Product card title:** 1rem, font-weight 500, `var(--color-text-primary)`
- **Product card meta:** 0.875rem, `var(--color-text-secondary)`

### Spacing

- **Section padding vertical:** 4rem (responsive: 2.5rem mobile)
- **Section padding horizontal:** 2rem (responsive: 1rem mobile)
- **Content to cards gap:** 2.5rem
- **Card grid gap:** 1.5rem
- **Eyebrow to title:** 0.75rem
- **Title to subtitle:** 1rem
- **Subtitle to content:** 2.5rem

### Border radius

- **Cards:** 12px (var(--radius))
- **Small elements:** 6px
- **Pills/badges:** 20px

### Shadows

- **Card rest:** none (clean borders only)
- **Card hover:** `0 0 0 1px var(--color-border-hover), 0 12px 24px rgba(0,0,0,0.1)`
- **Modal/overlay:** `0 20px 40px rgba(0,0,0,0.3)`

---

## 3. ANIMATION PATTERNS

### Entrance animations (Framer Motion)

Applied to sections as they enter viewport via `<motion.div>` with `whileInView`.

**Pattern 1: Fade + Slide Up** (default for headers)

```javascript
initial={{ opacity: 0, y: 24 }}
whileInView={{ opacity: 1, y: 0 }}
viewport={{ once: true, amount: 0.3 }}
transition={{ duration: 0.6, ease: "easeOut" }}
```

**Pattern 2: Stagger Cards** (for product grids)

```javascript
// Parent container
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

// Individual card
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};
```

**Pattern 3: Counter animations** (for benefit numbers in comparison tables)
Use `framer-motion`'s `useMotionValue` + `useTransform` to animate numbers as section comes into view.

### Hover interactions (CSS + Framer)

**Card hover:**

```css
.productCard {
  transition:
    border-color 0.2s ease,
    box-shadow 0.25s ease;
}

.productCard:hover {
  border-color: var(--color-border-hover);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
}
```

**Button hover:**

```css
.buttonPrimary:hover {
  background-color: var(--color-accent-hover);
  transform: translateY(-2px);
  transition: all 0.25s cubic-bezier(0.22, 1, 0.36, 1);
}

.buttonPrimary:active {
  transform: translateY(0px);
}
```

**Link underline (for section titles on hover):**

```css
.sectionTitle::after {
  content: "";
  position: absolute;
  bottom: -8px;
  left: 0;
  width: 0;
  height: 3px;
  background: var(--color-accent);
  transition: width 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}

.sectionTitle:hover::after {
  width: 60px;
}
```

### Scroll-driven animations (IntersectionObserver)

**Parallax (subtle):**

- Background images in T-Shirt design section move at 0.15x scroll speed
- Hero quote in AI Videos section moves at 0.2x scroll speed
- Direction: upward (negative translateY as user scrolls down)

**Code example:**

```javascript
useEffect(() => {
  const observer = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) {
      const scrollPercent = window.scrollY / window.innerHeight;
      element.style.transform = `translateY(${scrollPercent * -20}px)`;
    }
  });
  observer.observe(elementRef.current);
}, []);
```

### Video autoplay behavior

**Loom embeds / custom video players:**

- Pause on scroll away (IntersectionObserver)
- Muted by default
- Play when 60% of video is visible in viewport
- Loop disabled (user controls playback)

```javascript
const videoObserver = new IntersectionObserver(([entry]) => {
  if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
    videoElement.play();
  } else {
    videoElement.pause();
  }
});
```

---

## 4. SECTION-BY-SECTION SPECIFICATIONS

### A. TEMPLATES SECTION

**Purpose:** Sell the core product with depth. Highest conversion priority.

**Structure:**

```
Header (slogan + description)
  ↓
Comparison Table (Managed vs Self-Hosted vs Custom)
  ↓
Benefits Grid (6 key features)
  ↓
Why Us Section (3-column trust builder)
  ↓
Demo (Loom embed or video carousel)
  ↓
Product Cards (3 template variants)
  ↓
CTA Button ("Explore Templates")
```

**Design Details:**

**Comparison Table:**

- 3-column layout (desktop) | 1-column (mobile, stacked)
- Header row: tier name + starting price
- Rows: feature + checkmarks/values per tier
- Highlight "Most Popular" tier with `border: 2px solid var(--color-accent)`
- Hover: row background shifts to `var(--color-surface-hover)`
- Animation: Fade in via `whileInView`, counter animations on prices

```css
.comparisonTable {
  width: 100%;
  border-collapse: collapse;
  margin: 2.5rem 0;
}

.comparisonTable th {
  padding: 1.5rem;
  text-align: center;
  border-bottom: 1px solid var(--color-border);
  font-size: 1.125rem;
  font-weight: 500;
}

.comparisonTable td {
  padding: 1rem 1.5rem;
  border-bottom: 0.5px solid var(--color-border);
}

.comparisonTable tr:hover {
  background: var(--color-surface-hover);
  transition: background 0.25s ease;
}
```

**Benefits Grid:**

- 2x3 grid (desktop) | 1 column (mobile)
- Each benefit: icon (left, 32px) + title + 1-line description
- Icon color: `var(--color-accent)`
- Title: 1rem, font-weight 500
- Description: 0.875rem, `var(--color-text-secondary)`
- Hover: card background shifts, icon rotates 5deg
- Entrance: Stagger animation (0.1s delay between cards)

**Why Us Section:**

- 3 columns: heading + body + icon
- Heading: bold, `var(--color-accent)` tint background (light pill)
- Body: 0.875rem, conversational tone, max 2 sentences
- Icon: 48px, centered above heading
- Layout: Flex row, center-aligned
- Gap between cards: 2rem
- Mobile: Stack vertically

**Demo:**

- Loom embed (responsive 16:9 aspect ratio)
- Container: `aspect-ratio: 16/9; border-radius: 12px; overflow: hidden`
- Autoplay: muted, pause on scroll
- Caption below: "See a 2-minute walkthrough of the dashboard in action"
- Fallback: Static screenshot with play button overlay if embed fails

**Product Cards (reusable component):**

- 3-column grid, 1 per row on mobile
- Card: 280px (desktop), full-width (mobile)
- Content: Badge + Icon + Name + Description + Price + Rating + CTA button
- Badge animation: Scale 1 → 1.05 on parent hover, fade in via `whileInView`
- CTA color: `var(--color-accent)` on hover

---

### B. T-SHIRTS SECTION

**Purpose:** Sell identity & story. Emotional connection + design showcase.

**Structure:**

```
Header (slogan: "Wear the culture")
  ↓
Design Gallery Carousel (3-4 shirt designs with stories)
  ↓
"The Story" Callout (why these designs exist)
  ↓
Product Cards (all 3 tee variants with images)
  ↓
CTA Button ("Shop T-Shirts")
```

**Design Details:**

**Design Gallery Carousel:**

- Horizontal scroll or carousel (Framer Motion + custom controls)
- Each slide: 60% width on desktop, full width on mobile
- Content per slide:
  - Large design image (left) or centered
  - Overlay text (bottom-right, semi-transparent dark): design name + tagline
  - Side-by-side on desktop, stacked on mobile
- Navigation: Left/right arrow buttons (Chevron icons, 20px)
- Auto-scroll: disabled (manual control only)
- Transition: 0.5s ease-in-out via Framer `animate.x`
- Parallax: Design images shift -10px on scroll within carousel range

```javascript
// Carousel frame setup
const [carouselPosition, setCarouselPosition] = useState(0);
const slideWidth = containerWidth * 0.6;

function nextSlide() {
  setCarouselPosition((prev) => Math.min(prev + slideWidth, maxScroll));
}
```

**"The Story" Callout:**

- Background: gradient fade (dark → transparent, top to bottom)
- Quote or philosophy: 1.5rem, italic, `var(--color-text-primary)`
- Attribution: small, `var(--color-text-secondary)`
- Max-width: 600px, centered
- Padding: 2rem 1.5rem
- Margin: 2.5rem 0
- Border-left: 4px solid `var(--color-accent)`
- Entrance: Fade + slide-left via `whileInView`

**Product Cards:**

- Same structure as Templates section but with clothing imagery
- Image placeholder: color gradient per design (Templates: blue, Creator tee: green)
- If real images exist: swap placeholder for `<Image>` component
- Size variants: S, M, L, XL (display in card meta if showing)

---

### C. AI VIDEOS SECTION

**Purpose:** Show capability through examples. Enable custom orders.

**Structure:**

```
Header (slogan: "Templates meet custom creation")
  ↓
Video Carousel (2-3 sample videos, 30-60s each)
  ↓
"Need custom videos?" Callout + Contact button
  ↓
Product Cards (template packs)
  ↓
CTA Button ("Get Started with AI Videos")
```

**Design Details:**

**Video Carousel:**

- 1-column desktop (full width 16:9), 1-column mobile
- Each video: muted, controls visible (play/pause, volume, progress)
- Navigation: Dots below (1 dot per video, clickable)
- Auto-advance: NO (manual control)
- Hover: Play button overlay appears (large, centered, 60px icon)
- Transition: 0.3s fade between videos

```css
.videoCarousel {
  position: relative;
  aspect-ratio: 16 / 9;
  background: var(--color-surface);
  border-radius: 12px;
  overflow: hidden;
  margin: 2.5rem 0;
}

.videoCarousel video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.videoCarouselNav {
  display: flex;
  gap: 8px;
  justify-content: center;
  margin-top: 1.5rem;
}

.videoDot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--color-border);
  cursor: pointer;
  transition: background 0.3s ease;
}

.videoDot.active {
  background: var(--color-accent);
  transform: scale(1.2);
}
```

**"Need custom videos?" Callout:**

- Card layout: 2-column (text left, icon right) | 1-column mobile
- Headline: 1.5rem, bold, `var(--color-accent)`
- Body: 1rem, conversational
- CTA: inline button, styled as secondary (outline)
- Background: subtle tint `var(--color-surface-hover)`
- Border-left: 4px accent bar
- Padding: 2rem
- Margin: 2.5rem 0
- Entrance: Bounce animation on `whileInView` (slight scale up + fade)

---

### D. FILE TOOLS SECTION

**Purpose:** Quick scannable overview. High conversion on ratings.

**Structure:**

```
Header (slogan: "Productivity tools for creators")
  ↓
Feature Grid (3 key benefits)
  ↓
Product Cards (3 tools: Converter, PDF Compressor, Image Remover)
  ↓
CTA Button ("Explore Tools")
```

**Design Details:**

**Feature Grid:**

- 3-column desktop | 1-column mobile
- Each: Icon (24px) + Title + 1 sentence description
- Icon colors: Rotate through accent variants (green, teal, coral)
- Entrance: Fade + stagger (0.1s between cards)
- No hover state needed (light content)

**Product Cards:**

- Inherit from Templates section
- Icon placeholder (Wrench icon, sized 40px)
- Highlight ratings prominently (larger font, accent color for the score)

---

### E. TUTORIALS SECTION

**Purpose:** Educate buyers on what fits them. Show depth of catalog.

**Structure:**

```
Header (slogan: "Learn from real projects")
  ↓
"Who's this for?" Callout (3 audience personas)
  ↓
Product Cards (3 tutorials grouped by level: Beginner / Intermediate / Advanced)
  ↓
CTA Button ("Browse All Courses")
```

**Design Details:**

**"Who's this for?" Callout:**

- 3-column layout (desktop) | 1-column stacked (mobile)
- Each persona: Icon + Role title + Quick bullet point
- Persona background: subtle role-based color (e.g., blue for devs, green for designers)
- Entrance: Fade in, stagger 0.15s between cards
- No hover state

**Product Cards:**

- Same as above but with level badges (Beginner: green, Intermediate: amber, Advanced: red)
- Course duration: small meta text (e.g., "12 hours" or "16 lessons")
- Entrance: Stagger by level group

---

### F. GAME CHARACTERS SECTION

**Purpose:** Visual showcase. Gallery-driven discovery.

**Structure:**

```
Header (slogan: "3D ready game characters")
  ↓
Character Gallery Grid (6-9 character thumbnails, clickable lightbox)
  ↓
Product Cards (character packs)
  ↓
CTA Button ("View All Characters")
```

**Design Details:**

**Character Gallery Grid:**

- 3-column desktop | 2-column tablet | 1-column mobile
- Each thumbnail: Square aspect ratio, image or placeholder icon
- Hover: Overlay appears (semi-transparent dark) with character name + "View" button
- Lightbox modal: Click to expand full-res view, navigate with arrow keys
- Entrance: Stagger fade + scale (0.1s between items)

```css
.characterGrid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin: 2.5rem 0;
}

.characterThumb {
  position: relative;
  aspect-ratio: 1;
  border-radius: 12px;
  overflow: hidden;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  cursor: pointer;
  transition: border-color 0.25s ease;
}

.characterThumb:hover {
  border-color: var(--color-border-hover);
}

.characterThumb::after {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  opacity: 0;
  transition: opacity 0.25s ease;
}

.characterThumb:hover::after {
  opacity: 1;
}
```

**Product Cards:**

- Same structure, with "Rigged" / "Modular" / "Low-poly" badges
- Entrance: Stagger within product grid

---

## 5. RESPONSIVE BEHAVIOR

### Breakpoints

- **Desktop:** 1280px+
- **Tablet:** 768px – 1279px
- **Mobile:** < 768px

### Mobile adjustments

- **Section padding:** 2rem → 1rem horizontal
- **Section title:** 2.25rem → 1.75rem
- **Comparison table:** 3-column → stack (each row = 1 tier, scrollable horizontally on narrow screens)
- **Grids:** All columns → single column
- **Carousels:** 60% width → full width
- **Video aspect ratio:** Maintain 16:9 even on tiny screens
- **Buttons:** Full width on mobile (except inline CTAs)

### Touch interactions

- Tap targets: minimum 44x44px
- No hover states (replaced with active/pressed states)
- Swiping: enable horizontal swipe for carousels on touch devices

```javascript
// Swipe detection for carousels
const [swipeStart, setSwipeStart] = useState(0);

function handleTouchStart(e) {
  setSwipeStart(e.touches[0].clientX);
}

function handleTouchEnd(e) {
  const swipeEnd = e.changedTouches[0].clientX;
  const distance = swipeStart - swipeEnd;
  if (distance > 50) nextSlide(); // Swiped left
  if (distance < -50) prevSlide(); // Swiped right
}
```

---

## 6. INTERACTIVE ELEMENTS

### Buttons

- **Primary button:** Solid accent background, white text, hover + 2px lift
- **Secondary button:** Transparent background, accent border, hover = border-strong
- **Ghost button:** No background, text color, hover = bg-surface
- All: 44px min height, rounded 8px, 0.25s transition

### Form elements (Support page)

- Email input: 44px height, 0.5px border, focus = accent border + ring
- Textarea: 120px min height, same styling
- Submit button: Full width on mobile, fixed width on desktop

### Video players

- Custom controls (play, pause, volume, progress)
- Hover: Controls overlay appears with gradient fade-in
- Progress bar: Scrubbing enabled, 4px tall (8px on hover)

---

## 7. PERFORMANCE CONSIDERATIONS

### Image optimization

- Use `next/image` for all product/character images
- Placeholder: LQIP (low-quality image placeholder) or solid color
- Lazy load: Enable on cards outside viewport

### Video optimization

- Embed Loom or host on Cloudflare Stream (CDN-backed)
- Thumbnails: WebP format, <100KB
- Never autoplay on mount; pause on scroll out

### Animation performance

- Use `transform` and `opacity` only (GPU-accelerated)
- Avoid `position`, `width`, `height` changes mid-animation
- Limit `box-shadow` on hover to 1-2 cards at a time
- Disable animations on `prefers-reduced-motion` media query

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 8. NAVIGATION BAR UPDATES

### Links

- Home
- **Testimonials** → `<Link href="#testimonials-section">`
- **Support** → `<Link href="/support">`
- **How It Works** → `<Link href="#how-it-works-section">`
- Shop → `<Link href="/shop">`

### Behavior

- Smooth scroll on anchor links (native `scroll-behavior: smooth` on html)
- Active link highlight: underline + accent color when section is in viewport
- Mobile: Hamburger menu, collapsible

---

## 9. SUPPORT PAGE (`/support`)

### Structure

```
Header: "Support & FAQ"
  ↓
Contact Form Section
  - Email input
  - Subject dropdown
  - Message textarea
  - Submit button
  - Success/error toast feedback

FAQ Section
  - Accordion (questions grouped by category: General | Templates | Products)
  - Each Q: click to expand A
  - Search box to filter FAQs
  - Entrance: Stagger fade-in
```

### Design

- Same spacing/typography system
- Contact form: max-width 600px, centered
- FAQ accordion: max-width 700px, centered
- No heavy animations (light fade-ins only)

---

## 10. ANIMATION SUMMARY TABLE

| Element            | Animation Type          | Trigger        | Duration              | Easing                      |
| ------------------ | ----------------------- | -------------- | --------------------- | --------------------------- |
| Section headers    | Fade + slide-up         | whileInView    | 0.6s                  | easeOut                     |
| Product cards      | Stagger fade + scale    | whileInView    | 0.5s (staggered 0.1s) | easeOut                     |
| Parallax images    | Scroll-driven transform | ScrollListener | continuous            | linear                      |
| Button hover       | Lift + color            | :hover         | 0.25s                 | cubic-bezier(0.22,1,0.36,1) |
| Card hover         | Border + shadow         | :hover         | 0.25s                 | ease                        |
| Carousel slide     | Fade transition         | onClick        | 0.3s                  | ease-in-out                 |
| Comparison counter | Number increment        | whileInView    | 1.5s                  | easeOut                     |
| Modal open/close   | Scale + fade            | state change   | 0.4s                  | cubic-bezier(0.22,1,0.36,1) |

---

## 11. FILE STRUCTURE

```
components/
├── home/
│   ├── TemplatesSection.tsx        ← Rich: comparison, benefits, demo
│   ├── TShirtsSection.tsx           ← Medium: gallery, story, cards
│   ├── AIVideosSection.tsx          ← Medium: video carousel, custom CTA
│   ├── FileToolsSection.tsx         ← Light: feature grid, cards
│   ├── TutorialsSection.tsx         ← Light: personas, cards
│   ├── GameCharactersSection.tsx    ← Light: gallery, cards
│   ├── ProductCard.tsx              ← Reusable product display
│   ├── ComparisonTable.tsx          ← Reusable comparison component
│   ├── FeatureGrid.tsx              ← Reusable benefits/features
│   └── VideoCarousel.tsx            ← Reusable video player carousel
├── shared/
│   └── SectionHeader.tsx            ← Reusable eyebrow + title + subtitle
└── ...

pages/
├── (public)/
│   ├── page.tsx                     ← Homepage with all 6 sections
│   └── support/
│       ├── page.tsx                 ← Support page
│       └── support.css              ← Support styles
```

---

## 12. ROLLOUT PLAN

### Phase 1: Components (Day 1)

- ProductCard (reusable)
- SectionHeader (reusable)
- ComparisonTable
- FeatureGrid
- VideoCarousel

### Phase 2: Sections (Day 2)

- TemplatesSection
- TShirtsSection
- AIVideosSection
- FileToolsSection
- TutorialsSection
- GameCharactersSection

### Phase 3: Integration (Day 3)

- Wire all sections into homepage
- Update navbar
- Build /support page
- Test responsive on mobile/tablet

### Phase 4: Polish (Day 4)

- Add animations
- Performance optimization
- Accessibility audit
- Cross-browser testing

---

## 13. ACCESSIBILITY CHECKLIST

- [ ] All images have descriptive alt text
- [ ] Color contrast passes WCAG AA (4.5:1 for text)
- [ ] Buttons have focus-visible outlines
- [ ] Videos have captions (if demo/tutorial)
- [ ] Carousel has keyboard navigation (arrow keys)
- [ ] Form labels associated with inputs
- [ ] Reduced motion preference respected
- [ ] Semantic HTML (section, article, nav, etc.)
- [ ] Aria-labels on icon-only buttons
- [ ] Tab order is logical (skip to main content)

---

**Document Version:** 1.0  
**Last Updated:** 2026-09-01  
**Status:** Design Spec Complete, Ready for Implementation
