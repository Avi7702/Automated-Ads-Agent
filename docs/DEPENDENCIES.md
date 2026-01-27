# Dependencies Inventory

**Total:** 90 production + 33 dev + 1 optional = 124 total dependencies

---

## Production Dependencies (90)

### AI & External Services (4)
| Package | Version | Purpose |
|---------|---------|---------|
| @google/genai | ^1.30.0 | Google Gemini AI API (ad generation, vision) |
| @mendable/firecrawl-js | ^4.10.0 | Web scraping and content extraction |
| @sentry/node | ^10.32.1 | Error tracking and monitoring |
| cloudinary | ^2.8.0 | Image storage and CDN |

### Database & ORM (6)
| Package | Version | Purpose |
|---------|---------|---------|
| @neondatabase/serverless | ^1.0.2 | Neon serverless PostgreSQL driver |
| drizzle-kit | ^0.31.4 | Drizzle ORM schema migrations |
| drizzle-orm | ^0.39.1 | Type-safe SQL ORM |
| drizzle-zod | ^0.7.0 | Zod schema generation from Drizzle |
| pg | ^8.11.3 | PostgreSQL client |
| ioredis | ^5.8.2 | Redis client for caching |

### Authentication & Security (9)
| Package | Version | Purpose |
|---------|---------|---------|
| bcrypt | ^6.0.0 | Password hashing |
| jsonwebtoken | ^9.0.3 | JWT token generation/validation |
| passport | ^0.7.0 | Authentication middleware |
| passport-local | ^1.0.0 | Local username/password auth |
| helmet | ^8.1.0 | Security headers middleware |
| express-rate-limit | ^8.2.1 | Rate limiting |
| express-session | ^1.18.2 | Session management |
| connect-pg-simple | ^10.0.0 | PostgreSQL session store |
| connect-timeout | ^1.9.1 | Request timeout middleware |

### Server Framework (4)
| Package | Version | Purpose |
|---------|---------|---------|
| express | ^5.2.1 | HTTP server framework |
| dotenv | ^17.2.3 | Environment variable loading |
| ws | ^8.18.0 | WebSocket server |
| pino | ^10.1.0 | Structured JSON logging |
| pino-pretty | ^13.1.3 | Pretty-print logs in dev |

### File Handling (4)
| Package | Version | Purpose |
|---------|---------|---------|
| multer | ^2.0.2 | Multipart form data (file uploads) |
| file-type | ^21.3.0 | File type detection |
| file-saver | ^2.0.5 | Client-side file saving |
| jszip | ^3.10.1 | ZIP file generation |

### React & Frontend (5)
| Package | Version | Purpose |
|---------|---------|---------|
| react | ^19.2.3 | UI library |
| react-dom | ^19.2.3 | React DOM renderer |
| wouter | ^3.3.5 | Client-side routing |
| @tanstack/react-query | ^5.60.5 | Server state management |
| next-themes | ^0.4.6 | Theme management |

### UI Components - Radix UI (28)
| Package | Version | Purpose |
|---------|---------|---------|
| @radix-ui/react-accordion | ^1.2.12 | Accordion component |
| @radix-ui/react-alert-dialog | ^1.1.15 | Alert dialog component |
| @radix-ui/react-aspect-ratio | ^1.1.8 | Aspect ratio container |
| @radix-ui/react-avatar | ^1.1.11 | Avatar component |
| @radix-ui/react-checkbox | ^1.3.3 | Checkbox component |
| @radix-ui/react-collapsible | ^1.1.12 | Collapsible component |
| @radix-ui/react-context-menu | ^2.2.16 | Context menu component |
| @radix-ui/react-dialog | ^1.1.15 | Dialog/modal component |
| @radix-ui/react-dropdown-menu | ^2.1.16 | Dropdown menu component |
| @radix-ui/react-hover-card | ^1.1.15 | Hover card component |
| @radix-ui/react-label | ^2.1.8 | Label component |
| @radix-ui/react-menubar | ^1.1.16 | Menubar component |
| @radix-ui/react-navigation-menu | ^1.2.14 | Navigation menu component |
| @radix-ui/react-popover | ^1.1.15 | Popover component |
| @radix-ui/react-progress | ^1.1.8 | Progress bar component |
| @radix-ui/react-radio-group | ^1.3.8 | Radio group component |
| @radix-ui/react-scroll-area | ^1.2.10 | Scroll area component |
| @radix-ui/react-select | ^2.2.6 | Select dropdown component |
| @radix-ui/react-separator | ^1.1.8 | Separator component |
| @radix-ui/react-slider | ^1.3.6 | Slider component |
| @radix-ui/react-slot | ^1.2.4 | Slot component (composition) |
| @radix-ui/react-switch | ^1.2.6 | Switch/toggle component |
| @radix-ui/react-tabs | ^1.1.13 | Tabs component |
| @radix-ui/react-toast | ^1.2.7 | Toast notification component |
| @radix-ui/react-toggle | ^1.1.10 | Toggle button component |
| @radix-ui/react-toggle-group | ^1.1.11 | Toggle group component |
| @radix-ui/react-tooltip | ^1.2.8 | Tooltip component |

### UI Libraries & Styling (9)
| Package | Version | Purpose |
|---------|---------|---------|
| class-variance-authority | ^0.7.1 | Component variant styling |
| clsx | ^2.1.1 | Conditional className utility |
| tailwind-merge | ^3.3.1 | Tailwind class merging |
| tailwindcss-animate | ^1.0.7 | Tailwind animation utilities |
| tw-animate-css | ^1.4.0 | Tailwind CSS animations |
| lucide-react | ^0.545.0 | Icon library (5000+ icons) |
| sonner | ^2.0.7 | Toast notifications |
| vaul | ^1.1.2 | Drawer component |
| cmdk | ^1.1.1 | Command menu component |

