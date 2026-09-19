# MASTER TASK PLAN — matthew-studio (shop branch)

**NEXT UP:** task-49 | file: none yet — spec not broken down | needs: none | setup: none
**OPEN FINDINGS:** 5 — see docs/openFindings.md

Legend: [ ] not started · [~] in progress · [DONE] complete

Source of truth for status: this file (docs/taskPlan.md), per Rule
49.2. overviewProject.txt Section 5C is retired (Rule 16.1) — no
longer updated or consulted for status. Fully-[DONE] phases/items are
collapsed to one line here with full detail moved to
docs/taskPlan.archive.md (never read during a next-task lookup).

---

## PHASE 4 — SECURITY & ACCESS HARDENING

- [DONE] Items 6, 7, 8 — vault_specification.md, gatekeeper_specification.md,
      buyer_password_recovery_specification.md — all CLOSED 2026-09-07
      (task-28 through task-41, task-66 through task-70). See
      docs/taskPlan.archive.md.

---

## PHASE 3 (remainder) — ADMIN & SUPER-ADMIN OVERSIGHT

- [DONE] 4. admin_account_specification.md — CLOSED 2026-09-08, all items
      (dashboard, orders, users, analytics, vault, security logs,
      profile — task-42 through task-44, task-65, task-71 through
      task-93) done. See docs/taskPlan.archive.md.

