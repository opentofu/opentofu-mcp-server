import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createMcpHandler } from "agents/mcp";
import { serverInstructions as instructions, setupRegistry } from "./servers/registry/index.js";
import { PACKAGE_NAME, PACKAGE_VERSION } from "./utils.js";

// Creates a new McpServer per request — stateless, no Durable Objects.
// Previously used McpAgent which created a persistent DO per session,
// causing unbounded storage growth (~351 GB from abandoned sessions).
async function createServer(registryFetch: typeof globalThis.fetch) {
  const server = new McpServer(
    {
      name: PACKAGE_NAME,
      version: PACKAGE_VERSION,
    },
    { instructions },
  );

  await setupRegistry(server, registryFetch);
  return server;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Legacy SSE transport was removed — point clients to the new endpoint.
    if (url.pathname === "/sse" || url.pathname === "/sse/message") {
      return new Response("This endpoint has been removed. Use /mcp with streamable-http transport.", { status: 410 });
    }

    const server = await createServer(env.REGISTRY_API.fetch.bind(env.REGISTRY_API));
    return createMcpHandler(server, { route: "/mcp" })(request, env, ctx);
  },
};
