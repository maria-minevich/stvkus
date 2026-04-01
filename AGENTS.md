# AGENTS.md - Столичный Вкус Cafe Website

## Project Overview

Static HTML/CSS/JS website for a cafe located in BЦ "Искра-парк". Two main pages:
- `index.html` - Main website (menu, about, contacts)
- `admin.html` - Admin panel for managing menu items and orders

No build system, no package manager, no tests. This is a vanilla static site.

## Development

### Running the Project

Simply open `index.html` or `admin.html` in a browser. For local development:
```bash
# macOS
open index.html
open admin.html

# Or serve locally with any HTTP server
python3 -m http.server 8000
```

### No Build Commands

There is no build process. Edit files directly.

### No Test Commands

No automated tests exist for this project.

## Code Style Guidelines

### HTML

- Use semantic HTML5 elements (`<header>`, `<nav>`, `<main>`, `<section>`, `<footer>`)
- Always include `lang` attribute on `<html>` (use `lang="ru"` for Russian content)
- Include `<meta charset="UTF-8">` and viewport meta tag
- Use `preconnect` for external resources (fonts, CDNs)
- External CDN resources should be pinned to specific versions
- Use double quotes for all attribute values

### CSS

- Use CSS custom properties (variables) for colors and reusable values
- Define variables in `:root` at the top of `<style>` block
- Use BEM-like class naming: `.block`, `.block__element`, `.block--modifier`
- Keep styles in `<style>` block within `<head>` (no external CSS files)
- Use mobile-first responsive approach with `@media (min-width: ...)`
- Use Flexbox and CSS Grid for layouts, avoid floats
- Use `rem` for font sizes, `px` for borders/shadows
- Group related styles together, use alphabetical order for properties

### JavaScript

- Place scripts at end of `<body>` before closing tag
- Use vanilla JavaScript only (no frameworks)
- Use `const` and `let`; avoid `var`
- Use ES6+ features: arrow functions, template literals, destructuring
- Use `document.addEventListener('DOMContentLoaded', ...)` for initialization
- Prefer CSS classes for UI state changes over inline style manipulation
- Use meaningful variable and function names in Russian or English
- Comment complex logic in Russian (consistent with project language)

### Naming Conventions

- **Classes/IDs**: lowercase with hyphens (`.main-menu`, `#contact-section`)
- **Variables/Functions**: camelCase (`updateMenuItem`, `currentCategory`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_FILE_SIZE`, `API_ENDPOINT`)
- **Files**: lowercase with hyphens (`admin.html`, `script.js`)

### Error Handling

- Use `try...catch` for operations that may fail (file parsing, API calls)
- Display user-friendly error messages in the UI
- Log errors to console with descriptive messages
- Validate all user inputs before processing

### Accessibility

- Include `alt` attributes on all `<img>` elements
- Use `<button>` for clickable actions, `<a>` for navigation
- Ensure sufficient color contrast (WCAG AA minimum)
- Use proper heading hierarchy (`h1` → `h2` → `h3`)
- Include `aria-label` for icon-only buttons

### Performance

- Minimize external dependencies (CDN links)
- Use lazy loading for images: `<img loading="lazy">`
- Keep CSS and JS minimal
- Use web fonts efficiently with `font-display: swap`

## Project Structure

```
/stvkus
├── index.html      # Main website (~1750 lines)
├── admin.html      # Admin panel (~1700 lines)
└── AGENTS.md       # This file
```

## Common Tasks

### Adding a Menu Category
1. Edit `admin.html`
2. Find category creation form
3. Add new category with name and display order

### Editing Menu Items
1. Open `admin.html`
2. Use the menu editor section
3. Modify items and click "Сохранить" to persist

### Modifying Styles
1. Edit the `<style>` block in respective HTML file
2. CSS variables defined in `:root` control theming
3. Current variables: `--highlight`, `--border`, `--dark`, `--gray`, `--light-gray`

### Modifying JavaScript
1. Edit the `<script>` block at bottom of respective HTML file
2. All logic is inline (no separate JS files)