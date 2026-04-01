# 🎨 Aesthetics Hub — Design System

> Tài liệu design system cho app Aesthetics Hub. Dùng để đồng bộ style giữa các coder.

---

## 1. Typography

### Font Family
| Token | Value |
|---|---|
| **Primary Font** | `Nunito` (Google Fonts) |
| **Fallback** | `sans-serif` |
| **Import** | `https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;500;600;700;800;900` |

### Font Weights
| Class | Weight | Sử dụng |
|---|---|---|
| `font-light` | 300 | Số lớn hiển thị (stats) |
| `font-normal` | 400 | Body text bình thường |
| `font-medium` | 500 | Label, tên client, heading nhỏ |
| `font-semibold` | 600 | Sub-heading, giá trị nổi bật |
| `font-bold` | 700 | Button text, card title |
| **`font-black`** | **900** | **Label uppercase, badge, micro-text** ⭐ Dùng nhiều nhất |

### Font Sizes
| Class | Pixel | Sử dụng |
|---|---|---|
| `text-[7px]` | 7px | Tab label (nav bar) |
| `text-[8px]` | 8px | Micro label (Mua/Tặng/Tổng) |
| **`text-[9px]`** | **9px** | **Section label, badge, status** ⭐ |
| **`text-[10px]`** | **10px** | **Sub-label, info text, session number** ⭐ |
| `text-[11px]` | 11px | Header info, time display |
| `text-xs` | 12px | Small body text |
| **`text-sm`** | **14px** | **Primary body text, input text** ⭐ |
| `text-base` | 16px | Input value, medium text |
| `text-lg` | 18px | Section heading |
| `text-xl` | 20px | Card title, large number |
| `text-2xl` | 24px | Page title (Login) |
| `text-3xl` | 30px | Stats number (big) |

### Text Transform
- **Label/Badge**: `uppercase tracking-widest` hoặc `tracking-[0.2em]`
- **Body**: Normal case

---

## 2. Color Palette

### Backgrounds
| Token | Hex / Value | Sử dụng |
|---|---|---|
| `bg-black` | `#000000` | App root |
| **`bg-[#0a0a0a]`** | `#0a0a0a` | **Page background chính** |
| **`bg-[#0d0d0d]`** | `#0d0d0d` | **Modal background** |
| `bg-[#1a1a1c]` | `#1a1a1c` | Dialog/popup background |
| `bg-white/[0.02]` | rgba(255,255,255,0.02) | Row item (rất subtle) |
| `bg-white/[0.03]` | rgba(255,255,255,0.03) | Card item light |
| **`bg-white/[0.04]`** | rgba(255,255,255,0.04) | **Input background, button ghost** |
| `bg-white/[0.05]` | rgba(255,255,255,0.05) | Button secondary, nav active |
| `bg-white/[0.06]` | rgba(255,255,255,0.06) | Display field (readonly) |
| `bg-white/5` | rgba(255,255,255,0.05) | Icon button |
| `bg-white/10` | rgba(255,255,255,0.10) | Hover state |
| **`bg-white`** | `#FFFFFF` | **Primary button (CTA)** |

### Gradient Backgrounds
```css
/* Active Package Card */
bg-gradient-to-br from-blue-500/20 to-purple-500/15

/* Page gradient */
bg-gradient-to-b from-[#1a1a1c] via-[#0d0d0d] to-[#000000]
```

### Text Colors
| Token | Hex approx | Sử dụng |
|---|---|---|
| **`text-white`** | `#FFFFFF` | **Primary text, heading** |
| `text-neutral-400` | `#A3A3A3` | Secondary text |
| **`text-neutral-500`** | `#737373` | **Subtitle, muted text** |
| **`text-neutral-600`** | `#525252` | **Label text, micro label** ⭐ Dùng nhiều nhất |
| `text-neutral-700` | `#404040` | Placeholder, disabled text |
| `text-neutral-800` | `#262626` | Empty state icon |
| `text-black` | `#000000` | Primary button text (trên bg-white) |

### Accent Colors
| Nhóm | Token | Sử dụng |
|---|---|---|
| **Blue** | `text-blue-400` / `bg-blue-500/10` | Active state, progress, "đang tập" |
| **Blue** | `text-blue-300` | Highlight on blue bg |
| **Emerald** | `text-emerald-400` / `bg-emerald-500/10` | Success, "done", giá tiền |
| **Purple** | `text-purple-400` | Bonus/tặng, special |
| **Red** | `text-red-400` / `bg-red-500/10` | Error, delete, warning |
| **Orange** | `text-orange-400` | Nutrition section |
| **Yellow** | `text-yellow-500` | Caution message |

