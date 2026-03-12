/* eslint-disable no-console */
const fs = require("node:fs");
const path = require("node:path");

function writeFileIfChanged(filePath, nextContent) {
  const current = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : null;
  if (current === nextContent) return false;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, nextContent, "utf8");
  return true;
}

function patch() {
  const root = path.resolve(__dirname, "..");
  const pkgDir = path.join(root, "node_modules", "dom-helpers", "contains");
  const pkgPath = path.join(pkgDir, "package.json");

  if (!fs.existsSync(pkgPath)) return;

  let pkg;
  try {
    pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  } catch (e) {
    console.warn(`[patch] Failed to parse ${pkgPath}:`, e?.message || e);
    return;
  }

  // Some bundlers can be strict about entrypoints that escape the package root (../...).
  // Provide local entrypoints to keep resolution within this folder.
  // Keep name valid too (unscoped names cannot contain "/").
  pkg.name = "@dom-helpers/contains";
  if (!pkg.version) pkg.version = "0.0.0";
  pkg.main = "./index.js";
  pkg.module = "./index.mjs";
  pkg.types = "./index.d.ts";

  const pkgNext = `${JSON.stringify(pkg, null, 2)}\n`;
  const changedPkg = writeFileIfChanged(pkgPath, pkgNext);

  const changedIndexJs = writeFileIfChanged(
    path.join(pkgDir, "index.js"),
    `"use strict";\n\n// Local entrypoint (see scripts/patch-dom-helpers-contains.cjs).\nmodule.exports = require(\"../cjs/contains.js\");\nmodule.exports.default = module.exports;\n`,
  );

  const changedIndexMjs = writeFileIfChanged(
    path.join(pkgDir, "index.mjs"),
    `export { default } from \"../esm/contains.js\";\n`,
  );

  const changedIndexDts = writeFileIfChanged(
    path.join(pkgDir, "index.d.ts"),
    `export { default } from \"../esm/contains\";\n`,
  );

  if (changedPkg || changedIndexJs || changedIndexMjs || changedIndexDts) {
    console.log("[patch] Patched dom-helpers/contains entrypoints.");
  }
}

patch();
