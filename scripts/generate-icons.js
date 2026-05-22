/**
 * Icon generator script for PWA
 * Run: node scripts/generate-icons.js
 * Requires: npm install sharp (one-time)
 *
 * This generates all required PWA icon sizes from public/favicon.png
 */

import { createRequire } from "module";
import { existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

let sharp;
try {
  sharp = require("sharp");
} catch {
  console.error(
    "sharp is not installed. Run: npm install --save-dev sharp\nThen re-run this script."
  );
  process.exit(1);
}

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const inputFile = join(__dirname, "../public/favicon.png");
const outputDir = join(__dirname, "../public/icons");

if (!existsSync(outputDir)) {
  mkdirSync(outputDir, { recursive: true });
}

// Also create apple-touch-icon (180x180)
const allSizes = [...sizes, 180];

(async () => {
  for (const size of allSizes) {
    const outputFile =
      size === 180
        ? join(__dirname, "../public/apple-touch-icon.png")
        : join(outputDir, `icon-${size}x${size}.png`);

    await sharp(inputFile).resize(size, size).toFile(outputFile);
    console.log(`✅ Generated ${outputFile}`);
  }
  console.log("\n🎉 All icons generated successfully!");
})();
