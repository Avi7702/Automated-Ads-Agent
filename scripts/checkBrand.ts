import "dotenv/config";
import { db } from "../server/db";
import { brandProfiles } from "@shared/schema";

async function checkBrand() {
    const profiles = await db.select().from(brandProfiles);
    console.log("Brand Profiles Found:", profiles.length);
    if (profiles.length > 0) {
        console.log("First Profile Values:", profiles[0].brandValues);
        console.log("First Profile Voice:", profiles[0].voice);
    }
}

checkBrand().catch(console.error).then(() => process.exit(0));
