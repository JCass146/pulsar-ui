# Design System Documentation

## Overview

The Pulsar UI design system is built on a foundation of tokenized design decisions and reusable UI primitives. This ensures visual consistency, maintainability, and a cohesive user experience across the application.

## Core Philosophy

1. **Tokens First**: All design decisions (colors, spacing, shadows, typography) are defined as CSS custom properties
2. **Primitive Components**: Reusable building blocks (Card, Pill, IconButton, SectionHeader) enforce consistent layout and spacing
3. **Hierarchical Layers**: Clear visual hierarchy through 3 surface layers and 2 shadow levels
4. **Accessible Defaults**: Components built with accessibility in mind (semantic HTML, proper contrast, focus states)

## Design Tokens

### Typography
Font sizes (--font-2xs through --font-xl): 9px to 16px
Line heights (--lh-tight through --lh-relaxed): 1.2 to 1.5

### Spacing (8px Scale)
--space-2xs (4px) through --space-3xl (32px)

### Shadows (2 Levels)
--shadow-sm (subtle) and --shadow-md (prominent)

### Surfaces (3 Layers)
--surface-bg (background), --surface-default (cards), --surface-raised (overlays)

### Colors
--text, --text-secondary, --muted, --border, --border-divider

## UI Primitives

### Card Component Family
Base container with CardHeader, CardTitle, CardMeta, CardBody, CardFooter

### Pill Component
Compact badge/status element with 6 color variants and 3 sizes

### IconButton Component
Icon-only button for toolbars and headers with 4 color variants and 3 sizes

### SectionHeader Component
Section divider with optional title, subtitle, and right-aligned actions

## Theming

Automatic light/dark mode switching via data-theme attribute on root element.

## Best Practices

- Use token variables instead of hardcoding colors/spacing
- Leverage primitive components for consistency
- Test in both light and dark themes
- Maintain semantic HTML structure
- Ensure WCAG AA color contrast

For complete documentation, detailed examples, and migration guides, see the full design system guide.
