# Graph Report - .  (2026-06-13)

## Corpus Check
- 0 files · ~99,999 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 610 nodes · 1190 edges · 34 communities (26 shown, 8 thin omitted)
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 83 edges (avg confidence: 0.85)
- Token cost: 93,466 input · 3,854 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Backend API & Routes|Backend API & Routes]]
- [[_COMMUNITY_Frontend App Shell & Routing|Frontend App Shell & Routing]]
- [[_COMMUNITY_Auth & UI Component Library|Auth & UI Component Library]]
- [[_COMMUNITY_Device Cards & Status UI|Device Cards & Status UI]]
- [[_COMMUNITY_Shared UI Primitives|Shared UI Primitives]]
- [[_COMMUNITY_Database Schema & RLS Policies|Database Schema & RLS Policies]]
- [[_COMMUNITY_Flow Automation Selectors|Flow Automation Selectors]]
- [[_COMMUNITY_Backend Route Handlers & MQTT|Backend Route Handlers & MQTT]]
- [[_COMMUNITY_API Client & Demo Mode|API Client & Demo Mode]]
- [[_COMMUNITY_Frontend Dependencies|Frontend Dependencies]]
- [[_COMMUNITY_Household State Store|Household State Store]]
- [[_COMMUNITY_Hestia Product & Safety Concept|Hestia Product & Safety Concept]]
- [[_COMMUNITY_Backend Dependencies|Backend Dependencies]]
- [[_COMMUNITY_DeviceSummaryCard Design States|DeviceSummaryCard Design States]]
- [[_COMMUNITY_Device Safety State Design|Device Safety State Design]]
- [[_COMMUNITY_Countdown Phase Logic|Countdown Phase Logic]]
- [[_COMMUNITY_Onboarding & Branding Visuals|Onboarding & Branding Visuals]]
- [[_COMMUNITY_Open Graph Social Card|Open Graph Social Card]]
- [[_COMMUNITY_Responsive Phone Preview|Responsive Phone Preview]]
- [[_COMMUNITY_User Profiles Schema|User Profiles Schema]]
- [[_COMMUNITY_Local Settings Permissions|Local Settings Permissions]]
- [[_COMMUNITY_Favicon Logo Design|Favicon Logo Design]]
- [[_COMMUNITY_App Icon Set|App Icon Set]]
- [[_COMMUNITY_Flow Projects Config|Flow Projects Config]]
- [[_COMMUNITY_Event Label Helpers|Event Label Helpers]]
- [[_COMMUNITY_EmptyState Component|EmptyState Component]]
- [[_COMMUNITY_Countdown Formatter|Countdown Formatter]]
- [[_COMMUNITY_Push Subscriptions Table|Push Subscriptions Table]]
- [[_COMMUNITY_React Logo Asset|React Logo Asset]]
- [[_COMMUNITY_Vite Logo Asset|Vite Logo Asset]]

## God Nodes (most connected - your core abstractions)
1. `cx()` - 37 edges
2. `supabaseAdmin (service-role client)` - 17 edges
3. `useAuth()` - 15 edges
4. `logEvent()` - 14 edges
5. `useCan()` - 13 edges
6. `useSession()` - 13 edges
7. `Fastify App Bootstrap` - 13 edges
8. `logEvent (fire-and-forget audit log)` - 13 edges
9. `auth plugin (JWT authenticate)` - 13 edges
10. `requireDeviceAccess()` - 11 edges

## Surprising Connections (you probably didn't know these)
- `household_members table` --implements--> `Household model (many-to-many)`  [INFERRED]
  supabase/migrations/001_initial_schema.sql → docs/prd.md
- `devices table` --conceptually_related_to--> `Local safety logic (absence/warning/shutoff)`  [INFERRED]
  supabase/migrations/001_initial_schema.sql → docs/prd.md
