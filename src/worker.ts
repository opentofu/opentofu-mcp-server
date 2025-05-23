import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpAgent } from "agents/mcp";
import { setupRegistry } from "./servers/registry/index.js";
import { getPackageInfo } from "./utils.js";

const { name, version } = getPackageInfo();

export class OpenTofuMCP extends McpAgent<Env> {
  server = new McpServer({
    name: name,
    version: version,
  });

  async init() {
    await setupRegistry(this.server, this.env.REGISTRY_API.fetch);
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
