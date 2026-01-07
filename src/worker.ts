import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpAgent } from "agents/mcp";
import { serverInstructions as instructions, setupRegistry } from "./servers/registry/index.js";
import { getPackageInfo } from "./utils.js";

const { name, version } = getPackageInfo();

export class OpenTofuMCP extends McpAgent<Env> {
  // @ts-expect-error - SDK version mismatch with agents package, this can be removed once https://github.com/cloudflare/agents/pull/752 is in place.
  server = new McpServer(
    {
      name: name,
      version: version,
    },
    { instructions },
  );

  async init() {
    console.log("fetch method", this.env.REGISTRY_API.fetch);
    await setupRegistry(this.server, this.env.REGISTRY_API.fetch.bind(this.env.REGISTRY_API));
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