### [~] 5. super_admin_account_specification.md
- [DONE] task-45 (API+UI) — Security Logs viewer page. See docs/taskPlan.archive.md.
- [DONE] task-46 — Account Activity page. See docs/taskPlan.archive.md.
- [DONE] task-33 (shared, see Phase 4) — Gatekeeper/device-bans page.
- [DONE] task-47 — 2FA/TOTP enrollment (6 micro-tasks). See docs/taskPlan.archive.md.
- super_admin_account_specification.md Phases 3-10:
  - [DONE] Phase 3 — Admin Management (task-94 through task-99). See
        docs/taskPlan.archive.md.
  - [DONE] Phase 4 (remainder) — Backups, Rule 40 (task-100 through
        task-105). See docs/taskPlan.archive.md.
  - [DONE] Phase 5 — Buyer Management (task-106 through task-108). See
        docs/taskPlan.archive.md.
  - [DONE] Phase 6 — Product & Order Management w/ approval flow
        (task-109 through task-112). See docs/taskPlan.archive.md.
        NOTE: task-110's collection-route gap (GET/POST
        /api/admin/products) is confirmed closed — verified 2026-09-20
        by direct code view of app/api/admin/products/route.ts. A
        separate, unrelated gap (storefront not wired to Product DB)
        remains open — see docs/openFindings.md.
  - [ ] Phase 7 — CMS, Announcements, Media Library (Section 3.7/3.9, 9.3)

        AUDITED 2026-09-13 — Layer-3 verification:

        | Module                      | Spec | Schema | Code Wired | Verdict      |
        |------------------------------|------|--------|------------|--------------|
        | CMS / Content Mgmt (3.7)     | ✅   | ❌     | ❌         | Spec only    |
        | Announcements (3.9)          | ✅   | ❌     | ❌         | Spec only    |
        | Media Library (9.3)          | ✅   | ❌     | ❌         | Spec only    |

        Split into 8 micro-tasks, same pattern as Phase 6's task-109
        through 112.

      - [DONE] task-113 — schema: `ContentSection` + `ContentVersion`
            models (CMS, Section 3.7 + 9.3's 5-version history). Built
            2026-09-13, see docs/tasks/task-113-schema-content-sections.md.
      - [DONE] task-114 — API: content section CRUD — list (tree), get
            one, PUT (publish, snapshots to `ContentVersion`, prunes
            beyond 5), revert-to-version. Depends on task-113. Built
            2026-09-13, see docs/tasks/task-114-api-content-sections.md.
      - [DONE] task-115 — UI: `/superAdmin/content` page — section tree
            (left panel), type-aware form matching the selected
            section's data shape (right panel), Preview (opens live
            page), Publish, Revert-to-last-published w/ version
            history list. Depends on task-114. Built 2026-09-20 —
            also fixed task-114's list route (was a duplicate of the
            detail route, never actually listed sections) and added
            the missing GET .../[sectionId]/versions endpoint the
            Revert feature needs (neither existed before). See
            docs/tasks/task-115-ui-superadmin-content.md.
      - [DONE] task-116 — schema: `Announcement` model (Section 3.9).
            No dependency. Found already present in prisma/schema.prisma
            during pointer lookup (2026-09-20) — plan was stale, code
            wasn't. Model matches spec exactly (title, message,
            placement, status, publishAt, expiresAt, createdBy/
            updatedBy, deletedAt, indexes on status+placement). Not
            wired into any API/UI yet — that's task-117/118's scope.
      - [DONE] task-117 — API: announcement CRUD — list (paginated),
            create, edit, duplicate, deactivate early, soft delete
            (Rule 6). Depends on task-116. Built 2026-09-20, see
            docs/tasks/task-117-api-announcements.md.
      - [DONE] task-118 — UI: `/superAdmin/announcements` page (parent —
            split into 4 micro-tasks 2026-09-20, see docs/tasks/).
            Depends on task-117. All 4 children [DONE] as of
            2026-09-20 — parent auto-flipped per Rule 49.1 Rule 6.
          - [DONE] task-118a — list page + pagination. Needs task-117.
                Built 2026-09-20 (app/superAdmin/announcements/page.tsx,
                components/announcements/AnnouncementsList.tsx,
                lib/hooks/useAnnouncements.ts,
                app/styles/superAdminAnnouncements.css). Actions column
                is disabled stubs pending task-118b/c.
                docs/tasks/task-118a-ui-superadmin-announcements-list.md
          - [DONE] task-118b — create/edit form. Needs task-118a. Built
                2026-09-20 (components/announcements/AnnouncementForm.tsx,
                lib/hooks/useAnnouncementForm.ts,
                components/announcements/AnnouncementsList.tsx edited,
                app/styles/superAdminAnnouncements.css edited). Modal
                shell, not a routed page — matches this task's own
                "opens the form" wording.
                docs/tasks/task-118b-ui-superadmin-announcements-form.md
          - [DONE] task-118c — row actions (duplicate/deactivate/delete).
                Needs task-118a. Built 2026-09-20
                (lib/hooks/useAnnouncements.ts extended with
                duplicateAnnouncement/deactivateAnnouncement/
                deleteAnnouncement, components/announcements/
                AnnouncementsList.tsx edited — Delete goes through
                shared ConfirmationModal with 5-second delay, same
                pendingRowAction pattern as AdminManagementList.tsx;
                Duplicate/Deactivate fire directly, no modal, per
                this task's own DONE WHEN wording).
                docs/tasks/task-118c-ui-superadmin-announcements-actions.md
          - [DONE] task-118d — dashboard quick-action card. Needs
                task-118a. Built 2026-09-20
                (app/superAdmin/dashboard/page.tsx — added Megaphone
                "Announcements" entry to QUICK_ACTIONS, same shape as
                the Vault/Security Logs/Products entries).
                docs/tasks/task-118d-dashboard-announcements-card.md
      - [DONE] task-119 — API: `GET /api/superadmin/media` — lists
            existing Cloudflare R2 bucket objects (no new DB table).
            Paginated, filterable by folder prefix. Adds
            `listR2Objects()` to `services/r2.ts`. No dependency.
            Built 2026-09-20 (app/api/superadmin/media/route.ts).
            Cursor-based: ?folder=&cursor=&limit= -> { objects,
            nextCursor, folder, folders }. Only products/banners/
            avatars/orders folders are listable (allowlist) so
            database-backups/ and private buyer files stay hidden.
      - [DONE] task-120 — UI: `/superAdmin/media` page — grid of uploaded
            assets, search/filter by folder, "Copy URL" action per
            item. Depends on task-119.
            Built 2026-09-20: app/superAdmin/media/page.tsx,
            components/media/{MediaLibraryGrid,MediaLibraryCard,
            MediaLibraryToolbar}.tsx, lib/hooks/useMediaLibrary.ts,
            app/styles/superAdminMedia.css. "Load more" cursor
            paging; search filters loaded files only.
      - [DONE] task-121 — API: public product list/detail
            (/api/shop/products, /api/shop/products/[slug]),
            published + non-deleted only. Closes openFindings.md's
            2026-09-13 storefront-not-wired gap. No dependency.
      - [DONE] task-122 — UI: wire /shop and /pricing to task-121's
            API instead of static lib/productsData.ts. Depends on
            task-121.
      - [DONE] task-123 — API: enforce admin account lockout (5 fails/1h)
            in app/api/auth/login/route.ts — reuses the existing
            lib/adminAccountStatus.ts SecurityLog-count query as
            the actual gate. Closes openFindings.md's 2026-09-12
            display-only-lockout gap. No dependency.
      - [DONE] task-124 — SPLIT into task-126..131 below. Too large for a
            single item (12 route files ~688 lines + 6 section
            components ~1,034 lines across 6 categories = ~1,900+
            lines, 2+ layers). All 6 children below are [DONE]
            (2026-09-20) — parent auto-flipped per Rule 49.1 Rule 6.
      - [DONE] task-126 — UI: wire game-characters (section + [slug]
            page) to the live Product API. Depends on task-121.
            Built 2026-09-20: components/home/GameCharactersSection.tsx
            and app/(public)/game-characters/[slug]/page.tsx now fetch
            from /api/shop/products (client) and Prisma directly
            (server), instead of the static PRODUCTS catalog. New
            shared lib/hooks/useCategoryProducts.ts (reused by
            task-127..131). [slug]/page.tsx dropped
            generateStaticParams and is now force-dynamic. Also fixed
            a latent bug: GAME_CHARACTER_PRODUCT_TAGS was keyed by
            product.id, which only worked because the static catalog
            set id === slug — switched to product.slug so it survives
            DB-generated ids. See
            docs/tasks/task-126-ui-wire-game-characters.md.
      - [DONE] task-127 — UI: wire tshirts (section + [slug] page) to
            the live Product API. Depends on task-121.
            Built 2026-09-20: components/home/TShirtsSection.tsx and
            app/(public)/tshirts/[slug]/page.tsx now fetch from
            /api/shop/products (client, via task-126's shared
            lib/hooks/useCategoryProducts.ts) and Prisma directly
            (server), instead of the static PRODUCTS catalog.
            [slug]/page.tsx dropped generateStaticParams and is now
            force-dynamic. Carousel/story-callout content unchanged.
            See docs/tasks/task-127-ui-wire-tshirts.md.
      - [DONE] task-128 — UI: wire file-tools (section + [slug] page) to
            the live Product API. Depends on task-121.
            Built 2026-09-20: components/home/FileToolsSection.tsx and
            app/(public)/file-tools/[slug]/page.tsx now fetch from
            /api/shop/products (client, via task-126's shared
            lib/hooks/useCategoryProducts.ts) and Prisma directly
            (server), instead of the static PRODUCTS catalog.
            [slug]/page.tsx dropped generateStaticParams and is now
            force-dynamic. FeatureGrid content unchanged.
            See docs/tasks/task-128-ui-wire-file-tools.md.
      - [DONE] task-129 — UI: wire tutorials (section + [slug] page) to
            the live Product API. Depends on task-121.
            Built 2026-09-20: components/home/TutorialsSection.tsx and
            app/(public)/tutorials/[slug]/page.tsx now fetch from
            /api/shop/products (client, via task-126's shared
            lib/hooks/useCategoryProducts.ts) and Prisma directly
            (server), instead of the static PRODUCTS catalog.
            [slug]/page.tsx dropped generateStaticParams and is now
            force-dynamic. Also fixed a latent bug matching task-126's:
            TUTORIAL_COURSE_META (level/duration overlay data) was
            keyed by product.id, which only worked because the static
            catalog set id === slug — switched to product.slug so it
            survives DB-generated ids. See
            docs/tasks/task-129-ui-wire-tutorials.md.
      - [DONE] task-130 — UI: wire templates (section + [slug] page) to
            the live Product API. Depends on task-121.
            Built 2026-09-20: components/home/TemplatesSection.tsx and
            app/(public)/templates/[slug]/page.tsx now fetch from
            /api/shop/products (client, via task-126's shared
            lib/hooks/useCategoryProducts.ts) and Prisma directly
            (server), instead of the static PRODUCTS catalog.
            [slug]/page.tsx dropped generateStaticParams and is now
            force-dynamic. Comparison table/benefits/why-us/demo video
            (all static pricing/marketing content) unchanged. Confirmed
            lib/publicProduct.ts already includes `variants` in its
            mapped shape and ProductDetail.tsx's variant selector reads
            it unchanged — no special-casing needed for this category.
            See docs/tasks/task-130-ui-wire-templates.md.
      - [DONE] task-131 — UI: wire ai-videos (section + [slug] page) to
            the live Product API. Depends on task-121.
            Built 2026-09-20: components/home/AIVideosSection.tsx and
            app/(public)/ai-videos/[slug]/page.tsx now fetch from
            /api/shop/products (client, via task-126's shared
            lib/hooks/useCategoryProducts.ts) and Prisma directly
            (server), instead of the static PRODUCTS catalog.
            [slug]/page.tsx dropped generateStaticParams and is now
            force-dynamic. VideoCarousel/custom-callout content
            unchanged. Verified 2026-09-20 (build + admin CMS create/
            unpublish check). See docs/tasks/task-131-ui-wire-ai-videos.md.
      - [DONE] task-125 — Script: seed the Product table from the static
            lib/productsData.ts catalog (18 products) so /products
            isn't empty on a fresh DB. Depends on task-121.
            Built 2026-09-20: scripts/seedProducts.ts upserts all 18
            static-catalog products by slug (own DIRECT_URL Prisma
            Client + adapter, per Rule 37.2 — never services/prisma.ts's
            DATABASE_URL client), setting status: "published". Re-runnable,
            never duplicates, never touches admin-added/edited rows.
            Added npm run seed:products. Verified 2026-09-20 (18
            created on first run, 0 created/18 updated on re-run;
            /products and GET /api/shop/products both confirm 18).
            See docs/tasks/task-125-script-seed-products.md.
  - [ ] Phase 8 — Task Assignment, Customer Assignment, Notifications
        (Section 3.12/3.13, 9.2/9.4) — general Notifications (task-11-
        14) are done; Task/Customer Assignment specifically not yet
        audited.
  - [ ] Phase 9 — Analytics & Reporting (Section 9.5) — task-89-91
        built the Rule 41 aggregate traffic dashboard; Section 9.5's
        fuller revenue-trend + per-buyer export scope not yet audited.
  - [ ] Phase 10 — Remaining Hardening (IP allowlist, Section 9.1) —
        not yet built.

---

## PHASE 5 (remainder) — CATALOG & PRODUCT FEATURES

### [ ] 10. bulk_file_converter_and_pdf_renamer_specification.md
- [ ] task-49 — Read spec fully and break into schema/API/UI micro-tasks
      once this phase is picked up (not detailed yet — lower priority)

---

## PHASE 6 — SITEWIDE POLISH & PLATFORM HARDENING

### [~] 11. sitewide_technical_seo_specification.md
- [ ] task-50 — Sitemap/robots.txt
- [ ] task-51 — Global 404/error boundaries (Rule 31.10 pattern)
- [ ] task-52 — Idle session timeout (Rule 32.5) — apply per account layout
- [DONE] task-53 — Anonymized traffic analytics (Rule 41) — split into
      task-89/90/91, all closed 2026-09-08 (`PageViewDaily` schema,
      beacon/write path, super-admin Analytics dashboard).

### [ ] 12. additional_platform_gaps_specification.md
- [ ] task-54 — Coupons (needs Phase 1 checkout totals — already available)
- [ ] task-55 — Refund processing (needs Order.status — already available)
- [ ] task-56 — OAuth login
- [ ] task-57 — Buyer 2FA
- [ ] task-58 — Transactional emails
- [ ] task-59 — Shop filtering
- [ ] task-60 — Dev env setup docs

### [ ] 13. infra_ops_specification.md
- [ ] task-61 — CI/CD pipeline
- [ ] task-62 — Error tracking (Sentry)
- [ ] task-63 — Security headers / CSP
- [ ] task-64 — Blog CMS admin

---

## NOTES

- Task numbering continues from the highest existing file (`task-131`) —
  next new task file is `task-126`.
- `task-33` is listed under both item 6 (Vault) and item 7 (Gatekeeper)
  deliberately — it is one deliverable (Gatekeeper/Emergency Actions
  backend + viewer page) that closes gaps in two specs simultaneously.
  Build once, check off both.
- Per Rule 8A, work proceeds one (micro-)task at a time with a checkpoint
  after each. This file and the active overview file's CHANGE LOG (Rule
  45.5) are updated the same turn any task's status changes.
- Excluded from this plan (unchanged): `login_vault_page_secret_key_
  generation.md` (superseded design), `tier1_free_trial_subscription_
  specification.md` and `trial_tracking_and_developer_notifications_
  specification.md` (separate codebase), `villa-azure-agreement-v8-
  DRAFT-with-trial.txt` (contract, not a spec).
- Historical numbering-collision resolutions and the 2026-09-06 Step -1
  audit corrections: see docs/taskPlan.archive.md.
- Unresolved gaps/follow-ups (storefront not wired to Product DB,
  admin account lockout is display-only): see docs/openFindings.md.
