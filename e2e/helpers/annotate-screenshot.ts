import { Page, Locator, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

export interface VerificationCheck {
  label: string;
  locator: Locator;
  soft?: boolean; // if true, don't fail test if element missing
}

export interface CheckResult {
  number: number;
  label: string;
  passed: boolean;
  boundingBox: { x: number; y: number; width: number; height: number } | null;
}

export interface PageVerificationResult {
  pageName: string;
  route: string;
  screenshotFilename: string;
  checks: CheckResult[];
}

/**
 * Verify a list of UI checks, inject SVG annotation overlay, take a full-page
 * screenshot, then remove the overlay.
 *
 * Returns an array of CheckResult for every check (passed or failed).
 */
export async function verifyAndAnnotate(
  page: Page,
  checks: VerificationCheck[],
  screenshotName: string,
): Promise<CheckResult[]> {
  // ---- Phase 1: Run all checks, collect bounding boxes ----
  const results: CheckResult[] = [];

  for (let i = 0; i < checks.length; i++) {
    const check = checks[i]!;
    let passed = false;
    let boundingBox: CheckResult['boundingBox'] = null;

    try {
      await expect(check.locator).toBeVisible({ timeout: 5000 });
      passed = true;
      const bb = await check.locator.boundingBox();
      if (bb) {
        boundingBox = { x: bb.x, y: bb.y, width: bb.width, height: bb.height };
      }
    } catch {
      if (!check.soft) {
        throw new Error(`Hard check #${i + 1} failed: "${check.label}" — element not visible`);
      }
      // Soft check — record failure but continue
      passed = false;
    }

    results.push({
      number: i + 1,
      label: check.label,
      passed,
      boundingBox,
    });
  }

  // ---- Phase 2: Inject SVG overlay with numbered markers ----
  const scrollPos = await page.evaluate(() => ({
    x: window.scrollX,
    y: window.scrollY,
  }));

  const markers = results
    .filter((r) => r.passed && r.boundingBox)
    .map((r) => {
      const bb = r.boundingBox!;
      const cx = bb.x + bb.width - 4 + scrollPos.x;
      const cy = bb.y + 4 + scrollPos.y;
      return { cx, cy, number: r.number };
    });

  await page.evaluate(
    ({ markers: mkrs }) => {
      const existing = document.getElementById('__verification-overlay__');
      if (existing) existing.remove();

      const overlay = document.createElement('div');
      overlay.id = '__verification-overlay__';
      Object.assign(overlay.style, {
        position: 'absolute',
        top: '0',
        left: '0',
        width: `${document.documentElement.scrollWidth}px`,
        height: `${document.documentElement.scrollHeight}px`,
        pointerEvents: 'none',
        zIndex: '999999',
      });

      let svgContent = '';
      for (const m of mkrs) {
        // Drop shadow filter
        svgContent += `
          <filter id="shadow-${m.number}" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="1" stdDeviation="2" flood-opacity="0.3"/>
          </filter>`;
        // Green circle
        svgContent += `
          <circle cx="${m.cx}" cy="${m.cy}" r="14"
            fill="#22c55e" stroke="white" stroke-width="2"
            filter="url(#shadow-${m.number})"/>`;
        // White checkmark inside circle
        svgContent += `
          <path d="${`M${m.cx - 5} ${m.cy} l3 4 l7 -8`}"
            stroke="white" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
        // Number text below circle
        svgContent += `
          <text x="${m.cx}" y="${m.cy + 28}" text-anchor="middle"
            font-size="11" font-weight="bold" font-family="Arial, sans-serif"
            fill="#22c55e" stroke="white" stroke-width="3" paint-order="stroke">
            #${m.number}
          </text>`;
      }

      const svgWidth = document.documentElement.scrollWidth;
      const svgHeight = document.documentElement.scrollHeight;
      overlay.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}"
        style="position:absolute;top:0;left:0;">${svgContent}</svg>`;

      document.body.appendChild(overlay);
    },
    { markers },
  );

  // ---- Phase 3: Screenshot ----
  const screenshotsDir = path.resolve('e2e/test-results/screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  await page.screenshot({
    path: path.join(screenshotsDir, `${screenshotName}.png`),
    fullPage: true,
  });

  // ---- Phase 4: Remove overlay ----
  await page.evaluate(() => document.getElementById('__verification-overlay__')?.remove());

  return results;
}

/**
 * Generate a markdown "dock" that summarises every page's verification results.
 */
export function generateDock(allResults: PageVerificationResult[]): void {
  const outputDir = path.resolve('e2e/test-results');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  let totalPassed = 0;
  let totalChecks = 0;

  let md = `# Visual Verification Dock\n\n> Generated: ${new Date().toISOString()}\n`;

  for (const pr of allResults) {
    md += `\n---\n\n## Page: ${pr.pageName} (${pr.route})\nScreenshot: \`screenshots/${pr.screenshotFilename}.png\`\n\n`;
    md += '| # | Check | Result |\n|---|-------|--------|\n';

    for (const c of pr.checks) {
      const icon = c.passed ? '\u2705' : '\u274C';
      md += `| ${c.number} | ${c.label} | ${icon} |\n`;
      totalChecks++;
      if (c.passed) totalPassed++;
    }
  }

  md += `\n---\n\n## Summary: ${totalPassed}/${totalChecks} checks passed across ${allResults.length} pages\n`;

  fs.writeFileSync(path.join(outputDir, 'VERIFICATION-DOCK.md'), md, 'utf-8');
}
