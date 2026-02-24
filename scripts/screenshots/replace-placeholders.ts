/**
 * Replace screenshot placeholders in markdown files with actual image references.
 * 
 * Usage:
 *   npx tsx scripts/screenshots/replace-placeholders.ts
 * 
 * This reads all markdown files in docs/help-center/ and replaces lines like:
 *   > [Screenshot: some description]
 * with:
 *   ![some description](../screenshots/category/filename.png)
 */

import fs from 'fs';
import path from 'path';
import { screenshotMap } from './screenshot-map';

const HELP_CENTER_DIR = path.join(process.cwd(), 'docs', 'help-center');
const SCREENSHOT_DIR = path.join(HELP_CENTER_DIR, 'screenshots');

function processFile(filePath: string) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  let modified = false;

  const newLines = lines.map((line) => {
    const match = line.match(/^> \[Screenshot: (.+)\]$/);
    if (!match) return line;

    const description = match[1];
    const screenshotFile = screenshotMap[description];

    if (!screenshotFile) {
      console.warn(`  ⚠ No mapping for: "${description}" in ${path.relative(HELP_CENTER_DIR, filePath)}`);
      return line;
    }

    const lightPath = path.join(SCREENSHOT_DIR, 'light', screenshotFile);
    const darkPath = path.join(SCREENSHOT_DIR, 'dark', screenshotFile);

    if (!fs.existsSync(lightPath) && !fs.existsSync(darkPath)) {
      console.warn(`  ⚠ Files missing: ${screenshotFile} for "${description}"`);
      return line;
    }

    // Calculate relative paths from the markdown file to the screenshots
    const relDir = path.dirname(filePath);
    const relLightPath = path.relative(relDir, lightPath).replace(/\\/g, '/');
    const relDarkPath = path.relative(relDir, darkPath).replace(/\\/g, '/');

    modified = true;
    // Use a picture element approach with light/dark variants
    return `<picture>\n  <source media="(prefers-color-scheme: dark)" srcset="${relDarkPath}">\n  <img alt="${description}" src="${relLightPath}">\n</picture>`;
  });

  if (modified) {
    fs.writeFileSync(filePath, newLines.join('\n'));
    console.log(`  ✓ Updated: ${path.relative(HELP_CENTER_DIR, filePath)}`);
  }
}

function walk(dir: string) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'screenshots') {
      walk(fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.md') && entry.name !== 'README.md') {
      processFile(fullPath);
    }
  }
}

console.log('Replacing screenshot placeholders...\n');
walk(HELP_CENTER_DIR);
console.log('\nDone.');
