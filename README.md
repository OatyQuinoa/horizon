# AIIS: Investment Research Dashboard

A personal investment research tool for tracking software IPOs. Built for thoughtful, long-term decision-making with a focus on weekly insights, post-IPO price movements, and deep-dive analyses.

## Design Philosophy

**Modern Editorial meets Swiss International**

The design combines the sophistication of high-end financial publishing with the rational clarity of Swiss design, creating a private investment office aesthetic—refined, unhurried, and intellectually serious.

### Color Palette

- **Background**: Deep navy (#0A1628) with subtle warmth
- **Text**: Warm cream (#F5F1E8) for primary text
- **Accent**: Aged brass gold (#B8935F) for CTAs and highlights
- **Success**: Deep forest green (#2D5A3D) for buying opportunities
- **Caution**: Burgundy red (#8B3A3A) for risks

### Typography

- **Display/Headings**: Fraunces (Variable serif)
- **Body Text**: Manrope (Variable sans-serif)
- **Data/Numbers**: JetBrains Mono (Monospace)

## Features

### Dashboard
- Featured company card with this week's deep-dive analysis
- Recent S-1 filings grid with sector badges and filing metadata
- Quick stats showing activity overview

### Company Detail View
- Single-column reading experience
- Key metrics display
- Business model overview
- Editable investment thesis
- Editable concerns & risk analysis
- Watchlist management
- Direct links to SEC filings

### Watchlist
- **Post-IPO Opportunities**: Companies trading 10%+ below IPO price
- **Monitoring**: Pre-IPO filings and tracked companies
- Price movement indicators
- Lockup date tracking

### Archive
- Chronological list of past weekly digests
- Summary metadata for each digest
- Archive statistics

## Tech Stack

- **Framework**: React 18 + Vite
- **Routing**: React Router v6
- **UI Components**: ShadCN/UI (Radix UI primitives)
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Date Handling**: date-fns
- **Notifications**: Sonner

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
src/
├── components/
│   ├── ui/              # ShadCN UI components
│   ├── Layout.tsx       # Main layout with navigation
│   ├── FeaturedCompanyCard.tsx
│   ├── FilingCard.tsx
│   ├── MetricCard.tsx
│   ├── WatchlistCard.tsx
│   └── LoadingSpinner.tsx
├── pages/
│   ├── Dashboard.tsx    # Home page with featured company
│   ├── Watchlist.tsx    # Watchlist management
│   ├── Archive.tsx      # Digest archive
│   └── CompanyDetail.tsx # Company deep-dive view
├── data/
│   └── mockData.ts      # Mock company and digest data
├── types/
│   └── index.ts         # TypeScript type definitions
└── App.tsx              # Main app component with routes
```

## Design Principles

### Anti-Patterns (Strictly Prohibited)

- 🚫 Real-time tickers or flashing price updates
- 🚫 Notification badges or urgency indicators
- 🚫 Pure black or pure white backgrounds
- 🚫 Bright, saturated accent colors
- 🚫 Multiple competing CTAs on a single page
- 🚫 Cramped spacing or dense layouts
- 🚫 Social sharing or gamification elements

### Core Interactions

- **Weekly Ritual**: Review Saturday morning email, check new filings, read analysis
- **Deep Research**: Read S-1, write thesis and concerns, save to database
- **Watchlist Management**: One-click add/remove, automatic opportunity flagging
- **Smooth Animations**: 200ms transitions, subtle hover states (2px lift)

## Responsive Design

- **Desktop (1200px+)**: Two-column grids, max content width with margins
- **Tablet (768px-1199px)**: Single-column, full-width cards
- **Mobile (<768px)**: Stacked vertically, optimized padding

## Accessibility

- WCAG AA contrast ratios (cream on navy > 7:1)
- Visible focus states on all interactive elements
- Semantic HTML throughout
- Keyboard navigation support

## License

Private project - All rights reserved

