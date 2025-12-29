# Proposal: Unified Studio Architecture

To solve the "fragmented workflow" issue, we will pivot to a **Single-Screen Studio** model.

## Core Concept
Instead of navigating between "Home", "Library", "Templates", and "Detail", the user stays in **one powerful workspace**.

## The Layout

### 1. Left Panel: Assets & Resources (Collapsible)
*   **Product Drawer**: Drag & drop products into the canvas.
*   **Template Drawer**: Browse and apply styles/templates instantly.
*   **Brand Context**: Quick-switch between brand profiles/voices.

### 2. Center: The Canvas (Generation)
*   **Input**: Prompt bar (always visible).
*   **Stage**: The generated image (Large).
*   **History Timeline**: Visual filmstrip of previous versions (bottom).

### 3. Right Panel: The Inspector (Action Suite)
*   **Edit**: Refine the current image (Canvas-aware).
*   **Copywriting**: Generate ad copy side-by-side with the image.
*   **Ask AI**: Reasoning/Chat context for the current generation.
*   **Details**: Metadata, resolution, download.

## Merged Actions
*   **"Generate"** -> happens in place.
*   **"Edit"** -> happens in place (no redirect to `/generation/:id`).
*   **"Brand Profile"** -> becomes a "Context Setting" (like a preset) rather than a separate admin page.

## Benefits
*   **Speed**: No page loads or context switching.
*   **Context**: You can see your Product, Template, and Copy while editing the Image.
*   **Flow**: Linear progression (Assets -> Prompt -> Image -> Copy) in one view.