### React Components & Utilities (7)
| Package | Version | Purpose |
|---------|---------|---------|
| react-hook-form | ^7.66.0 | Form state management |
| @hookform/resolvers | ^5.2.2 | Validation resolvers for RHF |
| react-dropzone | ^14.3.8 | Drag & drop file uploads |
| react-resizable-panels | ^4.0.16 | Resizable panel layouts |
| react-day-picker | ^9.11.1 | Date picker component |
| embla-carousel-react | ^8.6.0 | Carousel component |
| input-otp | ^1.4.2 | OTP input component |

### Data Visualization & Flow (3)
| Package | Version | Purpose |
|---------|---------|---------|
| recharts | ^2.15.4 | Chart components |
| @xyflow/react | ^12.10.0 | Flow diagrams / node graphs |
| framer-motion | ^12.23.26 | Animation library |

### Validation & Types (7)
| Package | Version | Purpose |
|---------|---------|---------|
| zod | ^4.2.1 | Schema validation |
| zod-validation-error | ^5.0.0 | Zod error formatting |
| @types/bcrypt | ^6.0.0 | TypeScript types for bcrypt |
| @types/jsonwebtoken | ^9.0.10 | TypeScript types for JWT |
| @types/multer | ^2.0.0 | TypeScript types for multer |

### Utilities (4)
| Package | Version | Purpose |
|---------|---------|---------|
| date-fns | ^4.1.0 | Date manipulation |
| nanoid | ^5.1.6 | Unique ID generation |
| uuid | ^13.0.0 | UUID generation |
| memorystore | ^1.6.7 | Memory session store |
| @jridgewell/trace-mapping | ^0.3.25 | Source map utilities |

---

## Dev Dependencies (33)

### Testing - E2E (1)
| Package | Version | Purpose |
|---------|---------|---------|
| @playwright/test | ^1.57.0 | End-to-end browser testing |

### Testing - Unit/Integration (6)
| Package | Version | Purpose |
|---------|---------|---------|
| vitest | ^4.0.16 | Test runner |
| @vitest/coverage-v8 | ^4.0.16 | Code coverage |
| @testing-library/react | ^16.3.1 | React component testing |
| @testing-library/jest-dom | ^6.9.1 | Jest DOM matchers |
| jsdom | ^27.4.0 | DOM implementation for Node |
| supertest | ^7.1.4 | HTTP assertion library |

### Build Tools (5)
| Package | Version | Purpose |
|---------|---------|---------|
| vite | ^7.1.9 | Frontend build tool |
| @vitejs/plugin-react | ^5.0.4 | React plugin for Vite |
| esbuild | ^0.25.12 | Fast JavaScript bundler |
| tsx | ^4.20.5 | TypeScript execution engine |
| cross-env | ^10.1.0 | Cross-platform env vars |

### Vite Plugins (3)
| Package | Version | Purpose |
|---------|---------|---------|
| @replit/vite-plugin-cartographer | ^0.4.4 | Code mapping |
| @replit/vite-plugin-dev-banner | ^0.1.1 | Dev mode banner |
| @replit/vite-plugin-runtime-error-modal | ^0.0.3 | Error overlay |

### TypeScript & Types (13)
| Package | Version | Purpose |
|---------|---------|---------|
| typescript | 5.6.3 | TypeScript compiler |
| @types/node | ^25.0.3 | Node.js types |
| @types/react | ^19.2.7 | React types |
| @types/react-dom | ^19.2.3 | React DOM types |
| @types/express | 5.0.6 | Express types |
| @types/express-session | ^1.18.0 | Express session types |
| @types/passport | ^1.0.16 | Passport types |
| @types/passport-local | ^1.0.38 | Passport local types |
| @types/pg | ^8.11.0 | PostgreSQL types |
| @types/ws | ^8.5.13 | WebSocket types |
| @types/supertest | ^6.0.3 | Supertest types |
| @types/file-saver | ^2.0.7 | file-saver types |
| @types/connect-pg-simple | ^7.0.3 | connect-pg-simple types |
| @types/connect-timeout | ^1.9.0 | connect-timeout types |

### Styling (3)
| Package | Version | Purpose |
|---------|---------|---------|
| tailwindcss | ^4.1.14 | Utility-first CSS framework |
| @tailwindcss/vite | ^4.1.14 | Tailwind Vite plugin |
| autoprefixer | ^10.4.21 | CSS vendor prefixing |
| postcss | ^8.5.6 | CSS transformation |

---

## Optional Dependencies (1)

| Package | Version | Purpose |
|---------|---------|---------|
| bufferutil | ^4.0.8 | WebSocket performance optimization |

---

## Dependency Categories Summary

| Category | Count |
|----------|-------|
| **UI Components** | 37 (28 Radix + 9 other) |
| **Backend/Server** | 23 |
| **Testing** | 7 |
| **Build Tools** | 8 |
| **TypeScript Types** | 18 |
| **AI/External APIs** | 4 |
| **Utilities** | 11 |
| **Styling** | 13 |
| **Optional** | 1 |

---

## Version Control

- **Node.js:** >=20.0.0
- **Package Manager:** npm
- **TypeScript:** 5.6.3
- **React:** 19.2.3
- **Express:** 5.2.1

---

## Notes

- **Removed:** `framer-motion` was noted as removed but is still present (v12.23.26)
- **Security:** All auth/security packages are up to date
- **AI:** Single AI provider (Google Gemini via @google/genai)
- **Database:** PostgreSQL only (via Neon serverless)
- **Testing:** 229 tests across unit/integration/E2E suites

---

**Last Updated:** 2026-01-26
**Project:** Automated-Ads-Agent