---

## 3. Border & Border Radius

### Border Colors
| Token | Sử dụng |
|---|---|
| **`border-white/[0.05]`** | Subtle separator |
| **`border-white/[0.06]`** | Card border light |
| **`border-white/[0.08]`** | Input/button border |
| **`border-white/10`** | Standard border |
| `border-white/30` | Input focus state |
| `border-blue-500/20` | Active state accent |
| `border-blue-500/30` | Active state strong |
| `border-red-500/20` | Danger accent |
| `border-emerald-500/20` | Success accent |

### Border Radius
| Token | Pixel | Sử dụng |
|---|---|---|
| `rounded-[10px]` | 10px | Preview item |
| `rounded-[12px]` | 12px | Small button, chip |
| **`rounded-[14px]`** | **14px** | **Input field** |
| **`rounded-[16px]`** | **16px** | **Small card, alert box** |
| **`rounded-[18px]`** | **18px** | **Button CTA, session row** |
| **`rounded-[20px]`** | **20px** | **Input login, session card** |
| **`rounded-[24px]`** | **24px** | **Section card, major container** ⭐ |
| `rounded-[26px]` | 26px | Nav button inner |
| `rounded-[28px]` | 28px | Toggle group |
| **`rounded-[32px]`** | **32px** | **Modal, dialog, major card** ⭐ |
| **`rounded-full`** | 9999px | **Avatar, icon button, badge** ⭐ |

---

## 4. Spacing & Layout

### App Container
```
max-w-[420px]  — Mobile-first, max width 420px
h-screen       — Full viewport height
overflow-hidden — Prevent body scroll
```

### Common Padding
| Token | Sử dụng |
|---|---|
| `px-4` / `px-5` / `px-6` | Page horizontal padding |
| `py-2.5` / `py-3` / `py-3.5` | Button/input vertical padding |
| `py-4` / `py-5` | Large button padding |
| `p-4` / `p-5` / `p-6` | Card inner padding |
| `p-8` | Dialog inner padding |

### Common Gaps
| Token | Sử dụng |
|---|---|
| `gap-1.5` | Tight (progress dots, small chips) |
| `gap-2` | Standard (button group, chips grid) |
| `gap-3` | Medium (card content, list items) |
| `gap-4` / `gap-5` | Large (section spacing) |

### Bottom Padding (for nav)
```
pb-32 — Content area bottom padding (avoid nav overlap)
pb-40 — Extra padding variant
```

---

## 5. Component Patterns

### Primary Button (CTA)
```jsx
className="w-full bg-white text-black font-bold py-4 rounded-[18px]
           flex items-center justify-center gap-2
           active:scale-[0.98] transition-all shadow-lg
           disabled:opacity-40 disabled:cursor-not-allowed"
```

### Secondary Button (Ghost)
```jsx
className="px-5 py-3.5 bg-white/[0.04] border border-white/[0.08]
           rounded-[18px] text-white font-bold text-sm
           active:scale-95 transition-all"
```

### Icon Button (Circle)
```jsx
className="p-2.5 bg-white/5 border border-white/10 rounded-full
           text-white active:scale-90 transition-all"
```

### Action Badge Button (Done)
```jsx
className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20
           rounded-full text-[9px] font-black uppercase tracking-wider
           text-emerald-400 active:scale-90 transition-all"
```

### Text Input
```jsx
className="w-full bg-white/[0.04] border border-white/[0.1]
           rounded-[14px] py-2.5 px-4
           text-white text-sm font-medium
           outline-none focus:border-white/30 transition-all"
```

### Number Input (Centered)
```jsx
className="w-full bg-white/[0.04] border border-white/[0.1]
           rounded-[14px] py-2.5 px-3
           text-white text-xl font-semibold text-center
           outline-none focus:border-white/30 transition-all"
```

### Section Card
```jsx
className="bg-white/[0.02] border border-white/[0.05]
           rounded-[24px] overflow-hidden"
```

### Active Package Card (Gradient)
```jsx
className="bg-gradient-to-br from-blue-500/20 to-purple-500/15
           border border-white/10 rounded-[32px] p-6
           relative overflow-hidden"
```

