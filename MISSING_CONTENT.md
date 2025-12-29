# Missing Content & Empty Areas

This document lists areas in the system that are currently using placeholders, generic data, or are completely empty.

## 1. Product Descriptions
**Status:** 🔴 **Missing / Transient**
- **Issue:** The `products` database table does not have a `description` column.
- **Current State:** Providing a description is manual or relies on hidden Analysis data.
- **Goal:** We need to auto-generate a user-friendly description for every uploaded product (e.g., "Galvanized steel mesh spacing bracket, 50mm") and save it so you can edit it.

## 2. Image Templates (Scenes)
**Status:** 🟠 **Generic / Placeholder**
- **Issue:** The current templates (`seedPromptTemplates.ts`) are for generic lifestyle brands (e.g., "Morning Coffee", "Yoga Studio", "Beach").
- **Missing:** Construction, Industrial, and Site-specific templates suitable for NDS.
- **Goal:** Replace/augment these with:
    -   *Construction Site (Trench)*
    -   *Warehouse Storage*
    -   *Concrete Pour Setup*
    -   *Architectural Blueprint Overlay*

## 3. Brand Profile
**Status:** 🔴 **Empty**
- **Issue:** The `BrandProfile` table exists but is currently empty/unused in generation.
- **Goal:** Scan your `NDS` folder (once provided) to fill this with:
    -   **Voice:** "Professional, Authoritative, Technical"
    -   **Visuals:** "High-contrast, Industrial, Clean Lines"
    -   **Values:** "Reliability, Speed, Precision"

## 4. Copywriting Prompts
**Status:** 🟢 **Functional but Rigid**
- **Issue:** The prompts for writing ads are hardcoded logic in the code (`copywritingService.ts`).
- **Goal:** Move these to a "Prompt Library" so you can tweak the "Formula" for how an ad is written without changing code.

## 5. Vision Analysis Tags
**Status:** 🟡 **Hidden**
- **Issue:** The AI analyzes your images (detecting "metal", "silver", "industrial"), but this data is currently hidden in the background.
- **Goal:** Show these tags in the UI so you can correct them (e.g., if it thinks a "Spacer" is a "Paperweight").
