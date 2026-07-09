import { tracing } from "cloudflare:workers";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createMcpHandler } from "agents/mcp";
import { serverInstructions as instructions, setupRegistry, type ToolTracer } from "./servers/registry/index.js";
import { PACKAGE_NAME, PACKAGE_VERSION } from "./utils.js";

// Wraps each tool call in a span so we can see which tool ran, how long it
// took, and the arguments it received.
const traced: ToolTracer = (toolName, handler) => (params) =>
  tracing.enterSpan(`tool:${toolName}`, async (span) => {
    span.setAttribute("mcp.tool.name", toolName);
    span.setAttribute("mcp.tool.args", JSON.stringify(params));
    return handler(params);
  });

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

  await setupRegistry(server, registryFetch, traced);
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