- `household_members table` --implements--> `Roles & permissions (admin/member)`  [INFERRED]
  supabase/migrations/001_initial_schema.sql → docs/prd.md
- `devices table` --conceptually_related_to--> `DeviceSummaryCard preview route`  [INFERRED]
  supabase/migrations/001_initial_schema.sql → .playwright-mcp/page-2026-06-13T07-26-32-223Z.yml
- `join_requests table` --implements--> `NFC device pairing flow`  [INFERRED]
  supabase/migrations/001_initial_schema.sql → docs/prd.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Detect-Warn-Shutoff Safety Loop** — index_safety_loop, index_presence_detection, index_auto_shutoff, index_local_first [EXTRACTED 1.00]
- **Backend Request/Fetch/Push Architecture** — readme_api_routes, readme_upstream_service, readme_sse_events [EXTRACTED 1.00]

## Communities (34 total, 8 thin omitted)

### Community 0 - "Backend API & Routes"
Cohesion: 0.08
Nodes (38): requireDeviceAccess(), logEvent(), supabaseAdmin, supabaseAuth, makeRoleCheck(), devicesRoutes(), eventsRoutes(), paginationQuery (+30 more)

### Community 1 - "Frontend App Shell & Routing"
Cohesion: 0.06
Nodes (38): AppProviders(), AppShell(), AuthProvider(), DEMO_VALUE, RequireAuth(), RequireOnboarded(), PhoneFrame(), useIsWide() (+30 more)

### Community 2 - "Auth & UI Component Library"
Cohesion: 0.06
Nodes (58): AccountMenu, ApiError, api client, authHeader, AppProviders, AppShell, AuthContext / useAuth, AuthPage (+50 more)

### Community 3 - "Device Cards & Status UI"
Cohesion: 0.07
Nodes (44): CountdownReadout(), TONE_TEXT, DeviceCard(), Fact(), SURFACE, surfaceFor(), TONE, BADGE (+36 more)

### Community 4 - "Shared UI Primitives"
Cohesion: 0.08
Nodes (23): CenteredScreen(), AccountMenu(), EmptyState(), SafetySettings(), ApiError, cx(), actions, MODES (+15 more)

### Community 5 - "Database Schema & RLS Policies"
Cohesion: 0.07
Nodes (37): devices table, events table, household_members table, households table, join_requests table, set_updated_at trigger, timers table, devices RLS (unassigned readable, member update, admin delete) (+29 more)

### Community 6 - "Flow Automation Selectors"
Cohesion: 0.07
Nodes (34): characters, selectors, url, _description, gridArchitect, selectors, url, image-generation (+26 more)

### Community 7 - "Backend Route Handlers & MQTT"
Cohesion: 0.20
Nodes (33): auth plugin (JWT authenticate), requireDeviceAccess preHandler, Devices Routes, Supabase Env Config Resolver, logEvent (fire-and-forget audit log), Events Routes, Households Routes, Fastify App Bootstrap (+25 more)

### Community 8 - "API Client & Demo Mode"
Cohesion: 0.10
Nodes (23): api, authHeader(), realApi, request(), demoApi, devices, ev(), events (+15 more)

### Community 9 - "Frontend Dependencies"
Cohesion: 0.07
Nodes (28): dependencies, lucide-react, react, react-dom, react-router-dom, @supabase/supabase-js, vite-plugin-pwa, devDependencies (+20 more)

### Community 10 - "Household State Store"
Cohesion: 0.13
Nodes (22): HouseholdSwitcher(), useHousehold(), adaptDevice(), emit(), fetchDeviceWithTimers(), listeners, loadDeviceEvents(), loadHouseholdDevices() (+14 more)

### Community 11 - "Hestia Product & Safety Concept"
Cohesion: 0.13
Nodes (20): Automatic Stove Shutoff, Event History Log, Get Started / Early Access CTA, Hestia Landing Page, Hestia (Smart Stove Safety Product), Households & Roles (admin/member), Local-First Decision (on-device, not cloud), Tap to Pair (NFC) (+12 more)

