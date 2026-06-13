# Graph Report - .  (2026-06-13)

## Corpus Check
- Corpus is ~39,310 words - fits in a single context window. You may not need a graph.

## Summary
- 474 nodes · 964 edges · 26 communities (19 shown, 7 thin omitted)
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 78 edges (avg confidence: 0.86)
- Token cost: 365,362 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Feature Components & Store|Feature Components & Store]]
- [[_COMMUNITY_Backend API Internals|Backend API Internals]]
- [[_COMMUNITY_Auth & Session Wiring|Auth & Session Wiring]]
- [[_COMMUNITY_Device Card UI Primitives|Device Card UI Primitives]]
- [[_COMMUNITY_Schema, RLS & Product Docs|Schema, RLS & Product Docs]]
- [[_COMMUNITY_Backend Services & Access Control|Backend Services & Access Control]]
- [[_COMMUNITY_Frontend Dependencies|Frontend Dependencies]]
- [[_COMMUNITY_App Shell Wiring|App Shell Wiring]]
- [[_COMMUNITY_Client Data Layer & Pages|Client Data Layer & Pages]]
- [[_COMMUNITY_Backend Dependencies|Backend Dependencies]]
- [[_COMMUNITY_Device Summary Preview (Design)|Device Summary Preview (Design)]]
- [[_COMMUNITY_Device Summary States (UI)|Device Summary States (UI)]]
- [[_COMMUNITY_Device Phase Logic|Device Phase Logic]]
- [[_COMMUNITY_Brand Hero Imagery|Brand Hero Imagery]]
- [[_COMMUNITY_Phone Preview Mockup|Phone Preview Mockup]]
- [[_COMMUNITY_Profiles & User Provisioning|Profiles & User Provisioning]]
- [[_COMMUNITY_Claude Permissions Config|Claude Permissions Config]]
- [[_COMMUNITY_App Icons & Favicon|App Icons & Favicon]]
- [[_COMMUNITY_Event Formatting Helpers|Event Formatting Helpers]]
- [[_COMMUNITY_Empty State Component|Empty State Component]]
- [[_COMMUNITY_Countdown Formatter|Countdown Formatter]]
- [[_COMMUNITY_Push Subscriptions Table|Push Subscriptions Table]]
- [[_COMMUNITY_React Logo Asset|React Logo Asset]]
- [[_COMMUNITY_Vite Logo Asset|Vite Logo Asset]]

## God Nodes (most connected - your core abstractions)
1. `cx()` - 37 edges
2. `supabaseAdmin (service-role client)` - 17 edges
3. `logEvent()` - 14 edges
4. `Fastify App Bootstrap` - 13 edges
5. `logEvent (fire-and-forget audit log)` - 13 edges
6. `auth plugin (JWT authenticate)` - 13 edges
7. `requireDeviceAccess()` - 11 edges
8. `makeRoleCheck()` - 11 edges
9. `Button()` - 11 edges
10. `useAuth()` - 11 edges

## Surprising Connections (you probably didn't know these)
- `Household model (many-to-many)` --implements--> `household_members table`  [INFERRED]
  docs/prd.md → supabase/migrations/001_initial_schema.sql
- `Local safety logic (absence/warning/shutoff)` --conceptually_related_to--> `devices table`  [INFERRED]
  docs/prd.md → supabase/migrations/001_initial_schema.sql
- `Roles & permissions (admin/member)` --implements--> `household_members table`  [INFERRED]
  docs/prd.md → supabase/migrations/001_initial_schema.sql
- `DeviceSummaryCard preview route` --conceptually_related_to--> `devices table`  [INFERRED]
  .playwright-mcp/page-2026-06-13T07-26-32-223Z.yml → supabase/migrations/001_initial_schema.sql
- `NFC device pairing flow` --implements--> `join_requests table`  [INFERRED]
  docs/prd.md → supabase/migrations/001_initial_schema.sql

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Auth & Access Control Flow** — auth_authPlugin, requireRole_makeRoleCheck, deviceAccess_requireDeviceAccess, supabase_admin [INFERRED 0.85]
- **Stove Command Dispatch Flow** — stoveControl_routes, mqtt_publishToDevice, events_logEvent, schema_devices_table [INFERRED 0.85]
- **Timer Lifecycle (create/cancel/expire)** — timers_routes, timerPoller_service, mqtt_publishToDevice, push_sendToUser, schema_timers_table [INFERRED 0.85]
- **Auth/session provider chain** — appproviders_AppProviders, authprovider_AuthProvider, sessionprovider_SessionProvider [INFERRED 0.85]
- **UI components driven by deviceState/computePhase** — devicecard_DeviceCard, devicesummarycard_DeviceSummaryCard, statusbadge_StatusBadge, statusblock_StatusBlock [INFERRED 0.85]
- **Route guard gating chain** — router_router, guards_RequireAuth, guards_RequireOnboarded [INFERRED 0.85]
- **Pages consuming the store data layer** — overviewPage_OverviewPage, deviceDetailPage_DeviceDetailPage, store_module [INFERRED 0.85]
- **Client auth/session/household context state** — authContext_AuthContext, sessionContext_SessionContext, householdContext_HouseholdContext [INFERRED 0.85]
- **Auth/onboarding pages calling api + supabase** — onboardingPage_OnboardingPage, pairPage_PairPage, api_api [INFERRED 0.85]
- **Household role/permission model** — 001_initial_schema_household_members, 002_rls_policies_rls_model, prd_roles_permissions [INFERRED 0.85]
- **NFC pairing & join-request flow** — prd_device_pairing_flow, 001_initial_schema_join_requests, 002_rls_policies_devices_policy [INFERRED 0.85]
- **Safety-state visual system** — design_state_color_map, design_state_not_color_alone, snapshot_devicesummarycard_preview [INFERRED 0.85]

