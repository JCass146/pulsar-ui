# Pulsar UI Design System

Welcome to the Pulsar UI Design System! This comprehensive guide will help you understand and use the tokenized design system and reusable components that make up the Pulsar UI.

## 🎯 What is This?

A complete design system for Pulsar UI featuring:
- **50+ CSS Tokens** - Colors, spacing, shadows, typography
- **4 Component Families** - Card, Pill, IconButton, SectionHeader
- **Automatic Theming** - Light and dark modes
- **100% Accessibility** - WCAG AA compliance
- **Zero Configuration** - Import and use immediately

## 📚 Documentation

### Quick Start (5 minutes)
**New to the system?** Start here:
- [FIVE_MINUTE_START.md](./FIVE_MINUTE_START.md) - Get started in 5 minutes with copy-paste examples

### Learning (15-30 minutes)
**Want to learn the system thoroughly?**
- [DESIGN_SYSTEM_QUICK_REF.md](./DESIGN_SYSTEM_QUICK_REF.md) - Quick reference with token cheat sheet
- [DESIGN_SYSTEM_VISUAL_REF.md](./DESIGN_SYSTEM_VISUAL_REF.md) - Visual examples with color swatches and diagrams

### Complete Reference (30-60 minutes)
**Need detailed documentation?**
- [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) - Complete design system reference with all details
- [DESIGN_DOCUMENTATION_INDEX.md](./DESIGN_DOCUMENTATION_INDEX.md) - Navigation hub for all documentation

### Implementation (1-2 hours)
**Ready to build or refactor?**
- [IMPLEMENTATION_CHECKLIST.md](./IMPLEMENTATION_CHECKLIST.md) - Developer checklist to ensure quality
- [PHASE3_DASHBOARD_REFACTORING.md](./PHASE3_DASHBOARD_REFACTORING.md) - Step-by-step dashboard modernization guide

### Project Overview
**Want to understand the big picture?**
- [DESIGN_MODERNIZATION_GUIDE.md](./DESIGN_MODERNIZATION_GUIDE.md) - Project vision, phases, and roadmap
- [COMPLETION_SUMMARY.md](./COMPLETION_SUMMARY.md) - Summary of what was delivered

## 🚀 Quick Example

### Import Components
```jsx
import { Card, CardHeader, CardTitle, CardBody, Pill, IconButton } from '@/components';
```

### Use Tokens
```css
.my-element {
  padding: var(--space-md);           /* 12px */
  background: var(--surface-default); /* Card background */
  color: var(--text);                 /* Main text */
  box-shadow: var(--shadow-sm);       /* Subtle shadow */
}
```

### Build Component
```jsx
<Card interactive>
  <CardHeader divider>
    <CardTitle size="md">My Component</CardTitle>
  </CardHeader>
  <CardBody>
    <div style={{ marginBottom: 'var(--space-md)' }}>
      Content here
    </div>
    <Pill variant="success" size="sm">Active</Pill>
  </CardBody>
</Card>
```

Light and dark themes switch automatically! ✨

## 📖 By Role

