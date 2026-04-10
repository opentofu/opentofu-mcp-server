#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { serverInstructions as instructions, setupRegistry } from "./servers/registry/index.js";
import { PACKAGE_NAME, PACKAGE_VERSION } from "./utils.js";

async function main() {
  try {
    const server = new McpServer(
      {
        name: PACKAGE_NAME,
        version: PACKAGE_VERSION,
        description: "OpenTofu MCP Server for registry access and command execution",
      },
      { instructions },
    );

    await setupRegistry(server);

    const transport = new StdioServerTransport();
    await server.connect(transport);
  } catch (error) {
    console.error("Failed to start MCP server:", error);
    process.exit(1);
  }
}

process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
});

main().catch((error) => {
  console.error("Error starting server:", error);
  process.exit(1);
});