### Community 12 - "Backend Dependencies"
Cohesion: 0.12
Nodes (16): dependencies, dotenv, fastify, @fastify/cors, fastify-plugin, mqtt, @supabase/supabase-js, web-push (+8 more)

### Community 13 - "DeviceSummaryCard Design States"
Cohesion: 0.14
Nodes (17): Card Header (Device Name + Status Badge), Design: Concentric Glow Glyph Tiles, Design: Semantic Color-Coded Status System, Design: Vertical State-Matrix Preview Layout, Device Name: Kitchen Stove, DeviceSummaryCard Component, Connectivity Indicator (Online/Offline dot), DeviceSummaryCard Preview Route (+9 more)

### Community 14 - "Device Safety State Design"
Cohesion: 0.15
Nodes (16): Design: Color-coded safety state system (green=safe, amber=warning, red=critical), DeviceSummaryCard Component, Device Title: 'Kitchen Stove', Online/Offline Indicator (colored dot + label), Presence Status Tile (people icon, Detected/Not detected label), Preview Header: 'DeviceSummaryCard preview — temporary route', DeviceSummaryCard Preview Screen, State: Attended (green badge, Stove On, Presence Detected) (+8 more)

### Community 15 - "Countdown Phase Logic"
Cohesion: 0.33
Nodes (6): PHASE_META, activeCountdown, computePhase, mockData DEVICES/EVENTS, adaptDevice, SummaryPreview

### Community 16 - "Onboarding & Branding Visuals"
Cohesion: 0.50
Nodes (5): Onboarding Splash / Branding Hero, Floating Stacked Cubes Logo Mark, Hestia Smart-Stove Safety App Brand, Hestia Hero Image (hero.png), Purple Gradient Minimalist Visual Style

### Community 17 - "Open Graph Social Card"
Cohesion: 0.70
Nodes (5): Claim: Warns on unattended lit stove, auto shuts off, on-device not cloud, UI Card: Kitchen Stove device (On, Presence Detected, Online), Hestia (Product/Brand), Hestia Open Graph Image, Tagline: The stove that watches itself

### Community 18 - "Responsive Phone Preview"
Cohesion: 0.50
Nodes (5): Blank White App Content Area, Caption: Phone preview - 390x844 - resize window narrow for real responsive app, Phone Device Mockup Frame (390x844), Responsive Mobile Preview Pattern, Hestia Phone Preview Screen

### Community 19 - "User Profiles Schema"
Cohesion: 1.00
Nodes (3): handle_new_user trigger, profiles table, profiles RLS (own-row select/update)

### Community 21 - "Favicon Logo Design"
Cohesion: 1.00
Nodes (3): App Favicon / Logo, Concentric Circle Rings, Blue Flame Emblem

### Community 22 - "App Icon Set"
Cohesion: 0.67
Nodes (3): Hestia Favicon, App Icon Set, Icon Sprite (icons.svg)

## Knowledge Gaps
- **148 isolated node(s):** `name`, `version`, `description`, `main`, `type` (+143 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cx()` connect `Shared UI Primitives` to `Household State Store`, `Device Cards & Status UI`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _162 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Backend API & Routes` be split into smaller, more focused modules?**
  _Cohesion score 0.08482142857142858 - nodes in this community are weakly interconnected._
- **Should `Frontend App Shell & Routing` be split into smaller, more focused modules?**
  _Cohesion score 0.061955965181771634 - nodes in this community are weakly interconnected._
- **Should `Auth & UI Component Library` be split into smaller, more focused modules?**
  _Cohesion score 0.05747126436781609 - nodes in this community are weakly interconnected._
- **Should `Device Cards & Status UI` be split into smaller, more focused modules?**
  _Cohesion score 0.06533575317604355 - nodes in this community are weakly interconnected._
- **Should `Shared UI Primitives` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._