### "I'm building a new component"
1. Read: [DESIGN_SYSTEM_QUICK_REF.md](./DESIGN_SYSTEM_QUICK_REF.md) (10 min)
2. Copy pattern from: [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md#component-composition-example)
3. Verify with: [IMPLEMENTATION_CHECKLIST.md](./IMPLEMENTATION_CHECKLIST.md)

### "I need to understand the token system"
1. Read: [DESIGN_SYSTEM_VISUAL_REF.md](./DESIGN_SYSTEM_VISUAL_REF.md) (visual approach)
2. Reference: [DESIGN_SYSTEM_QUICK_REF.md#token-cheat-sheet](./DESIGN_SYSTEM_QUICK_REF.md#token-cheat-sheet)
3. Deep dive: [DESIGN_SYSTEM.md#design-tokens](./DESIGN_SYSTEM.md#design-tokens)

### "I'm refactoring the dashboard"
1. Follow: [PHASE3_DASHBOARD_REFACTORING.md](./PHASE3_DASHBOARD_REFACTORING.md) (step-by-step)
2. Use checklist: [IMPLEMENTATION_CHECKLIST.md](./IMPLEMENTATION_CHECKLIST.md)
3. Test with: The provided testing checklist

### "I need to review code"
1. Use: [IMPLEMENTATION_CHECKLIST.md](./IMPLEMENTATION_CHECKLIST.md#before-merging)
2. Check: Token compliance, theme compatibility, accessibility
3. Verify: No visual regression in light/dark modes

### "I need to understand the project"
1. Read: [DESIGN_MODERNIZATION_GUIDE.md](./DESIGN_MODERNIZATION_GUIDE.md)
2. Check status: [COMPLETION_SUMMARY.md](./COMPLETION_SUMMARY.md)
3. Navigate docs: [DESIGN_DOCUMENTATION_INDEX.md](./DESIGN_DOCUMENTATION_INDEX.md)

## 🎨 The System at a Glance

### Design Tokens
- **50+ CSS custom properties** organized into logical sections
- **Typography**: 8 font sizes + 4 line heights
- **Spacing**: 8px scale (8 values from 4px to 32px)
- **Shadows**: 2 levels (subtle + prominent)
- **Surfaces**: 3-layer vocabulary (background, default, raised)
- **Colors**: Minimal palette (3 text colors + 2 border tokens)
- **Border Radius**: 3 levels (6px, 10px, 14px)
- **Themes**: Automatic light and dark modes

### Reusable Components
1. **Card Family** - Container with header, body, footer sections
2. **Pill** - Compact status/badge element (6 colors, 3 sizes)
3. **IconButton** - Icon-only button (4 colors, 3 sizes)
4. **SectionHeader** - Section divider with title and actions

### Key Features
✅ Zero hardcoded values (all use tokens)
✅ Automatic light/dark theming
✅ WCAG AA accessibility
✅ Full keyboard navigation
✅ Semantic HTML
✅ No expensive CSS effects
✅ RAF batching preserved
✅ Ref-based state compatible

## 📋 Navigation

| Want to... | Document | Time |
|-----------|----------|------|
| Get started quickly | [FIVE_MINUTE_START.md](./FIVE_MINUTE_START.md) | 5 min |
| Use in a component | [DESIGN_SYSTEM_QUICK_REF.md](./DESIGN_SYSTEM_QUICK_REF.md) | 10 min |
| Understand tokens visually | [DESIGN_SYSTEM_VISUAL_REF.md](./DESIGN_SYSTEM_VISUAL_REF.md) | 15 min |
| Learn everything | [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) | 30 min |
| Refactor dashboard | [PHASE3_DASHBOARD_REFACTORING.md](./PHASE3_DASHBOARD_REFACTORING.md) | 60 min |
| Review code quality | [IMPLEMENTATION_CHECKLIST.md](./IMPLEMENTATION_CHECKLIST.md) | 15 min |
| Find specific info | [DESIGN_DOCUMENTATION_INDEX.md](./DESIGN_DOCUMENTATION_INDEX.md) | 5 min |
| Understand project | [DESIGN_MODERNIZATION_GUIDE.md](./DESIGN_MODERNIZATION_GUIDE.md) | 30 min |

## 🎯 Core Principles

1. **Tokens First** - All design decisions are tokenized
2. **Constraints Enable Quality** - 3 surfaces, 2 shadows, 8px scale prevents chaos
3. **Composable Primitives** - Build with reusable components
4. **Accessible by Default** - Semantic HTML, proper contrast, keyboard support
5. **Performant** - CSS-only tokens, thin components, no runtime overhead
6. **Themeable** - Automatic light/dark switching

## 🚀 Get Started Now

### 5-Minute Path
```
1. Read: FIVE_MINUTE_START.md (5 min)
2. Copy a code sample
3. You're done!
```

### 30-Minute Path
```
1. Read: DESIGN_SYSTEM_QUICK_REF.md (10 min)
2. Review: DESIGN_SYSTEM_VISUAL_REF.md (15 min)
3. Copy patterns from: DESIGN_SYSTEM.md (5 min)
```

### 1-Hour Path
```
1. Read: DESIGN_SYSTEM.md (30 min)
2. Review: DESIGN_SYSTEM_VISUAL_REF.md (15 min)
3. Use: IMPLEMENTATION_CHECKLIST.md (15 min)
```

## 🔍 Project Status

- ✅ **Phase 1**: Design tokens - COMPLETE
- ✅ **Phase 2**: UI primitives - COMPLETE
- 🔄 **Phase 3**: Dashboard layout - DOCUMENTED, READY
- 📋 **Phase 4**: Chart polish - DOCUMENTED, READY
- 📋 **Phase 5**: Testing & validation - DOCUMENTED, READY

## 💡 Key Files

### Components
- `ui/src/components/Card.jsx` - Card component family
- `ui/src/components/Pill.jsx` - Badge/status component
- `ui/src/components/IconButton.jsx` - Icon button
- `ui/src/components/SectionHeader.jsx` - Section divider
- `ui/src/components/index.js` - Centralized exports

### Tokens
- `ui/src/styles.css` - Root token definitions (lines 1-85+)

### Documentation
- 8 comprehensive markdown files (3000+ lines total)
- Multi-level from quick start to detailed reference
- Code examples and visual guides

## 📞 Need Help?

1. **Quick question?** → [FIVE_MINUTE_START.md](./FIVE_MINUTE_START.md)
2. **Token reference?** → [DESIGN_SYSTEM_QUICK_REF.md](./DESIGN_SYSTEM_QUICK_REF.md)
3. **Component API?** → [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md)
4. **Visual reference?** → [DESIGN_SYSTEM_VISUAL_REF.md](./DESIGN_SYSTEM_VISUAL_REF.md)
5. **Building something?** → [IMPLEMENTATION_CHECKLIST.md](./IMPLEMENTATION_CHECKLIST.md)
6. **Lost?** → [DESIGN_DOCUMENTATION_INDEX.md](./DESIGN_DOCUMENTATION_INDEX.md)

## ✨ Ready to Build?

Pick one:
- 🚀 **Quick Start**: [FIVE_MINUTE_START.md](./FIVE_MINUTE_START.md)
- 📖 **Learn System**: [DESIGN_SYSTEM_QUICK_REF.md](./DESIGN_SYSTEM_QUICK_REF.md)
- 🏗️ **Build Component**: [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md)
- 📊 **Refactor Dashboard**: [PHASE3_DASHBOARD_REFACTORING.md](./PHASE3_DASHBOARD_REFACTORING.md)

## 🎓 Remember

✅ Use tokens for everything (no hardcoded colors/spacing)
✅ Use primitive components (Card, Pill, IconButton, SectionHeader)
✅ Test in both light and dark themes
✅ Check keyboard navigation
✅ Verify color contrast (WCAG AA)
✅ Use the checklist before submitting

---

**Let's build something beautiful! 🎨**

Start with: [FIVE_MINUTE_START.md](./FIVE_MINUTE_START.md)
