import "dotenv/config";
import { storage } from "../storage";
import { brandProfiles } from "@shared/schema";
import { db } from "../db";
import { eq } from "drizzle-orm";

export async function seedBrandProfile() {
    console.log("🌱 Seeding NDS Brand Profile...");

    // 1. Get the primary user (for now, assume first user or specific email if needed)
    // In a real app we'd map this to the specific logged-in user, but for single-tenant agency:
    const users = await helpers.getUsers();
    if (users.length === 0) {
        console.log("⚠️ No users found. Skipping Brand Profile seed. Create a user first.");
        return;
    }
    const userId = users[0].id;

    // 2. Define NDS Brand Data (Extracted from NDS Branding Docs)
    const ndsProfile = {
        userId: userId,
        brandName: "Next Day Steel",
        industry: "Construction Materials & Reinforcement",
        brandValues: [
            "Speed & Reliability",
            "Problem-Solving Attitude",
            "Inclusivity (DIY to Enterprise)",
            "Practical & Direct",
            "Customer-First"
        ],
        targetAudience: {
            demographics: "SME Construction Companies, Groundworkers, Piling Contractors, Active DIYers",
            psychographics: "Valuates speed over bureaucracy, needs certainty, practical-minded, time-poor",
            painPoints: [
                "Project delays due to material shortages",
                "Unreliable delivery windows",
                "Suppliers who won't break bulk/serve small orders",
                "Complex ordering processes"
            ]
        },
        preferredStyles: [
            "Industrial",
            "Site-Realistic",
            "Clean Lines",
            "Construction Site Context",
            "High Clarity"
        ],
        colorPreferences: [
            "Orange (Safety)",
            "Silver/Grey (Steel)",
            "Black (Text/Contrast)",
            "White (Backgrounds)"
        ],
        voice: {
            principles: [
                "Competent without being corporate",
                "Efficient but never rushed",
                "Solutions-focused",
                "Approachable Expert"
            ],
            wordsToUse: [
                "Next Day", "Guaranteed", "Reliable", "On-site", "Solution", "Reinforcement", "Mesh", "Rebar"
            ],
            wordsToAvoid: [
                "Maybe", "Try to", "Usually", "Hopefully", "Bespoke (use Custom)", "Artisanal", "Luxury"
            ]
        },
        updatedAt: new Date()
    };

    // 3. Upsert into DB
    try {
        const existing = await db.select().from(brandProfiles).where(eq(brandProfiles.userId, userId));

        if (existing.length > 0) {
            console.log("🔄 Updating existing Brand Profile...");
            await db.update(brandProfiles)
                .set(ndsProfile)
                .where(eq(brandProfiles.userId, userId));
        } else {
            console.log("✨ Creating new Brand Profile...");
            await db.insert(brandProfiles).values(ndsProfile);
        }

        console.log("✅ NDS Brand Profile seeded successfully!");
    } catch (err) {
        console.error("❌ Failed to seed Brand Profile:", err);
    }
}

// Helper to get users without importing whole storage (circular dependency risk)
const helpers = {
    getUsers: async () => {
        return await db.query.users.findMany({ limit: 1 });
    }
};

// CLI execution disabled - this check doesn't work correctly when bundled with esbuild
// The bundled file becomes the "main module" so this would run on every server start
// To seed manually, use: POST /api/admin/seed-brand
