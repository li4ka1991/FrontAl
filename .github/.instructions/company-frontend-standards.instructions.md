---
description: Company frontend engineering standards and subagent routing
applyTo: all frontend-related files (HTML, CSS, JS, etc.)
---

### Purpose & Philosophy

- **Goal of this rule**  
  - The company's primary frontend goals is search engine optimisation and good performance. Also consistency and accessibility.
- **AI behavior expectations**  
  - The AI should behave on senior level.

### Code review mindset

- The AI should suggest performance and consistency improvements, not just apply changes.

### Technology-Specific Standards

If some functionality can be done with CSS instead of JS - do that - e.g. animations, simple tabs, etc.

#### JavaScript / TypeScript

When working on JavaScript files, the AI should call the `javascript-expert` subagent, which specializes in JavaScript best practices, patterns, and performance optimizations. This subagent will ensure that all JavaScript code adheres to the project's standards for readability, maintainability, and efficiency.

#### CSS / Styling

When working on CSS, SCSS, or SASS files, the AI should call the `css-expert` subagent. It determines the styling related practices.

#### HTML / Markup

When working on HTML files, the AI should call the `html-expert` subagent, which specializes in semantic markup, accessibility, and SEO best practices. This subagent will ensure that all HTML code is structured correctly, uses appropriate tags, and follows guidelines for accessibility and search engine optimization.

#### Accessibility (A11y)

Short intent: Make accessibility a first-class requirement, not an afterthought. Add rules for alt text, ARIA use, keyboard navigation, focus management.

#### Performance

Keep apps fast by default and intentional about tradeoffs.

### Subagent Routing

- **Primary mapping**  
  - `**/*.js`, `**/*.jsx`, `**/*.ts`, `**/*.tsx` → `javascript-expert`
  - `**/*.css`, `**/*.scss`, `**/*.sass`, `**/*.less`, `**/*.tailwind.*` → `css-expert`
  - `**/*.html`, `**/*.htm`, `**/*.hbs`, `**/*.twig` → `html-expert`

- **Mixed or multi-language files**  
  - For React/TSX with CSS-in-JS: default to `javascript-expert` but apply `css-expert` principles for styling blocks (naming, responsive rules, tokens).
  - For PHP templates with embedded HTML/CSS/JS: default to `wordpress-php-backend-expert`, but apply `html-expert`, `css-expert`, and `javascript-expert` standards within their respective regions.
  - For Markdown or other content files with embedded code fences: prioritize the expert that matches the fence language while respecting any global standards from this rule.
  - When unsure, prefer the subagent that matches the dominant language of the file, but mention any assumptions in the explanation.

