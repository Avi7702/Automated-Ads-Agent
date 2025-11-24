# Product Content Studio V3

## Overview

Product Content Studio V3 is a production-ready AI-powered product photo transformation application that uses Google Gemini AI (gemini-2.5-flash-image model) to generate professional marketing content from user-uploaded product photos. Users upload product images, describe their desired transformation in natural language, and receive professionally generated marketing visuals without navigating through menus or feature selections.

The application is a full-stack production system with PostgreSQL persistence, file storage, generation history, gallery views, re-editing capabilities, and draft auto-save. All generated images and metadata are permanently stored and can be accessed, downloaded, or refined later.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React with TypeScript using Vite as the build tool

**UI Components**: shadcn/ui component library with Radix UI primitives for accessible, customizable components

**Styling**: TailwindCSS v4 with custom theme variables for consistent design system

**Routing**: Wouter for lightweight client-side routing with three main routes:
- Home (`/`) - Main upload and transformation interface
- Gallery (`/gallery`) - View all generated transformations
- Generation Detail (`/generation/:id`) - View individual generation details

**State Management**: 
- TanStack Query (React Query) for server state and API caching
- Local React state for UI interactions
- localStorage for draft persistence and re-editing capabilities

**Key Features**:
- Multi-file upload support (up to 6 images, 10MB each) using Multer
- Real-time prompt drafting with 500ms debounced auto-save to localStorage
- Intent visualization that analyzes user prompts and displays detected transformation types
- Demo mode with pre-generated example transformations
- Full generation history with persistent storage
- Gallery view with thumbnail grid, search, and delete functionality
- Generation detail page with full-size preview, before/after comparison
- Re-edit functionality: automatically restores original images from storage for refinement
- One-click download of generated marketing images

### Backend Architecture

**Runtime**: Node.js with Express.js server

**Development/Production Split**:
- Development mode uses Vite middleware for HMR and fast refresh
- Production mode serves pre-built static assets from dist directory
- Separate entry points (`index-dev.ts` and `index-prod.ts`) for each environment

**API Endpoints**:
- `POST /api/transform` - Image transformation endpoint accepting multiple files and text prompt, saves to database and disk
- `GET /api/generations` - Retrieve all generation history (ordered by creation date, limit 50)
- `GET /api/generations/:id` - Retrieve specific generation by ID with full metadata
- `DELETE /api/generations/:id` - Delete generation from database and remove associated files from disk
- Static file serving from `/attached_assets` via Express static middleware

**File Storage Strategy**:
- Local filesystem storage in `attached_assets/generations/` directory
- Separate subdirectories for originals and results (`/originals` and `/results`)
- UUID-based file naming to prevent collisions
- Files stored with relative paths for portability
- Automatic directory creation with recursive mkdir on first write
- Safe file deletion with error handling
- Static file serving via Express middleware for browser access

### Data Storage

**Database**: PostgreSQL accessed via Neon serverless driver

**ORM**: Drizzle ORM for type-safe database operations

**Schema Design**:
```typescript
generations {
  id: varchar (primary key, auto-generated UUID)
  prompt: text (user's transformation description)
  originalImagePaths: text[] (array of paths to uploaded images)
  generatedImagePath: text (path to AI-generated result)
  resolution: varchar (default "2K")
  createdAt: timestamp (auto-set)
}
```

**Migration Strategy**: Schema defined in `shared/schema.ts`, pushed directly to database using `npm run db:push` (schema-first development with Drizzle Kit)

**Production Features**:
- Full CRUD operations via storage interface (server/storage.ts)
- Automatic file cleanup when deleting generations
- File path storage (not base64) for efficient retrieval
- Timestamp tracking for all generations

### AI Integration

**Model**: Google Gemini 2.5 Flash Image (gemini-2.5-flash-image) via `@google/genai` SDK and Replit AI Integrations

**Integration Method**: Uses Replit's AI Integrations for seamless API key management - no user API key required, billed to Replit credits

**Configuration**:
- Google Search tool enabled for product research and grounding
- Multi-image input support for combining products or reference images
- Response modality configured for both IMAGE generation and TEXT analysis
- API key provided via `AI_INTEGRATIONS_GEMINI_API_KEY` environment variable

**Prompt Engineering**:
- Single-image prompts focus on transformation while maintaining product identity
- Multi-image prompts combine products or create composite scenes
- Guidelines embedded in prompts ensure photorealistic output, professional lighting, and marketing-ready quality

### External Dependencies

**Third-Party Services**:
- Google Generative AI (Gemini 3 Pro Image) - Core image transformation
- Neon Database - PostgreSQL serverless hosting
- Replit platform integrations (optional development tools)

**Key Libraries**:
- `@google/genai` - Google Gemini API client
- `@neondatabase/serverless` - Neon PostgreSQL driver
- `drizzle-orm` - Database ORM
- `multer` - Multipart form data handling
- `@tanstack/react-query` - Server state management
- `wouter` - Client-side routing
- `date-fns` - Date formatting
- `zod` - Schema validation via Drizzle

**Development Tools**:
- Vite plugins for development banner, cartographer, and runtime error overlay (Replit-specific)
- Custom Vite plugin for meta image URL transformation
- TypeScript with strict mode and path aliases

**Font Resources**: Google Fonts (Space Grotesk for display, Inter for body text)