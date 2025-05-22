import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Get package information from package.json
export function getPackageInfo(): { name: string; version: string } {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const packageJsonPath = join(__dirname, "..", "package.json");
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));

  return {
    name: packageJson.name || "opentofu-mcp-server",
    version: packageJson.version || "0.1.0",
  };
}

export const { name: PACKAGE_NAME, version: PACKAGE_VERSION } = getPackageInfo();
