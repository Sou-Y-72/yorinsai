const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const spotsDir = path.join(__dirname, '../public/images/spots');
const files = fs.readdirSync(spotsDir).filter(f => f.endsWith('.jpg'));

console.log(`Found ${files.length} jpg files to convert to webp.`);

let successCount = 0;
for (const file of files) {
  const inputPath = path.join(spotsDir, file);
  const outputPath = path.join(spotsDir, file.replace(/\.jpg$/, '.webp'));
  
  try {
    execSync(`/usr/local/bin/cwebp -q 85 "${inputPath}" -o "${outputPath}"`, { stdio: 'pipe' });
    const inSize = (fs.statSync(inputPath).size / 1024).toFixed(1);
    const outSize = (fs.statSync(outputPath).size / 1024).toFixed(1);
    console.log(`✓ Converted ${file} (${inSize}KB -> ${outSize}KB)`);
    successCount++;
  } catch (e) {
    console.error(`✗ Failed to convert ${file}:`, e.message);
  }
}

console.log(`\nSuccessfully converted ${successCount} / ${files.length} images to WebP!`);