## Communities (26 total, 7 thin omitted)

### Community 0 - "Feature Components & Store"
Cohesion: 0.06
Nodes (50): EmptyState(), EventList(), META, TONE, HouseholdSwitcher(), Logo(), SafetySettings(), PRESETS (+42 more)

### Community 1 - "Backend API Internals"
Cohesion: 0.10
Nodes (32): requireDeviceAccess(), logEvent(), supabaseAdmin, supabaseAuth, makeRoleCheck(), devicesRoutes(), eventsRoutes(), paginationQuery (+24 more)

### Community 2 - "Auth & Session Wiring"
Cohesion: 0.08
Nodes (28): AppProviders(), AppShell(), AuthProvider(), RequireAuth(), RequireOnboarded(), PhoneFrame(), useIsWide(), router (+20 more)

### Community 3 - "Device Card UI Primitives"
Cohesion: 0.09
Nodes (32): CenteredScreen(), AccountMenu(), CountdownReadout(), TONE_TEXT, DeviceCard(), Fact(), TONE, BADGE (+24 more)

### Community 4 - "Schema, RLS & Product Docs"
Cohesion: 0.07
Nodes (37): devices table, events table, household_members table, households table, join_requests table, set_updated_at trigger, timers table, devices RLS (unassigned readable, member update, admin delete) (+29 more)

### Community 5 - "Backend Services & Access Control"
Cohesion: 0.20
Nodes (33): auth plugin (JWT authenticate), requireDeviceAccess preHandler, Devices Routes, Supabase Env Config Resolver, logEvent (fire-and-forget audit log), Events Routes, Households Routes, Fastify App Bootstrap (+25 more)

### Community 6 - "Frontend Dependencies"
Cohesion: 0.07
Nodes (28): dependencies, lucide-react, react, react-dom, react-router-dom, @supabase/supabase-js, vite-plugin-pwa, devDependencies (+20 more)

### Community 7 - "App Shell Wiring"
Cohesion: 0.11
Nodes (29): AccountMenu, AppProviders, AppShell, useAuth/AuthContext, AuthProvider, CenteredScreen, CountdownReadout, DeviceCard (+21 more)

### Community 8 - "Client Data Layer & Pages"
Cohesion: 0.11
Nodes (29): ApiError, api client, authHeader, AuthContext / useAuth, AuthPage, Badge, Button, Card (+21 more)

### Community 9 - "Backend Dependencies"
Cohesion: 0.12
Nodes (16): dependencies, dotenv, fastify, @fastify/cors, fastify-plugin, mqtt, @supabase/supabase-js, web-push (+8 more)

### Community 10 - "Device Summary Preview (Design)"
Cohesion: 0.14
Nodes (17): Card Header (Device Name + Status Badge), Design: Concentric Glow Glyph Tiles, Design: Semantic Color-Coded Status System, Design: Vertical State-Matrix Preview Layout, Device Name: Kitchen Stove, DeviceSummaryCard Component, Connectivity Indicator (Online/Offline dot), DeviceSummaryCard Preview Route (+9 more)

### Community 11 - "Device Summary States (UI)"
Cohesion: 0.15
Nodes (16): Design: Color-coded safety state system (green=safe, amber=warning, red=critical), DeviceSummaryCard Component, Device Title: 'Kitchen Stove', Online/Offline Indicator (colored dot + label), Presence Status Tile (people icon, Detected/Not detected label), Preview Header: 'DeviceSummaryCard preview — temporary route', DeviceSummaryCard Preview Screen, State: Attended (green badge, Stove On, Presence Detected) (+8 more)

### Community 12 - "Device Phase Logic"
Cohesion: 0.33
Nodes (6): PHASE_META, activeCountdown, computePhase, mockData DEVICES/EVENTS, adaptDevice, SummaryPreview

### Community 13 - "Brand Hero Imagery"
Cohesion: 0.50
Nodes (5): Onboarding Splash / Branding Hero, Floating Stacked Cubes Logo Mark, Hestia Smart-Stove Safety App Brand, Hestia Hero Image (hero.png), Purple Gradient Minimalist Visual Style

### Community 14 - "Phone Preview Mockup"
Cohesion: 0.50
Nodes (5): Blank White App Content Area, Caption: Phone preview - 390x844 - resize window narrow for real responsive app, Phone Device Mockup Frame (390x844), Responsive Mobile Preview Pattern, Hestia Phone Preview Screen

### Community 15 - "Profiles & User Provisioning"
Cohesion: 1.00
Nodes (3): handle_new_user trigger, profiles table, profiles RLS (own-row select/update)

### Community 17 - "App Icons & Favicon"
Cohesion: 0.67
Nodes (3): Hestia Favicon, App Icon Set, Icon Sprite (icons.svg)

## Knowledge Gaps
- **108 isolated node(s):** `name`, `version`, `description`, `main`, `type` (+103 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cx()` connect `Device Card UI Primitives` to `Feature Components & Store`, `Auth & Session Wiring`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Why does `RoleContext/useCan` connect `App Shell Wiring` to `Client Data Layer & Pages`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **Why does `DeviceDetailPage` connect `Client Data Layer & Pages` to `App Shell Wiring`?**
  _High betweenness centrality (0.005) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `logEvent (fire-and-forget audit log)` (e.g. with `Background Services Degrade Gracefully` and `events table`) actually correct?**
  _`logEvent (fire-and-forget audit log)` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _119 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Feature Components & Store` be split into smaller, more focused modules?**
  _Cohesion score 0.05536568694463431 - nodes in this community are weakly interconnected._
- **Should `Backend API Internals` be split into smaller, more focused modules?**
  _Cohesion score 0.10412299091544375 - nodes in this community are weakly interconnected._