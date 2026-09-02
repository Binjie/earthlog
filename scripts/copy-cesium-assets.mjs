import { cpSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const cesiumBuild = join(root, "node_modules", "cesium", "Build", "Cesium");
const target = join(root, "public", "cesium");
const folders = ["Assets", "ThirdParty", "Widgets", "Workers"];

mkdirSync(target, { recursive: true });

for (const folder of folders) {
  const destination = join(target, folder);
  rmSync(destination, { recursive: true, force: true });
  cpSync(join(cesiumBuild, folder), destination, { recursive: true });
}

console.log("Cesium static assets copied to public/cesium");
