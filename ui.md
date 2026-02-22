# TrackMate — Complete UI & Design System Documentation

> Exhaustive reference for every visual element in the TrackMate codebase: colors, typography, themes, context providers, hooks, utilities, constants, routing, components, pages, buttons, cards, toggle switches, toasts, push notifications, email templates, animations, assets, offline UI, service worker, layout patterns, and dependencies.

---

## Table of Contents

1. [Brand Identity](#1-brand-identity)
2. [Color System](#2-color-system)
3. [Typography](#3-typography)
4. [Theming (Dark / Light)](#4-theming-dark--light)
5. [Design Tokens — CSS Variables](#5-design-tokens--css-variables)
6. [Utility Classes](#6-utility-classes)
7. [Animations & Transitions (20 keyframes)](#7-animations--transitions-20-keyframes)
8. [Icons (Lucide React)](#8-icons-lucide-react)
9. [Layout System & Responsive Breakpoints](#9-layout-system--responsive-breakpoints)
10. [Button Styles & Variants (15+)](#10-button-styles--variants-15)
11. [Card & Layout Patterns (11 types)](#11-card--layout-patterns-11-types)
12. [Toggle Switch Variants (3 types)](#12-toggle-switch-variants-3-types)
13. [Shared Components (14 total)](#13-shared-components-14-total)
14. [Pages (15 total)](#14-pages-15-total)
15. [Toast Notifications](#15-toast-notifications)
16. [Push Notifications (Web Push / VAPID)](#16-push-notifications-web-push--vapid)
17. [Email Templates (3 templates)](#17-email-templates-3-templates)
18. [Offline / PWA UI](#18-offline--pwa-ui)
19. [Service Worker (`sw.js`)](#19-service-worker-swjs)
20. [Loading & Progress UI (6 patterns)](#20-loading--progress-ui-6-patterns)
21. [App Architecture & Routing](#21-app-architecture--routing)
22. [Context Providers (2)](#22-context-providers-2)
23. [Custom Hooks (4)](#23-custom-hooks-4)
24. [Utility Modules (6)](#24-utility-modules-6)
25. [Constants (2 files)](#25-constants-2-files)
26. [NPM Dependencies (17 runtime + 5 dev)](#26-npm-dependencies-17-runtime--5-dev)
27. [Image & Logo Assets (24+ files)](#27-image--logo-assets-24-files)
28. [CSS Class Prefix Conventions](#28-css-class-prefix-conventions)
29. [Accessibility Notes](#29-accessibility-notes)

---

## 1. Brand Identity

| Property | Value |
|----------|-------|
| **App Name** | TrackMate |
| **Tagline** | "Smart Campus Bus Tracking" |
| **Primary Brand Color** | `#FF6B2C` (vibrant orange) |
| **Logo (Horizontal SVG)** | `public/logohorigental.svg` — 2816×1536 embedded PNG in SVG wrapper |
| **Logo (Horizontal PNG)** | `public/logohorigental.png` |
| **Logo (Vertical SVG)** | `public/logo vertical.svg` |
| **Logo (Vertical PNG)** | `public/logo vertical.png` |
| **Email Logo** | `public/email-logo.png` — used in all 3 outbound email templates |
| **Badge** | `public/badge.png` |
| **Favicon (.ico)** | `public/favicons/favicon.ico` |
| **Favicon (16×16)** | `public/favicons/favicon-16x16.png` |
| **Favicon (32×32)** | `public/favicons/favicon-32x32.png` |
| **Apple Touch Icon** | `public/favicons/apple-touch-icon.png` |
| **PWA Icon (192)** | `public/icon-192.png` + `public/favicons/android-chrome-192x192.png` |
| **PWA Icon (512)** | `public/icon-512.png` + `public/favicons/android-chrome-512x512.png` |
| **Manifest theme_color** | `#FF6B2C` |
| **Manifest background_color** | `#0f172a` |
| **Production URL** | `https://trackmaterce.onrender.com/` |

---

## 2. Color System

### 2.1 Primary Brand Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-primary` | `#6366f1` | Indigo — focus rings, admin stat card accents |
| `--color-primary-dark` | `#4f46e5` | Darker hover variant |
| `--color-primary-light` | `#818cf8` | Lighter variant |

### 2.2 Accent / Action Colors

| Token / Hardcoded | Hex | Usage |
|-------------------|-----|-------|
| `--color-accent` | `#f97316` | Orange secondary accent |
| `--color-accent-dark` | `#ea580c` | Deeper orange |
| **Brand Orange** | `#FF6B2C` | Primary CTA buttons, login hero, progress bars, avatar gradients, toggle switches, stepper active, notification test button |
| **Brand Orange Dark** | `#e05515` / `#e85d1b` | Gradient endpoints for buttons & decorative bars |
| `--color-success` | `#10b981` | Green — success states, driver call button, GPS indicator |
| `--color-warning` | `#f59e0b` | Amber — warnings, SOS button |
| `--color-danger` | `#ef4444` | Red — errors, SOS modals, delete actions, broadcast button |
| **Green Live** | `#22c55e` | Notification status dot, review icon ring, route timeline start |
| **Emerald** | `#34d399` | Driver call icon, GPS indicator text |

### 2.3 Dark Theme (Default)

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-bg` | `#0f172a` | Page background (slate-900) |
| `--color-surface` | `#1e293b` | Card / surface background (slate-800) |
| `--color-surface-alt` | `#334155` | Alternate surface (slate-700) |
| `--color-border` | `rgba(255,255,255,0.1)` | Subtle borders |
| `--color-text` | `#f8fafc` | Primary text (near-white) |
| `--color-text-secondary` | `#94a3b8` | Secondary text (slate-400) |
| `--color-text-muted` | `#64748b` | Muted text (slate-500) |
| Deep BG | `#0a0f1a` / `#0a0f1e` | Route Wizard, Driver Dashboard, 404 backgrounds |

### 2.4 Light Theme (`[data-theme="light"]`)

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-bg` | `#f8fafc` | Page background (slate-50) |
| `--color-surface` | `#ffffff` | Card / surface |
| `--color-surface-alt` | `#f1f5f9` | Alternate surface (slate-100) |
| `--color-border` | `rgba(0,0,0,0.1)` | Subtle borders |
| `--color-text` | `#0f172a` | Primary text (slate-900) |
| `--color-text-secondary` | `#475569` | Secondary (slate-600) |
| `--color-text-muted` | `#64748b` | Muted (slate-500) |

### 2.5 Role Badge Colors

| Role | Light BG | Light Text | Dark BG | Dark Text |
|------|----------|------------|---------|-----------|
| Admin | `#f3e8ff` | `#7c3aed` | `rgba(124,58,237,0.15)` | `#a78bfa` |
| Driver | `#d1fae5` | `#059669` | `rgba(5,150,105,0.15)` | `#34d399` |
| Student | `#fef3c7` | `#d97706` | `rgba(255,107,44,0.15)` | `#fb923c` |
| Default | `#f1f5f9` | `#64748b` | `rgba(100,116,139,0.15)` | `#94a3b8` |

### 2.6 Email Template Colors

| Element | Color |
|---------|-------|
| Header gradient | `linear-gradient(135deg, #F57C00, #FF9800, #FFB74D)` |
| CTA button | `linear-gradient(135deg, #F57C00, #FF9800)` |
| Body background | `#F5F5F5` |
| Card background | `#FFFFFF` |
| Detail card | `#FFF8F0` with `#FFE0B2` border |
| Security banner | `#FFF3E0` with `#F57C00` left border |
| Text primary | `#2D2D2D` |
| Text secondary | `#555` / `#666` |

---

## 3. Typography

| Property | Value |
|----------|-------|
| **Font (App)** | `'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif` |
| **Font (Email)** | `'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif` |
| **Font (Debug Log)** | `'JetBrains Mono', 'Fira Code', monospace` |
| **Font (TrackSelector)** | `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif` |
| **Font (Stop Coords)** | `'SF Mono', 'Consolas', monospace` |
| **Font Smoothing** | `-webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale` |
| **Selection** | Text `#fff`, Background `#FF6B2C` |

### Heading / Text Sizes

| Context | Size | Weight | Spacing |
|---------|------|--------|---------|
| Login Hero Title | `2rem` | 800 | `-0.025em` |
| Login Card Title | `1.55rem` | 700 | `-0.02em` |
| 404 Code ("4_4") | `5rem`→`7rem` | 800 | `-0.04em` |
| Student ETA Value | `2.5rem`→`3.25rem` | 800 | `-0.02em` |
| Profile Name | `1.45rem` | 700 | `-0.02em` |
| Driver Dashboard Name | `1.25rem` | 700 | — |
| TrackSelector Title | `1.6rem` | 800 | — |
| Section Title (uppercase) | `0.78rem`–`0.8125rem` | 600 | `0.06em`–`0.07em` |
| Stat Label (uppercase) | `0.6875rem` | — | `0.04em`–`0.06em` |
| Body text | `0.875rem`–`0.9375rem` | 400–500 | — |
| Muted / Sub | `0.75rem` | — | — |

---

## 4. Theming (Dark / Light)

Dark-first — dark theme is the default.

### Toggle Mechanism (`context/ThemeContext.jsx`)

- **localStorage key**: `trackmate-theme` (value: `"dark"` or `"light"`)
- **Theme application**: Sets both `data-theme` attribute AND class on `<html>` element
- **Provider**: `ThemeProvider` wraps the entire app in `main.jsx`
- **Hook**: `useTheme()` returns `{ theme, setTheme, toggleTheme, isDark, isLight }`
- **Safe defaults**: Returns `{ theme:'dark', isDark:true }` when used outside provider
- **UI toggle**: Sun/Moon icons in Navbar header + mobile drawer

### CSS Override Strategy

Every page's CSS follows the same pattern:

1. Dark theme styles as default
2. `[data-theme="light"]` selector overrides for each element
3. Login page also uses explicit `[data-theme="dark"]` + `body:not([data-theme])` for dark-by-default

---

## 5. Design Tokens — CSS Variables

```css
:root {
  --color-primary: #6366f1;
  --color-primary-dark: #4f46e5;
  --color-primary-light: #818cf8;
  --color-accent: #f97316;
  --color-accent-dark: #ea580c;
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-danger: #ef4444;
  --color-bg: #0f172a;
  --color-surface: #1e293b;
  --color-surface-alt: #334155;
  --color-border: rgba(255,255,255,0.1);
  --color-text: #f8fafc;
  --color-text-secondary: #94a3b8;
  --color-text-muted: #64748b;
}
```

---

## 6. Utility Classes

Defined inside `@layer utilities` in `index.css`:

| Class | Purpose |
|-------|---------|
| `.safe-top` | `padding-top: env(safe-area-inset-top)` |
| `.safe-bottom` | `padding-bottom: env(safe-area-inset-bottom)` |
| `.safe-left` / `.safe-right` | Horizontal safe area padding |
| `.no-scrollbar` | Hides scrollbar on all browsers |
| `.glass` | Glassmorphism: `rgba(30,41,59,0.8)` + `backdrop-filter: blur(20px)` + border |
| `.glass-light` | Light variant: `rgba(255,255,255,0.85)` + blur |
| `.glass-strong` | Stronger: `rgba(30,41,59,0.95)` + deeper blur |
| `.animate-fade-in` | Fade-in opacity 0→1, `0.3s` |
| `.animate-slide-up` | Slide up 20px + fade, `0.35s` |
| `.animate-scale-in` | Scale 0.95→1 + fade, `0.25s` |
| `.animate-pulse-dot` | Pulsing scale 1→1.5→1, `2s` infinite |
| `.map-container` | Full-width, rounded corners, overflow hidden |

### Global Input Styles

All `<input>`, `<textarea>`, `<select>`:

- Background: `var(--color-surface)`, Border: `var(--color-border)`, `0.5rem` radius
- Focus: `box-shadow: 0 0 0 3px rgba(99,102,241,0.15)` + `border: var(--color-primary)`

---

## 7. Animations & Transitions (20 keyframes)

### All Keyframe Animations

| # | Name | Description | Duration | Easing | Loop |
|---|------|-------------|----------|--------|------|
| 1 | `fadeIn` | Opacity 0→1 | 0.3s | ease-out | once |
| 2 | `slideUp` | TranslateY(20px)→0 + opacity | 0.35s | ease-out | once |
| 3 | `scaleIn` | Scale(0.95)→1 + opacity | 0.25s | ease-out | once |
| 4 | `pulseDot` | Scale 1→1.5→1 | 2s | ease-in-out | ∞ |
| 5 | `spin` | Rotate 0→360° | 0.8s | linear | ∞ |
| 6 | `tmLoaderFade` | Loader entrance opacity+scale | 0.5s | ease-out | once |
| 7 | `tmRingPulse` | Pulsing ring around loader bus icon | 2s | cubic-bezier | ∞ |
| 8 | `tmDotsWave` | Loading dots bounce | 1.2s | ease-in-out | ∞ |
| 9 | `loginCardIn` | Card translateY(18px)→0 + scale(0.98)→1 | 0.45s | cubic-bezier(0.22,1,0.36,1) | once |
| 10 | `profileCardIn` | Card translateY(16px)→0 | 0.5s | cubic-bezier(0.22,1,0.36,1) | once |
| 11 | `sdCardIn` | Student dashboard card entrance | 0.5s | cubic-bezier(0.22,1,0.36,1) | once |
| 12 | `sdPulse` | Live dot pulse scale 1→1.5 | 2s | ease-in-out | ∞ |
| 13 | `sdFadeIn` | Modal overlay fade-in | 0.2s | ease-out | once |
| 14 | `sd-notif-pulse` | Notification status dot opacity pulse 1→0.5→1 | 2s | ease-in-out | ∞ |
| 15 | `rw-fade` | Route wizard step content translateY(8px)→0 | 0.3s | ease | once |
| 16 | `ddFadeIn` | Driver dashboard card entrance translateY(12px)→0 | 0.45s | cubic-bezier(0.22,1,0.36,1) | once |
| 17 | `ddPulse` | Driver live dot box-shadow pulse | 2s | ease-in-out | ∞ |
| 18 | `nf-fade-up` | 404 page container translateY(20px)→0 + opacity | 0.6s | ease | once |
| 19 | `nf-float` (alias `nfFloat`) | 404 page bus icon floating Y(0→-6px→0) | 3s | ease-in-out | ∞ |
| 20 | `nf-glow` (alias `nfGlow`) | 404 icon ring glow pulse | 2s | ease-in-out | ∞ |

### Common CSS Transitions

| Target | Transition |
|--------|-----------|
| Buttons | `all 0.2s ease` |
| Primary CTA hover | `transform 0.15s, box-shadow 0.25s` |
| Progress bars | `width 0.5s ease` |
| Toggle switches | `background 0.25s–0.3s` / thumb `transform 0.25s–0.3s cubic-bezier(0.4,0,0.2,1)` |
| Nav dropdowns | `max-height 0.35s ease, opacity 0.35s ease` |
| Cards hover | `transform 0.2s, box-shadow 0.2s` |
| Debug chevron | `transform 0.3s` |

### Staggered Card Entrance Delays

Student stat cards use `sdCardIn` with increasing `animation-delay`:

- Card 1: `0.08s` | Card 2: `0.12s` | Card 3: `0.16s` | Card 4: `0.20s`

---

## 8. Icons (Lucide React)

All icons from `lucide-react` (`v0.561.0`).

| Page / Component | Icons Used |
|------------------|-----------|
| **Navbar** | `Sun`, `Moon`, `Menu`, `X`, `ChevronDown`, `User`, `LogOut`, `Settings`, `Home`, `Map`, `Users`, `Bus`, `Bell` |
| **Login** | `Eye`, `EyeOff`, `Loader2`, `LogIn`, `CheckCircle`, `X`, `KeyRound`, `MapPin`, `Shield`, `Bell` |
| **AdminDashboard** | `Users`, `Bus`, `Activity`, `AlertTriangle`, `RefreshCw`, `Trash2`, `ChevronRight`, `Map`, `Download`, `Octagon` |
| **StudentDashboard** | `MapPin`, `Navigation`, `Bell`, `BellOff`, `RefreshCw`, `Phone`, `Volume2`, `VolumeX`, `Settings`, `X`, `AlertTriangle`, `ArrowRight` |
| **DriverDashboard** | `Play`, `Square`, `MapPin`, `Wifi`, `WifiOff`, `Navigation`, `AlertTriangle`, `Radio`, `Users`, `Gauge`, `Trash2`, `Send`, `RotateCcw`, `Terminal`, `ChevronDown`, `Zap`, `Satellite`, `Activity` |
| **ManageStudents** | `Plus`, `Edit2`, `Trash2`, `Users`, `CheckSquare`, `Square`, `MousePointerClick`, `Upload`, `Download`, `Search`, `Filter`, `X`, `ChevronDown` |
| **ManageRoutes** | `Trash2`, `Navigation`, `MapPin`, `Copy`, `RotateCcw`, `Route`, `Clock`, `Edit3`, `Layers`, `ChevronRight`, `ChevronLeft`, `Check`, `Milestone`, `PenTool`, `ClipboardCheck` |
| **ManageStops** | `Octagon`, `Plus`, `Edit2`, `Trash2`, `MapPin`, `Clock`, `Navigation`, `ChevronDown` |
| **AssignStudents** | `MapPin`, `Users`, `Bus`, `Search`, `X`, `Edit2`, `Trash2`, `UserPlus`, `CheckCircle`, `AlertCircle`, `ChevronDown`, `Plus` |
| **NotFound** | `Home`, `ArrowLeft` |
| **MapEditor** | `ArrowUp`, `ArrowDown`, `Trash2`, `GripVertical`, `MapPin`, `X` |
| **Drawer** | `X` |

---

## 9. Layout System & Responsive Breakpoints

### Breakpoints

| Min Width | Key Changes |
|-----------|-------------|
| < 640px | Mobile-first, bottom nav visible, compact padding |
| ≥ 640px | Wider padding & gaps |
| ≥ 768px | Bottom nav hides, desktop nav active, map heights increase |
| ≥ 900px | Route wizard step 1: 2-column grid |
| ≥ 1024px | 2-column dashboard grids, login split panel |
| ≥ 1280px | Max width caps |

### Container Max-Widths

| Context | Max Width |
|---------|-----------|
| Student Dashboard | `680px` (mobile) → `1140px` (lg) |
| Profile | `540px` (mobile) → `920px` (lg) |
| Login Card | `420px` |
| Driver Dashboard | `1200px` |
| Route Wizard Stepper | `640px` max |
| Route Wizard Sidebar | `360px` fixed |
| TrackSelector Card | `420px` |
| 404 Page Container | `480px` |

### Safe Area Support (PWA)

`env(safe-area-inset-*)` for notched devices — top header, bottom nav, left/right landscape.

---

## 10. Button Styles & Variants (15+)

### Global Primary CTA (Login / Profile Save / Track)

```css
background: linear-gradient(135deg, #FF6B2C, #e05515);
color: #fff; border-radius: 0.8rem; padding: 0.85rem;
font-weight: 700; box-shadow: 0 4px 15px rgba(255,107,44,0.3);
/* Hover: translateY(-2px), stronger shadow */
```

### Full Button Catalog

| Variant | Background | Text | Border | Shadow | Context |
|---------|-----------|------|--------|--------|---------|
| **Primary CTA** | `gradient(#FF6B2C→#e05515)` | `#fff` | none | `0 4px 15px orange/0.3` | Login, Save, Track |
| **nf-btn-primary** | `gradient(#FF6B2C→#e85d1b)` | `#fff` | none | `0 4px 14px orange/0.3` | 404 Home |
| **nf-btn-secondary** | `rgba(255,255,255,0.06)` | `#94a3b8` | `rgba(255,255,255,0.1)` | — | 404 Go Back |
| **rw-btn-primary** | `gradient(#FF6B2C→#e85d1b)` | `#fff` | none | `0 4px 14px orange/0.25` | Route wizard Next/Save |
| **rw-btn-outline** | `rgba(255,255,255,0.04)` | `#94a3b8` | `rgba(255,255,255,0.1)` | — | Route wizard secondary |
| **rw-btn-ghost** | `none` | `#64748b` | none | — | Route wizard cancel |
| **dd-btn-start** | `gradient(#FF6B2C→#e05515)` | `#fff` | none | `0 4px 20px orange/0.35` | Start Trip |
| **dd-btn-end** | `rgba(239,68,68,0.15)` | `#f87171` | `rgba(239,68,68,0.2)` | — | End Trip |
| **dd-btn-sos** | `rgba(245,158,11,0.15)` | `#fbbf24` | `rgba(245,158,11,0.2)` | — | SOS Alert |
| **dd-btn-broadcast** | `#ef4444` | `#fff` | none | — | SOS Broadcast (700 weight, 0.06em spacing) |
| **dd-btn-ghost** | `rgba(255,255,255,0.05)` | `#f1f5f9` | none | — | Modal cancel |
| **dd-btn-clear** | `rgba(255,255,255,0.03)` | `#64748b` | `rgba(255,255,255,0.05)` | — | Clear logs |
| **sd-action-primary** | `rgba(255,107,44,0.12)` | `#FF6B2C` | none | — | Quick action (Notify) |
| **sd-action-default** | `rgba(255,255,255,0.04)` | `#cbd5e1` | none | — | Quick action (Settings) |
| **sd-action-danger** | `rgba(239,68,68,0.12)` | `#f87171` | none | — | Quick action (SOS) |
| **sd-notif-test-btn** | `rgba(255,107,44,0.08)` | `#FF6B2C` | `rgba(255,107,44,0.18)` | — | Test notification |
| **TrackingControls Start** | `gradient(emerald-500→lime-500)` | `#fff` | none | `shadow-emerald/0.3` | Inline start trip |
| **TrackingControls End** | `gradient(rose-500→amber-500)` | `#fff` | none | `shadow-rose/0.3` | Inline end trip |
| **NotificationToggle On** | `bg-emerald-600` | `#fff` | none | `focus:ring-emerald` | Disable notifs |
| **NotificationToggle Off** | `bg-slate-900` | `#fff` | none | `focus:ring-slate` | Enable notifs |

### Active / Disabled States

- **Active press**: `transform: scale(0.95–0.97)`
- **Disabled**: `opacity: 0.5; cursor: not-allowed`
- **Hover (primary)**: `translateY(-1px to -2px)`, deeper box-shadow

---

## 11. Card & Layout Patterns (11 types)

| Card Type | Background | Border | Radius | Usage |
|-----------|-----------|--------|--------|-------|
| **Glass** | `rgba(30,41,59,0.8)` + `blur(20px)` | `rgba(255,255,255,0.1)` | varies | Navbar, overlays |
| **Surface** | `#1e293b` | `rgba(255,255,255,0.06)` | `1rem` | Stat cards |
| **dd-card** | `rgba(30,41,59,0.65)` + `blur(12px)` | `rgba(255,255,255,0.06)` | `14px` | Driver dashboard |
| **rw-card** | `gradient(slate-800→slate-900)` + blur | `rgba(255,255,255,0.06)` | `1.25rem` | Route wizard |
| **sd-hero** | `gradient(slate-800/90→slate-900/95)` | `rgba(255,107,44,0.15)` | `1.5rem` | Student hero ETA |
| **sd-notif-card** | `gradient(slate-800→slate-900)` + `blur(12px)` | `rgba(255,255,255,0.06)` | `1.25rem` | Notification control |
| **sd-events-card** | `#1e293b` | `rgba(255,255,255,0.06)` | `1rem` | Events timeline |
| **sd-driver-card** | `#1e293b` | `rgba(255,255,255,0.06)` | `1rem` | Driver info |
| **Login card** | `#fff` | subtle | `1.25rem` | Auth form |
| **BusCard** | `bg-white` | `border-slate-200` | rounded | Simple bus display |
| **Toast card** | `bg-white` | colored border | `rounded-2xl` | Notifications |
| **TrackSelector** | `rgba(30,41,59,0.85)` + `blur(16px)` | `rgba(255,255,255,0.08)` | `1.25rem` | Bus selector |

### Grid Patterns

| Pattern | Columns | Gap | Usage |
|---------|---------|-----|-------|
| 2×2 stat grid | `1fr 1fr` | `0.75rem` | Student stats |
| 4-column actions | `repeat(4, 1fr)` | `0.5rem` | Quick actions |
| 2-column stats | `1fr 1fr` | `0.625rem` | Driver system status |
| 2-column form | `1fr 1fr` | `1rem` | Route wizard step 1 |
| Desktop 2-col (SD) | `1.2fr 1fr` | `1.25rem` | Student dashboard |
| Desktop 2-col (DD) | `1fr 1.3fr` | `1.25rem` | Driver dashboard |

---

## 12. Toggle Switch Variants (3 types)

| Variant | Width × Height | Track Off | Track On | Thumb | Transition | Usage |
|---------|---------------|-----------|----------|-------|-----------|-------|
| **sd-notif-toggle** | `2.75rem × 1.5rem` | `#334155` | `#FF6B2C` | `1.25rem` circle, translateX(1.25rem) | `0.25s ease` | Student notification |
| **dd-toggle** | `3.25rem × 1.875rem` | `#334155` | `#FF6B2C` | `1.375rem` circle, translateX(1.375rem) | `0.3s cubic-bezier(0.4,0,0.2,1)` | Driver simulation |
| **sd-toggle** (settings) | Similar to sd-notif-toggle | `#334155` | `#FF6B2C` | circle | `0.25s` | Student settings modal |

Light theme: Track off changes to `#cbd5e1`. Track on stays `#FF6B2C`.

---

## 13. Shared Components (14 total)

### 13.1 TrackMateLoader (`components/TrackMateLoader.jsx`)

Full-screen loader during auth checks:

- **Background**: `#0f172a` (dark) / `#f8fafc` (light), full viewport
- **Bus icon**: `/markers/bus.png` (48×48) inside pulsing ring (`#FF6B2C` border, `tmRingPulse` 2s ∞)
- **Text**: "TrackMate" title + "Smart Campus Bus Tracking" subtitle
- **Loading dots**: 3 bouncing dots (`tmDotsWave` staggered 0s/0.15s/0.3s)

### 13.2 Navbar (`components/Navbar.jsx`)

- **Header** (`.nav-header`): Fixed top, glassmorphism, 64px height
- **Logo**: Brand image, 38px height
- **Desktop Nav Links**: Horizontal, underline animation on hover
- **Icon Buttons**: 40×40 circle, hover ring effect
- **Theme Toggle**: Sun (light) / Moon (dark) icons
- **Profile Dropdown**: Glass bg, smooth `max-height` transition, avatar + role badge
- **Mobile Drawer**: Full-screen overlay, slide-in right, 280px
- **Bottom Nav** (`.nav-bottom`): Fixed bottom, mobile only (<768px), 5 icon+label items
- **Role-based Links**: Admin gets 5 management links, Student/Driver get Dashboard, all get Profile
- **Navbar hidden on**: `/login` and `/track/*` routes (controlled in `App.jsx`)

### 13.3 Toast (`components/Toast.jsx`)

Custom toast component (separate from `react-hot-toast`):

- **Position**: Fixed bottom-right, `z-999`, `pointer-events-none` container
- **Card**: `min-w-[240px] max-w-sm`, `rounded-2xl`, white bg, `shadow-lg`
- **Types**: `success` → emerald border, `warning` → amber, `info` → slate, `error` → red
- **Content**: Title (`font-semibold text-slate-900`) + optional message (`text-xs text-slate-600`)
- **Dismiss**: "x" button, `aria-label="Dismiss notification"`
- **Accessibility**: `role="region" aria-live="polite"`

### 13.4 NotificationToggle (`components/NotificationToggle.jsx`)

Push notification enable/disable card:

- **Card**: `rounded-2xl`, white bg, `shadow-sm`, `border-slate-200`
- **Permission display**: Shows browser permission status text
- **Button**: Full-width `rounded-full`, `py-3`, green (enabled) / dark (disabled)

### 13.5 Drawer (`components/Drawer.jsx`)

Reusable centered modal/drawer:

- **Backdrop**: `bg-slate-950/80`, `backdrop-blur-sm`, 300ms fade
- **Modal**: `bg-slate-900`, `border-white/10`, `rounded-2xl`, `shadow-2xl`, max-w `lg`, max-h `90vh`
- **Header**: Title + subtitle + close (X icon), `border-b border-white/10`
- **Content**: Scrollable `overflow-y-auto`
- **Footer**: Optional, `border-t border-white/10`
- **Accessibility**: `aria-label={title}`, click-outside to close

### 13.6 ConfirmDialog (`components/ConfirmDialog.jsx`)

- **Overlay**: `rgba(0,0,0,0.5)` + `backdrop-filter: blur(4px)`
- **Dialog**: `var(--color-surface)`, `1rem` rounded, centered
- **Buttons**: Cancel (ghost) + Confirm (danger red gradient)

### 13.7 BusCard (`components/BusCard.jsx`)

- **Style**: White bg, `border-slate-200`, rounded, `shadow-sm`
- **Content**: Bus name (h3), number plate, route, driver
- **Action**: "Manage" button with `bg-brand`

### 13.8 AdminMap (`components/AdminMap.jsx`)

- **Tile**: OpenStreetMap, **Bus icon**: `/markers/bus.png` (36×36), **Stop icon**: `/markers/stop.png`
- Uses `react-leaflet` (MapContainer, TileLayer, Marker, Popup, Polyline)

### 13.9 StudentMap (`components/StudentMap.jsx`)

- Animated bus marker with smooth transitions, Route polyline `#FF6B2C`, Stop markers + popups, FitBounds auto

### 13.10 DriverMap (`components/DriverMap.jsx`)

- **Bus icon**: `/markers/bus.png` (40×40), **Stop icon**: `/markers/stop.png` (30×30)
- **Route polyline**: `color="#ff6b2c"`, `weight={5}`, `opacity={0.8}`
- **LiveViewport**: Auto-centers map on driver position

### 13.11 MapView (`components/MapView.jsx`)

- Simple bus + stop map, 320px height, default center Hyderabad (17.385, 78.4867)

### 13.12 MapEditor (`components/MapEditor.jsx`)

577-line interactive route editor:

- `react-leaflet` + `leaflet.pm` for polyline/marker drawing tools
- Drag-and-drop stop reordering via `@dnd-kit/core` + `@dnd-kit/sortable`
- **SortableStopRow**: Draggable rows with move up/down/delete buttons
- **StopNameModal**: Custom modal for naming each stop
- **Stop icon**: `/markers/stop.png` (30×30)

### 13.13 TrackingControls (`components/TrackingControls.jsx`)

- **Start Trip**: `gradient(emerald-500→lime-500)`, full width, `text-xl font-bold`
- **End Trip**: `gradient(rose-500→amber-500)`, full width
- **Status badges**: Green active pill / gray inactive
- **Stats grid**: Socket status, GPS permission, tracking state, buffer size, pings sent
- **Last position**: Coordinates, accuracy, speed, heading, timestamp

### 13.14 ProtectedRoute / PublicRoute (`components/ProtectedRoute.jsx`)

- `ProtectedRoute`: Accepts `roles` array, shows TrackMateLoader while checking auth, redirects to `/login` if unauthenticated
- `PublicRoute`: Redirects to role dashboard if already authenticated

---

## 14. Pages (15 total)

### 14.1 Login (`pages/Login.jsx`)

**Split-screen on ≥1024px:**

- **Left** (`.login-hero-panel`): Orange gradient `135deg #FF6B2C→#c2410c`, animated floating circles (3 decorative), logo, title, feature pills ("Live GPS", "Alerts", "Secure"), bus illustration
- **Right** (`.login-form-panel`): Auth card with `loginCardIn` animation
- **Auth Card**: Email/password fields, toggle Login↔Register, forgot password modal with email input
- **First Login**: Auto-redirects to `/profile` for password change

### 14.2 Admin Dashboard (`pages/AdminDashboard.jsx`)

- **StatCard** (4 KPIs): Students, Drivers, Active Trips, Events — colored icon circles (indigo, emerald, amber, rose)
- **TripCard**: Bus number, driver, status
- **EventItem**: System events with icons
- **QuickLink**: Navigation shortcuts to management pages
- **AdminMap**: Live bus positions

### 14.3 Student Dashboard (`pages/StudentDashboard.jsx`)

2-column layout on lg (`1.2fr / 1fr`):

- **Hero Card** (`.sd-hero`): ETA display (`2.5rem→3.25rem`), progress bar (orange gradient), status badges (waiting/active/departed), orange glow, departed time cells (2-col grid)
- **Stat Cards** (`.sd-stats-grid`): 2×2, staggered entrance
- **Quick Actions** (`.sd-actions-grid`): 4 buttons (Notify, SOS, Settings, Speak)
- **Driver Card** (`.sd-driver-card`): Avatar (orange bg), name, role, call button (green)
- **Events Timeline** (`.sd-events-card`): Timeline with dot markers (arrived=green, left=orange), vertical line connectors
- **Notification Control** (`.sd-notif-card`): Toggle switch + test notification button + status dot (green pulsing)
- **Map** (`.sd-map-wrap`): Orange-bordered, auto-fit
- **SOS Modal**: Red `4rem` icon circle, warning text
- **Settings Modal**: Toggle switches (`.sd-toggle`), range inputs accent `#FF6B2C`
- **Missed Bus Redirect**: Bus reassignment flow

### 14.4 Driver Dashboard (`pages/DriverDashboard.jsx`)

- **Header**: Avatar (orange gradient 2.75rem rounded-12px), name, live badge (`.dd-live-badge`)
- **Trip Control** (`.dd-trip-hero`): Large 5rem icon ring (active = orange glow + `ddPulse`), title, Start/End + SOS buttons
- **System Status** (`.dd-stats-grid`): 2×2 grid (GPS, Socket, Tracking, Location) — each with icon box, label, value
- **Simulation Toggle** (`.dd-toggle`): Orange on, GPS/SIM indicator badges
- **Map** (`.dd-map-wrap`): `20rem→28rem` height, Leaflet container `border-radius: 0 0 14px 14px`
- **Debug Log** (`.dd-debug-log`): Monospace terminal, collapsible via chevron rotation, clear button (red)
- **SOS Modal** (`.dd-modal`): Red border, icon wrap, SOS tags (pill buttons), text input, broadcast button
- **GPS Error**: Red alert banner (`.dd-gps-error`)
- **Visitors Badge**: Shows live viewer count

### 14.5 Profile (`pages/Profile.jsx`)

- **Avatar** (`.profile-avatar`): 80px circle, orange gradient, centered initials
- **Role Badge**: Color-coded pill
- **Info Tags**: 2-column read-only fields
- **Save Button**: Sticky on mobile, orange gradient
- **Security Alert**: Orange left-bordered banner for password change
- **Card animation**: `profileCardIn` 0.5s

### 14.6 Manage Students (`pages/ManageStudents.jsx`)

- **Student Cards**: Name, email, bus, edit/delete actions
- **Multi-Select**: Tap to select, checkboxes appear (CheckSquare/Square icons)
- **Floating Action Bar**: Bottom bar with count, Select All, Delete Selected
- **CSV Upload**: Bulk import via `papaparse`
- **Filters**: Search, bus filter, status filter
- **Confirm Dialog**: Single/bulk delete

### 14.7 Manage Drivers (`pages/ManageDrivers.jsx`)

Same multi-select pattern as Students. Driver fields: license, assigned bus. API: `/admin/drivers/:id`

### 14.8 Manage Buses (`pages/ManageBuses.jsx`)

Same multi-select pattern. Bus fields: route, capacity, status.

### 14.9 Manage Routes (`pages/ManageRoutes.jsx`)

**3-step wizard** (`rw-*` prefix):

1. **Step 1 — Details**: Route name form + saved routes panel (2-col grid on ≥900px)
2. **Step 2 — Design**: Full-screen MapEditor + sidebar (360px) with stop list + instructions (numbered orange circles)
3. **Step 3 — Review**: Stats overview (2×2 grid), stop timeline (vertical with start=green dot, end=orange dot, numbered middle dots), confirm/save

**Stepper bar**: Orange active circles (2.25rem, `box-shadow: 0 0 12px orange/0.2`), connecting lines, labels hidden on ≤640px.
**Route items**: Edit/duplicate/delete actions. Active item highlighted with orange border.

### 14.10 Manage Stops (`pages/ManageStops.jsx`)

- **StatCard**: Total stops. **StopCard**: Name, coordinates, route, edit/delete
- **Drawer**: For add/edit stop forms. **Route filter dropdown**

### 14.11 Assign Students (`pages/AssignStudents.jsx`)

- **StatCards**: Stats with icon + label + value + subtitle
- **AssignmentRow**: Student→Bus→Stop, edit/delete. **Drawer**: Cascading selects Bus→Stop
- **ConfirmDialog**: Delete confirmation

### 14.12 Public Tracking (`pages/PublicTracking.jsx`)

- **No auth required** at `/track/:busName`. Full-screen map, animated bus marker, route polyline, stop markers, bus info panel

### 14.13 TrackSelector (`pages/TrackSelector.jsx`)

- **Background**: `gradient(135deg, #0f172a→#1e293b→#0f172a)`
- **Card**: Glass, centered, max 420px. **Logo**: PWA icon (56×56, rounded 12px)
- **Title**: "TrackMate" + "Real-Time Bus Tracking"
- **Select**: Dark surface, 🟢 active indicator. **Track button**: Orange gradient CTA
- **Inline styles** (not CSS classes)

### 14.14 Driver Simulator (`pages/DriverSimulator.jsx`)

Debug tool: Coordinate textarea with preset path, start/stop simulation, socket controls, trip management

### 14.15 NotFound / 404 (`pages/NotFound.jsx`)

- **Background**: `#0a0f1b`, radial orange glow (600×600px)
- **Container**: `nf-fade-up` 0.6s entrance, max width 480px
- **Logo**: Horizontal, 2.25rem height, 70% opacity
- **"4_4" display**: 7rem gradient text (`#f8fafc→#475569`), custom SVG bus in center ring (`.nf-icon-ring`: 5.5rem, 2px orange border, `nf-float` 3s ∞, glow animation)
- **Bus icon**: 3rem×3rem inner image
- **Buttons**: "Go Back" (secondary, outline) + "Home" (primary, orange gradient with shadow)
- **Footer**: "TrackMate — Smart Bus Tracking System" (`0.75rem, #334155`)
- Full light theme overrides

---

## 15. Toast Notifications

### 15.1 react-hot-toast (Global)

```jsx
// App.jsx
<Toaster position="top-center" reverseOrder={false} />
```

- **Library**: `react-hot-toast v2.6.0`
- **Position**: Top center of viewport
- **Styling**: Library default (rounded, animated slide-in)

### 15.2 Custom Toast (`components/Toast.jsx`)

Separate from react-hot-toast — used in specific contexts:

- **Container**: Fixed bottom-right, `z-999`, pointer-events-none
- **Card**: White bg, colored border by type, `rounded-2xl`, `shadow-lg`
- **Types**: success=`emerald-100`, warning=`amber-200`, info=`slate-200`, error=`red-200`
- **Accessibility**: `role="region"`, `aria-live="polite"`

---

## 16. Push Notifications (Web Push / VAPID)

### Frontend Flow

1. **Service Worker registration**: `utils/notifications.js` → `registerServiceWorker()` called in `main.jsx`
2. **Permission request**: `requestNotificationPermission()` → wraps `Notification.requestPermission()`
3. **Page notifications**: `showPageNotification(title, options)` → tries inline `new Notification()` first, then falls back to SW `registration.showNotification()`
4. **Default options**: `tag: 'trackmate-alert'`, `icon: '/favicon.ico'`, `badge: '/favicon.ico'`
5. **NotificationToggle component**: UI card with enable/disable button + permission status display

### Service Worker Push Handler (`sw.js` lines 84-118)

- **Default payload**: `{ title: "Bus Update", body: "New location details received", url: "/" }`
- **Icon**: `/favicons/android-chrome-192x192.png`
- **Badge**: `/favicons/favicon-32x32.png`
- **Tag coalescing**: `tag: data.tag || 'trackmate-update'`
- **Vibration patterns**: SOS alert → `[500, 200, 500, 200, 500]` (urgent), Normal → `[200]`
- **Behavior**: `renotify: true`, `requireInteraction: true` (stays visible until clicked)
- **Click handler**: Focuses existing app window or opens new one

---

## 17. Email Templates (3 templates)

Sent via **Brevo (Sendinblue) HTTP API** (`backend/utils/emailService.js`). Retry: up to 3 attempts with exponential backoff.

### 17.1 Welcome Email

- **Subject**: "Welcome to TrackMate – Your Smart Commute Starts Now"
- **Header**: Orange gradient (`#F57C00→#FF9800→#FFB74D`), logo 56×56 rounded-14px
- **Greeting**: "Hi {name} 👋"
- **Account Details Card**: Roll Number, Bus, Route, Boarding Stop — peach bg (`#FFF8F0`, `#FFE0B2` border)
- **Getting Started**: 4 numbered steps with orange circles
- **Security Reminder**: Orange left-bordered warning card (`#FFF3E0`, 4px left border `#F57C00`)
- **CTA**: "Open TrackMate" — orange gradient button, `16px` font, rounded-12px

### 17.2 Stop Arrival Notification

- **Subject**: "Bus arriving at {stop} in {eta} min"
- **Header**: Same gradient, title "Bus Arriving Soon"
- **ETA Card**: Large number (`42px font, #F57C00`) + stop name
- **CTA**: "Track Live"

### 17.3 Password Reset

- **Subject**: "TrackMate – Your Password Has Been Reset"
- **Credentials Card**: Username + Temporary Password (code blocks, `#FFF3E0` bg, monospace font)
- **Security Warning**: Orange left-bordered reminder
- **CTA**: "Log In Now"

### Email Asset

Logo hosted at: `https://trackmaterce.onrender.com/email-logo.png` (source: `public/email-logo.png`)

---

## 18. Offline / PWA UI

### Offline Page (`public/offline.html`)

Static HTML fallback served by service worker when offline:

- **Background**: `#0f172a` (dark slate)
- **Text**: `#e2e8f0`
- **Icon**: 📡 emoji (4rem)
- **Title**: "You're Offline" (h1, 1.5rem, weight 700)
- **Message**: "Connect to the internet to track your bus in real-time."
- **Button**: "Try Again" — `linear-gradient(to right, #ff6b2c, #ff4500)`, `0.75rem` rounded, hover `scale(1.03)`

### PWA Manifest (`public/manifest.json`)

```json
{
  "name": "TrackMate",
  "short_name": "TrackMate",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0f172a",
  "theme_color": "#FF6B2C",
  "icons": [
    { "src": "/favicons/android-chrome-192x192.png", "sizes": "192x192", "purpose": "any maskable" },
    { "src": "/favicons/android-chrome-512x512.png", "sizes": "512x512", "purpose": "any maskable" }
  ]
}
```

---

## 19. Service Worker (`sw.js`)

140 lines handling caching, offline fallback, and push:

### Cache Versions

| Cache Name | Purpose |
|-----------|---------|
| `trackmate-v2` | Navigation responses (network-first) |
| `trackmate-static-v1` | Static assets (cache-first) |

### Precached URLs

`/`, `/offline.html`, `/favicons/android-chrome-192x192.png`, `/favicons/android-chrome-512x512.png`, `/favicons/favicon-32x32.png`, `/manifest.json`

### Fetch Strategies

| Request Type | Strategy | Fallback |
|-------------|----------|----------|
| Navigation (`mode: 'navigate'`) | Network-first, cache the response | `/offline.html` |
| Static assets (JS/CSS/images/fonts) | Cache-first, network fallback | `503` response |
| API calls (`/api/`, `/socket.io/`) | Skipped (pass-through) | — |
| Non-GET requests | Skipped | — |

### Push Notification Handler

- Parses JSON from push event data, falls back to text
- Shows notification with icon, badge, tag, vibration pattern
- **SOS tag detection**: `data.tag === 'sos-alert'` → urgent vibration `[500, 200, 500, 200, 500]`
- **Click handler**: `notificationclick` → focuses existing window or opens `data.url`

### Lifecycle

- **Install**: Precaches URLs then `skipWaiting()`
- **Activate**: Cleans old caches then `clients.claim()`

---

## 20. Loading & Progress UI (6 patterns)

### 20.1 TrackMate Loader (Full-screen)

See §13.1. Displayed while `AuthContext.loading === true`.

### 20.2 Spinner (Login Button)

`<Loader2>` from Lucide with `animate-spin`. Replaces button text during submission. Button gets `opacity-50 cursor-not-allowed`.

### 20.3 Progress Bar (Student Dashboard)

```css
.sd-progress-track { max-width: 8rem; height: 0.5rem; border-radius: 9999px; background: rgba(255,255,255,0.08); }
.sd-progress-bar { background: linear-gradient(90deg, #FF6B2C, #e05515); transition: width 0.5s ease; }
```

Shows trip completion percentage with label + percentage text.

### 20.4 Spinner (Student Dashboard)

```css
.sd-spinner { width: 2rem; height: 2rem; border: 3px solid #FF6B2C; border-top-color: transparent;
  border-radius: 50%; animation: spin 0.8s linear infinite; }
```

### 20.5 Pulsing Status Dots

| Dot | Animation | Color | Shadow |
|-----|-----------|-------|--------|
| `.sd-live-dot` | `sdPulse` 2s ∞ | `#FF6B2C` | — |
| `.dd-status-dot-live` | `ddPulse` 2s ∞ | `#FF6B2C` | `0 0 6px orange/0.6` |
| `.sd-notif-status-dot` | `sd-notif-pulse` 2s ∞ | `#22c55e` | `0 0 6px green/0.5` |
| `.animate-pulse-dot` | `pulseDot` 2s ∞ | varies | — |

### 20.6 Staggered Card Entrance

Student stat cards with `sdCardIn` animation + increasing delays: 0.08s → 0.12s → 0.16s → 0.20s

---

## 21. App Architecture & Routing

### Entry Point (`main.jsx`)

```
ThemeProvider → AuthProvider → App (+ Outlet) → Page routes
```

- **CSS imports**: `bootstrap/dist/css/bootstrap.min.css` + `./index.css`
- **Service Worker**: Registered at boot via `registerServiceWorker()`
- **React Router v6**: `createBrowserRouter` with `v7_startTransition` + `v7_relativeSplatPath` future flags
- **Rendering**: `React.StrictMode` + `RouterProvider`

### App Shell (`App.jsx`)

- **Root div**: `min-h-screen text-slate-100`
- **Navbar**: Hidden on `/login` and `/track/*` routes
- **Toaster**: `react-hot-toast`, top-center, `reverseOrder={false}`
- **Content**: `<Outlet />` for nested routes

### Complete Route Table

| Path | Component | Auth | Roles |
|------|-----------|------|-------|
| `/` | Redirect → `/login` | — | — |
| `/login` | Login | Public | — |
| `/admin` | AdminDashboard | Protected | `admin` |
| `/admin/buses` | ManageBuses | Protected | `admin` |
| `/admin/drivers` | ManageDrivers | Protected | `admin` |
| `/admin/routes` | ManageRoutes | Protected | `admin` |
| `/admin/stops` | ManageStops | Protected | `admin` |
| `/admin/assignments` | AssignStudents | Protected | `admin` |
| `/admin/students` | ManageStudents | Protected | `admin` |
| `/driver` | DriverDashboard | Protected | `driver` |
| `/driver-sim` | DriverSimulator | Protected | `driver`, `admin` |
| `/student` | StudentDashboard | Protected | `student` |
| `/profile` | Profile | Protected | `admin`, `driver`, `student` |
| `/track` | TrackSelector | Public | — |
| `/track/:busName` | PublicTracking | Public | — |
| `*` | NotFound | — | — |

---

## 22. Context Providers (2)

### 22.1 AuthContext (`context/AuthContext.jsx`)

- **State**: `user`, `token`, `loading`
- **Storage keys**: `tm_token`, `tm_user` (localStorage)
- **Methods**: `login({ username, password })`, `logout()`, `setUser()`
- **Login flow**: POST `/auth/login` → persist token+user → redirect by role
- **Role redirect map**: `{ admin: '/admin', driver: '/driver', student: '/student' }`
- **First login**: Redirects to `/profile` if `user.firstLogin === true`
- **Session restore**: On mount, reads localStorage → optionally calls `/auth/me` API
- **Socket integration**: Calls `refreshSocketAuth()` on login/restore, `disconnectSocket()` on logout
- **401 handling**: Axios interceptor catches 401 → clears session → redirects to `/login`

### 22.2 ThemeContext (`context/ThemeContext.jsx`)

- **State**: `theme` (`'dark'` or `'light'`)
- **Storage key**: `trackmate-theme` (localStorage)
- **Application**: Sets both `data-theme` attribute AND `dark`/`light` class on `<html>`
- **Methods**: `toggleTheme()`, `setTheme(value)`
- **Derived**: `isDark`, `isLight` boolean properties
- **Safe defaults**: Returns `{ theme:'dark', isDark:true, ... }` when used outside provider

---

## 23. Custom Hooks (4)

### 23.1 useAuth (`hooks/useAuth.js`)

Simple wrapper: `useContext(AuthContext)` — returns `{ user, token, loading, login, logout, setUser }`

### 23.2 useGeolocation (`hooks/useGeolocation.js`)

GPS tracking with simulation support:

- **Options**: `enableHighAccuracy: true`, `maximumAge: 5000`, `timeout: 15000`
- **Throttle**: `VITE_MIN_UPDATE_INTERVAL_MS` (defaults 1000ms)
- **Simulation**: Replay a `simulatedPath` array at realistic 30 km/h speed
- **State returned**: `isTracking`, `permissionStatus`, `lastPosition`, `error`, `pingsSent`
- **Methods**: `startTracking()`, `stopTracking()`
- **Position format**: `{ lat, lng, accuracy, speed, heading, timestamp }`
- **Error handling**: GPS weakness retries silently without stopping tracking

### 23.3 useSocket (`hooks/useSocket.js`)

Socket.IO real-time connection with offline buffer:

- **URL**: `API_BASE_URL` (same as REST API base)
- **Transport**: WebSocket only (`transports: ['websocket']`)
- **Singleton**: Single `socketInstance` shared across components
- **Auth**: Emits `auth:token` with JWT from localStorage on connect/reconnect
- **Location emitting**: `emitLocation(payload)` — throttled, with 3-retry exponential backoff on failure
- **Offline buffer**: Failed emits queued in `OfflineBuffer` (max 100), flushed on reconnect with staggered delays
- **Events**: `connect`, `disconnect`, `auth:ready`, `io.reconnect`
- **State returned**: `socket`, `isConnected`, `isAuthenticated`, `bufferSize`, `lastEmitTs`, `emitLocation()`

### 23.4 useWakeLock (`hooks/useWakeLock.js`)

Keeps screen on during active driver trips:

- **Primary**: Screen Wake Lock API (`navigator.wakeLock.request('screen')`)
- **Fallback**: Tiny transparent `<video>` loop (base64 MP4 data URI, 1×1px, opacity 0.01) for unsupported browsers
- **Auto-reacquire**: Re-acquires lock when tab becomes visible (handles iOS/Android background)
- **State returned**: `isWakeLockActive`, `requestWakeLock()`, `releaseWakeLock()`
- **Cleanup**: Releases on unmount

---

## 24. Utility Modules (6)

### 24.1 api.js (`utils/api.js`)

- **Instance**: `axios.create({ baseURL: API_ROOT })`
- **Request interceptor**: Auto-attaches `Bearer ${token}` from localStorage
- **Response interceptor**: On 401 → clears localStorage keys (`tm_token`, `tm_user`) → removes auth header → redirects to `/login`
- **Exports**: `api`, `setAuthToken(token)`

### 24.2 debounce.js (`utils/debounce.js`)

Two exports:

- **`debounce(func, wait=300)`**: Classic debounce with `.cancel()` method
- **`useDebounce(value, delay=300)`**: React hook returning debounced value

### 24.3 etaUtils.js (`utils/etaUtils.js`)

ETA calculation with haversine distance:

- **`computeFallbackETA(busPos, stopPos, speedMps)`**: Returns milliseconds. Default speed = 25 km/h (6.94 m/s)
- **`formatETA(ms)`**: Returns `"Arriving..."` (<10s), `"X min YY sec"` (>60s), or `"X sec"`. Returns `"—"` for null

### 24.4 mapUtils.js (`utils/mapUtils.js`)

- **Dependencies**: `@turf/turf` for geospatial calculations
- **`lineToGeoJSON(layer)`**: Leaflet layer → GeoJSON LineString geometry
- **`markerToStop(marker, seq, name)`**: Leaflet marker → `{ id, name, lat, lng, seq }`
- **`reindexStops(stops)`**: Re-sequences stop array from 0
- **`reorderStopsAlongLine(lineGeom, stops)`**: Snaps stops to nearest point on line, reorders by distance along line
- **`haversineDistance(a, b)`**: Returns meters between two `{lat, lng}` points

### 24.5 notifications.js (`utils/notifications.js`)

- **`registerServiceWorker()`**: Registers `/sw.js`, caches registration promise
- **`requestNotificationPermission()`**: Wraps `Notification.requestPermission()`
- **`showPageNotification(title, options)`**: Tries inline `new Notification()` when tab visible, then falls back to SW `showNotification()`. Default tag: `'trackmate-alert'`, icon/badge: `/favicon.ico`

### 24.6 offlineBuffer.js (`utils/offlineBuffer.js`)

FIFO queue for GPS data when offline:

- **Class**: `OfflineBuffer` with `push(item)`, `drain()`, `size()`
- **Max entries**: 100 (when full, FIFO drops oldest)
- **Singleton export**: Shared across hooks

---

## 25. Constants (2 files)

### 25.1 api.js (`constants/api.js`)

Smart API URL inference:

1. **Explicit env**: `VITE_BACKEND_URL` (for production/Vercel)
2. **Localhost**: `http://localhost:5000` (dev)
3. **LAN**: `${protocol}//${hostname}:5000` (mobile testing via 192.168.x.x / 10.x.x.x)
4. **Fallback**: Empty string (relative URL)

Exports: `API_BASE_URL` (socket), `API_ROOT` (`${API_BASE_URL}/api`)

### 25.2 geo.js (`constants/geo.js`)

Geographic constants:

- **`ELURU_CENTER`**: `{ lat: 16.7107, lng: 81.0952 }` — default map center
- **`ELURU_SIM_PATH`**: 4-point simulation path `[{16.7184,81.1108}, {16.7141,81.1032}, {16.7102,81.0961}, {16.7064,81.0895}]`
- **`DEFAULT_MAP_ZOOM`**: `10`
- **`TILE_LAYER_URL`**: `'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'`
- **`TILE_LAYER_ATTRIBUTION`**: `'© OpenStreetMap contributors'`

---

## 26. NPM Dependencies (17 runtime + 5 dev)

### Runtime Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `react` | ^18.3.1 | UI library |
| `react-dom` | ^18.3.1 | DOM renderer |
| `react-router-dom` | ^6.27.0 | Client-side routing |
| `react-hot-toast` | ^2.6.0 | Toast notifications |
| `axios` | ^1.6.8 | HTTP client |
| `socket.io-client` | ^4.7.5 | WebSocket real-time |
| `leaflet` | ^1.9.4 | Map rendering |
| `react-leaflet` | ^4.2.1 | React bindings for Leaflet |
| `leaflet.pm` | ^2.2.0 | Drawing/editing tools for Leaflet |
| `lucide-react` | ^0.561.0 | Icon library |
| `@dnd-kit/core` | ^6.3.1 | Drag-and-drop core |
| `@dnd-kit/sortable` | ^10.0.0 | Sortable DnD presets |
| `@dnd-kit/utilities` | ^3.2.2 | DnD utilities |
| `@turf/turf` | ^7.3.0 | Geospatial analysis |
| `bootstrap` | ^5.3.8 | CSS grid/utilities (imported globally) |
| `framer-motion` | ^12.23.26 | Animation library |
| `papaparse` | ^5.5.3 | CSV parsing for bulk imports |

### Dev Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `vite` | ^7.2.6 | Build tool / dev server |
| `@vitejs/plugin-react` | ^4.3.1 | React Fast Refresh for Vite |
| `tailwindcss` | ^3.4.14 | Utility-first CSS |
| `postcss` | ^8.4.38 | CSS processor |
| `autoprefixer` | ^10.4.19 | Vendor prefix automation |

---

## 27. Image & Logo Assets (24+ files)

### Logos

| File | Description |
|------|-------------|
| `public/logohorigental.svg` | Horizontal logo (SVG wrapper, 2816×1536 PNG embedded) |
| `public/logohorigental.png` | Horizontal logo (raw PNG) |
| `public/logo vertical.svg` | Vertical logo SVG |
| `public/logo vertical.png` | Vertical logo PNG |
| `public/email-logo.png` | Email-optimized logo |
| `public/badge.png` | App badge |
| `public/others/logohorigental.png` | Backup horizontal logo |
| `public/others/logo vertical.png` | Backup vertical logo |

### Map Markers (`public/markers/`)

| File | Sizes Used | Usage |
|------|-----------|-------|
| `bus.png` | 36–48px | Live bus position on all maps |
| `stop.png` | 28–30px | Bus stop markers |
| `location.png` | — | User/device location marker |

### PWA & Favicon (`public/favicons/` + root)

| File | Size |
|------|------|
| `android-chrome-192x192.png` | 192×192 |
| `android-chrome-512x512.png` | 512×512 |
| `apple-touch-icon.png` | Standard |
| `favicon-16x16.png` | 16×16 |
| `favicon-32x32.png` | 32×32 |
| `favicon.ico` | ICO |
| `site.webmanifest` | Manifest stub |
| `icon-192.png` (root) | 192×192 |
| `icon-512.png` (root) | 512×512 |

### Other Public Files

| File | Purpose |
|------|---------|
| `manifest.json` | PWA manifest |
| `sw.js` | Service worker (140 lines) |
| `offline.html` | Offline fallback page |
| `_redirects` | Netlify/Render SPA redirect rules |

---

## 28. CSS Class Prefix Conventions

| Prefix | Scope | Approx Lines |
|--------|-------|-------------|
| `tm-*` | TrackMate Loader | ~50 |
| `nav-*` | Navbar (header, links, drawer, bottom nav) | ~500 |
| `login-*` | Login page (hero, form, card, inputs) | ~400 |
| `profile-*` | Profile/Settings page | ~300 |
| `sd-*` | Student Dashboard (hero, stats, map, notif, events, driver, modals) | ~700 |
| `dd-*` | Driver Dashboard (header, trip, stats, sim, map, debug, modal) | ~500 |
| `rw-*` | Route Wizard (stepper, forms, sidebar, map, stops, review) | ~800 |
| `nf-*` | NotFound / 404 page | ~110 |
| `glass` / `glass-*` | Glassmorphism utilities | ~15 |
| `animate-*` | Tailwind-layer animation utilities | ~20 |

Total CSS lines in `index.css`: **6,275 lines** (125 KB)

---

## 29. Accessibility Notes

- **Focus Rings**: All interactive elements get `:focus` / `:focus-visible` outlines; focus ring: `0 0 0 3px rgba(99,102,241,0.15)`
- **Color Contrast**: Dark theme text (`#f8fafc` on `#0f172a`) ≈ 15.4:1 (exceeds WCAG AAA)
- **Touch Targets**: Buttons minimum 40×40px, nav items well-spaced
- **ARIA Attributes**: Toast region = `role="region" aria-live="polite"`, Drawer = `aria-label`, close buttons = `aria-label="Close panel"` / `"Dismiss notification"`
- **Semantic HTML**: `<header>`, `<section>`, `<footer>`, `<main>` used throughout
- **Keyboard Navigation**: Tab order maintained, escape closes modals
- **Font Sizing**: All in `rem` for browser zoom support
- **Scrollbar Hiding**: `.no-scrollbar` hides scrollbar while maintaining scroll
- **Reduced Motion**: Not currently implemented — future improvement
- **Safe Areas**: PWA notch support via `env(safe-area-inset-*)`
- **Notification Accessibility**: Push notifications use `requireInteraction: true` for persistent alerts

---

*Last updated: February 2026*
*Total CSS: 6,275 lines · Components: 14 · Pages: 15 · Hooks: 4 · Utils: 6 · Animations: 20 keyframes · Dependencies: 22*
