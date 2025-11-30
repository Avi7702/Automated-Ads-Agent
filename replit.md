# Product Content Studio V3

## Overview

Product Content Studio V3 is a production-ready AI-powered product photo transformation application that uses Google Gemini AI (gemini-3-pro-image-preview model) to generate professional marketing content from user-uploaded product photos. Users upload product images, describe their desired transformation in natural language, and receive professionally generated marketing visuals without navigating through menus or feature selections.

The application is a full-stack production system with PostgreSQL persistence, file storage, generation history, gallery views, re-editing capabilities, and draft auto-save. All generated images and metadata are permanently stored and can be accessed, downloaded, or refined later.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React with TypeScript using Vite as the build tool

**UI Components**: shadcn/ui component library with Radix UI primitives for accessible, customizable components

**Styling**: TailwindCSS v4 with custom theme variables for consistent design system

**Routing**: Wouter for lightweight client-side routing with four main routes:
- Home (`/`) - Main upload and transformation interface
- Product Library (`/library`) - Upload and manage reusable product catalog with Cloudinary storage
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
- Product Library with Cloudinary storage for reusable product catalog
- AI-powered prompt suggestions using Gemini and curated templates
- Full generation history with persistent storage
- Gallery view with thumbnail grid, search, and delete functionality
- Generation detail page with full-size preview, before/after comparison
- Multi-turn editing: make targeted tweaks to generated images using conversation history (preserves AI context)
- Quick edit presets: Warmer lighting, Cooler tones, Add shadows, Softer look, More contrast, Blur background
- Edit lineage tracking: see which generation an edit was based on
- One-click download of generated marketing images

### Backend Architecture

**Runtime**: Node.js with Express.js server

**Development/Production Split**:
- Development mode uses Vite middleware for HMR and fast refresh
- Production mode serves pre-built static assets from dist directory
- Separate entry points (`index-dev.ts` and `index-prod.ts`) for each environment

**API Endpoints**:
- `POST /api/transform` - Image transformation endpoint accepting multiple files and text prompt, saves to database and disk with conversation history
- `GET /api/generations` - Retrieve all generation history (ordered by creation date, limit 50)
- `GET /api/generations/:id` - Retrieve specific generation by ID with full metadata and canEdit flag
- `POST /api/generations/:id/edit` - Multi-turn edit endpoint using stored conversation history for targeted tweaks
- `DELETE /api/generations/:id` - Delete generation from database and remove associated files from disk
- `POST /api/products` - Upload product to Cloudinary with MIME type validation (images only, 10MB max)
- `GET /api/products` - Retrieve all products from library
- `DELETE /api/products/:id` - Delete product from Cloudinary and database
- `GET /api/prompt-templates` - Get curated prompt templates (optional category filter)
- `POST /api/prompt-suggestions` - Generate AI-powered prompt variations using Gemini
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
  conversationHistory: jsonb (stores full Gemini conversation for multi-turn editing)
  parentGenerationId: varchar (links edited generations to their parent)
  editPrompt: text (the edit instruction that created this generation)
  createdAt: timestamp (auto-set)
}

products {
  id: varchar (primary key, auto-generated UUID)
  name: text (product name)
  cloudinaryUrl: text (permanent Cloudinary storage URL)
  cloudinaryPublicId: text (for deletion from Cloudinary)
  category: text (optional: lifestyle, professional, outdoor, etc.)
  createdAt: timestamp (auto-set)
}

promptTemplates {
  id: varchar (primary key, auto-generated UUID)
  prompt: text (curated prompt template)
  category: text (lifestyle, professional, outdoor, urban, nature, luxury)
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

**Model**: Google Gemini 3 Pro Image (gemini-3-pro-image-preview) via `@google/genai` SDK and Replit AI Integrations

**Integration Method**: Uses Replit's AI Integrations for seamless API key management - no user API key required, billed to Replit credits

**Configuration**:
- Google Search tool enabled for product research and grounding
- Multi-image input support for combining products or reference images
- Response modality configured for both IMAGE generation and TEXT analysis
- API key provided via `AI_INTEGRATIONS_GEMINI_API_KEY` environment variable
- Base URL and empty apiVersion required via httpOptions for Replit AI Integrations
- Prompt suggestion feature uses gemini-2.0-flash model for creative variations

**Prompt Engineering**:
- Single-image prompts focus on transformation while maintaining product identity
- Multi-image prompts combine products or create composite scenes
- Guidelines embedded in prompts ensure photorealistic output, professional lighting, and marketing-ready quality

### External Dependencies

**Third-Party Services**:
- Google Generative AI (Gemini 3 Pro Image) - Core image transformation
- Google Generative AI (Gemini 2.0 Flash) - Prompt suggestion generation
- Cloudinary - Product library cloud storage with automatic uploads
- Neon Database - PostgreSQL serverless hosting
- Replit AI Integrations - Automatic API key management for Gemini

**Key Libraries**:
- `@google/genai` - Google Gemini API client
- `cloudinary` - Cloud image storage SDK
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

## Product Library Feature

**Purpose**: Reusable product catalog with permanent cloud storage

**Workflow**:
1. Users upload products to Cloudinary (persistent storage, not temporary)
2. Products stored with name, category, and unique ID
3. Library displays products in grid with hover controls
4. Click "Use" to load product into generation flow
5. Products persist across sessions for repeated use

**Cloudinary Sync Feature**:
- One-click import of existing Cloudinary images into the app
- "Sync from Cloudinary" button fetches all images from Cloudinary account
- Automatically imports new products and skips duplicates
- Extracts product names from Cloudinary public_id paths
- Toast notification shows import statistics (imported, skipped, total)
- Supports up to 500 images per sync (configurable)

**Security Measures**:
- MIME type validation (image/jpeg, image/png, image/gif, image/webp only)
- File size limit enforcement (10MB maximum)
- Graceful error handling if Cloudinary credentials missing
- Environment variable validation at startup
- Duplicate detection prevents re-importing existing products

## AI Prompt Suggestions

**Purpose**: Help users discover creative transformation ideas

**How It Works**:
1. Backend stores 15 curated prompt templates across 6 categories
2. User clicks "Get AI Prompt Ideas" button
3. System fetches relevant templates based on product category
4. Gemini generates 4 creative variations of the templates
5. User can click any suggestion to auto-fill prompt field
6. Refresh button generates new variations

**Security Measures**:
- Input sanitization (removes special characters, limits length)
- Response validation (ensures array format, limits to 4 suggestions)
- Fallback to template prompts if AI generation fails
- Input validation for required fields

**Template Categories**: Lifestyle, Professional, Outdoor, Urban, Nature, Luxury

## Known Limitations

**Authentication**: Currently no user authentication or session management. API endpoints are publicly accessible.

**Rate Limiting**: No rate limiting on Gemini API calls. In production, consider implementing:
- Per-IP request throttling
- API key authentication for external access
- User quotas for AI generation credits
- CAPTCHA for abuse prevention

**Future Improvements**:
- Add authentication system (Replit Auth recommended)
- Implement rate limiting middleware (e.g., express-rate-limit)
- Add usage analytics and quota tracking
- Server-side file type sniffing for enhanced upload security