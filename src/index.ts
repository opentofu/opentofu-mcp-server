#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { setupRegistry } from "./servers/registry.js";

const SERVER_VERSION = "0.1.0";

async function main() {
  try {
    const server = new McpServer({
      name: "opentofu",
      version: SERVER_VERSION,
      description: "OpenTofu MCP Server for registry access and command execution",
    });

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
