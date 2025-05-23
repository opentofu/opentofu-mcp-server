export const PACKAGE_NAME = "@opentofu/opentofu-mcp-server";
export const PACKAGE_VERSION = "1.0.0"; // TODO: Update this to the actual version from package.json

export function getPackageInfo(): { name: string; version: string } {
  return {
    name: PACKAGE_NAME,
    version: PACKAGE_VERSION,
  };
}
