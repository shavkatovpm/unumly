import sharp from "sharp";
import { promises as fs } from "fs";
import path from "path";

const projectRoot = process.cwd();
const src = path.join(projectRoot, "logo.png");

async function ensureDir(p) {
  await fs.mkdir(p, { recursive: true });
}

async function main() {
  await ensureDir(path.join(projectRoot, "public"));
  const appDir = path.join(projectRoot, "src", "app");

  // 1. Trim outer whitespace (tight bounding box around the circle)
  const trimmed = await sharp(src)
    .ensureAlpha()
    .trim({ background: { r: 255, g: 255, b: 255 }, threshold: 40 })
    .toBuffer();

  const meta = await sharp(trimmed).metadata();
  const side = Math.max(meta.width ?? 0, meta.height ?? 0);

  // 2. Make it perfectly square (the bounding box might not be exactly square)
  const squared = await sharp(trimmed)
    .resize(side, side, {
      fit: "contain",
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .toBuffer();

  // 3. Apply a circular alpha mask so the white corners become transparent
  const maskSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${side}" height="${side}">
    <circle cx="${side / 2}" cy="${side / 2}" r="${side / 2}" fill="white"/>
  </svg>`;
  const circular = await sharp(squared)
    .composite([{ input: Buffer.from(maskSvg), blend: "dest-in" }])
    .png()
    .toBuffer();

  // 4. Base canvas — 1024x1024 with the circle fitted and transparent padding
  const base = await sharp(circular)
    .resize(1024, 1024, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .toBuffer();

  // ─── public/logo.png — 512x512 transparent ───
  await sharp(base)
    .resize(512, 512)
    .png({ quality: 95 })
    .toFile(path.join(projectRoot, "public", "logo.png"));

  // ─── src/app/icon.png — favicon 32x32 ───
  await sharp(base)
    .resize(32, 32)
    .png({ quality: 100 })
    .toFile(path.join(appDir, "icon.png"));

  // ─── src/app/apple-icon.png — 180x180 ───
  await sharp(base)
    .resize(180, 180)
    .png({ quality: 95 })
    .toFile(path.join(appDir, "apple-icon.png"));

  // ─── Open Graph / Twitter (1200x630) ───
  const OG_BG = { r: 250, g: 250, b: 249, alpha: 1 };
  const ogBg = sharp({
    create: { width: 1200, height: 630, channels: 4, background: OG_BG },
  });

  const ogLogo = await sharp(base).resize(320, 320).png().toBuffer();

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
    <text x="600" y="460" font-family="-apple-system, system-ui, sans-serif"
          font-size="76" font-weight="600" text-anchor="middle" fill="#1A1A19"
          letter-spacing="-3">unumly<tspan fill="#9B7B4A">.</tspan></text>
    <text x="600" y="520" font-family="-apple-system, system-ui, sans-serif"
          font-size="22" text-anchor="middle" fill="#555"
          letter-spacing="0.5">Kunlik ishlarni rejalashtirish ilovasi</text>
  </svg>`;

  await ogBg
    .composite([
      { input: ogLogo, top: 70, left: 440 },
      { input: Buffer.from(svg), top: 0, left: 0 },
    ])
    .png({ quality: 92 })
    .toFile(path.join(appDir, "opengraph-image.png"));

  await fs.copyFile(
    path.join(appDir, "opengraph-image.png"),
    path.join(appDir, "twitter-image.png")
  );

  console.log("✓ Generated:");
  console.log("  public/logo.png             (512x512 transparent circle)");
  console.log("  src/app/icon.png            (32x32 favicon)");
  console.log("  src/app/apple-icon.png      (180x180 iOS touch)");
  console.log("  src/app/opengraph-image.png (1200x630 OG)");
  console.log("  src/app/twitter-image.png   (1200x630 Twitter)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
