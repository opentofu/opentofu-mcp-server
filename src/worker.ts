import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpAgent } from "agents/mcp";
import { serverInstructions as instructions, setupRegistry } from "./servers/registry/index.js";
import { PACKAGE_NAME, PACKAGE_VERSION } from "./utils.js";

// Each MCP session creates a Durable Object with its own SQLite database.
// The `agents` package has no built-in cleanup, so idle sessions accumulate
// storage forever. We reset an alarm on every request (idle timeout) and
// delete all storage when it fires.
const CLEANUP_DELAY_MS = 30 * 60 * 1000; // 30 minutes

export class OpenTofuMCP extends McpAgent<Env> {
  server = new McpServer(
    {
      name: PACKAGE_NAME,
      version: PACKAGE_VERSION,
    },
    { instructions },
  );

  async init() {
    await setupRegistry(this.server, this.env.REGISTRY_API.fetch.bind(this.env.REGISTRY_API));
  }

  async fetch(request: Request): Promise<Response> {
    const response = await super.fetch(request);
    await this.ctx.storage.setAlarm(Date.now() + CLEANUP_DELAY_MS);
    return response;
  }

  async alarm() {
    await this.ctx.storage.deleteAll();
    await this.ctx.storage.deleteAlarm();
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/sse" || url.pathname === "/sse/message") {
      return OpenTofuMCP.serveSSE("/sse").fetch(request, env, ctx);
    }

    if (url.pathname === "/mcp") {
      return OpenTofuMCP.serve("/mcp").fetch(request, env, ctx);
    }

    return new Response("Not Found", { status: 404 });
  },
};