### Modal (Full Screen)
```jsx
// Outer overlay — dùng React Portal (document.body)
className="fixed inset-0 z-[500] bg-black/50 backdrop-blur-sm"

// Inner container
className="w-full h-full bg-[#0d0d0d] border-t border-white/10
           rounded-t-[32px] flex flex-col overflow-hidden"
```

### Section Label
```jsx
className="text-[9px] font-black text-neutral-600
           uppercase tracking-widest"
```

### Field Label
```jsx
className="text-[9px] font-black text-neutral-600
           uppercase tracking-widest"
// Giống section label — nhất quán
```

### Status Badge (Active)
```jsx
className="text-[9px] font-black text-emerald-400
           bg-emerald-500/10 border border-emerald-500/20
           px-3 py-1.5 rounded-full uppercase"
```

### Nav Bar (Bottom)
```jsx
// Container
className="fixed bottom-6 left-1/2 -translate-x-1/2
           w-[92%] max-w-[320px]
           bg-black/80 backdrop-blur-3xl
           border border-white/10 rounded-[32px]
           p-1.5 flex justify-between z-50 shadow-2xl"

// Tab Button Active
className="flex-1 py-4 rounded-[26px] flex flex-col items-center
           justify-center gap-1 bg-white/5 text-white"

// Tab Button Inactive
className="flex-1 py-4 rounded-[26px] flex flex-col items-center
           justify-center gap-1 text-neutral-600 scale-90 opacity-50"

// Tab Label
className="text-[7px] font-black uppercase tracking-tighter"
```

### Progress Bar
```jsx
// Track
className="h-1.5 bg-white/10 rounded-full overflow-hidden"

// Fill
className="h-full bg-gradient-to-r from-blue-500 to-purple-500
           rounded-full transition-all duration-700"
// width via inline style: { width: `${percent}%` }
```

---

## 6. Animations

### Slide Up
```css
@keyframes slideUp {
  from { transform: translateY(100%); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
.animate-slide-up {
  animation: slideUp 0.3s ease-out forwards;
}
```

### Interaction States
| State | Class |
|---|---|
| Tap/Click | `active:scale-95` hoặc `active:scale-[0.98]` hoặc `active:scale-90` |
| Hover | `hover:bg-white/10` |
| Transition | `transition-all` (mặc định 150ms) |
| Duration | `duration-300` hoặc `duration-500` hoặc `duration-700` |
| Loading spin | `animate-spin` |

---

## 7. Iconography

| Library | Version |
|---|---|
| **Lucide React** | `^1.7.0` |

**Size conventions:**
| Size | Sử dụng |
|---|---|
| `w-3 h-3` | Inline micro icon |
| `w-3.5 h-3.5` | Small icon in button |
| `w-4 h-4` | Standard button icon |
| `w-5 h-5` | Nav icon, input icon |
| `w-7 h-7` / `w-8 h-8` | Empty state icon |
| `w-12 h-12` | Large empty state |

---

## 8. Design Principles

1. **Dark-first**: Nền đen/xám rất tối (`#0a0a0a`, `#0d0d0d`), text trắng
2. **Glassmorphism**: `backdrop-blur-sm`, `backdrop-blur-xl`, `backdrop-blur-3xl` + background opacity thấp
3. **Micro-opacity borders**: `border-white/[0.05]` đến `border-white/10` — rất subtle
4. **Rounded everything**: Minimum `rounded-[12px]`, cards `rounded-[24px]`, modals `rounded-[32px]`
5. **Font-black labels**: Tất cả label/badge dùng `font-black uppercase tracking-widest text-[9px]`
6. **Accent via opacity**: Không dùng solid color — luôn dùng opacity (`blue-500/10`, `emerald-500/15`)
7. **Interactive feedback**: Mọi button đều có `active:scale-*` + `transition-all`
8. **Mobile container**: Max width `420px`, centered trên desktop

---

## 9. Z-Index Layers

| Z-Index | Sử dụng |
|---|---|
| `z-10` | Sticky header |
| `z-50` | Bottom navigation |
| `z-[200]` | Delete confirmation dialog |
| `z-[500]` | Create package modal |

---

## 10. Tech Stack

| Tech | Version | Notes |
|---|---|---|
| React | 19.2.4 | |
| Vite | 8.0.1 | Dev server + build |
| TailwindCSS | 4.2.2 | Via `@tailwindcss/vite` plugin |
| Supabase | 2.100.1 | Auth + Database + Storage |
| Lucide React | 1.7.0 | Icon library |
| Font | Nunito | Google Fonts CDN |
