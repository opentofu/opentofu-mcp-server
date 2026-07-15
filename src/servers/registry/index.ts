import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { API_BASE_URL, RegistryClient } from "../../registry/index.js";
import { renderModuleDetails, renderModuleVersions, renderProviderDetails, renderProviderVersions, renderSearchResults } from "./render.js";

// Schema definitions
const searchSchema = {
  query: z.string().min(2).describe("Search query for finding OpenTofu components (e.g., 'aws', 'kubernetes', 'database', 's3')"),
  type: z.enum(["provider", "module", "resource", "data-source", "all"]).default("all").describe("Type of registry items to search for"),
};

const providerDetailsSchema = {
  namespace: z.string().min(1).describe("Provider namespace (e.g., 'hashicorp', 'opentofu')"),
  name: z.string().min(1).describe("Provider name WITHOUT 'terraform-provider-' prefix (e.g., 'aws', 'kubernetes', 'azurerm')"),
};

const providerVersionsOutputSchema = {
  namespace: z.string().describe("Provider namespace"),
  name: z.string().describe("Provider name"),
  latest: z.string().optional().describe("The latest version id, e.g. 'v4.0.0'"),
  versions: z
    .array(
      z.object({
        id: z.string().describe("Version id, e.g. 'v4.0.0'"),
        published: z.string().describe("ISO 8601 date-time the version was published"),
      }),
    )
    .describe("All available versions, sorted newest-first"),
};

const moduleDetailsSchema = {
  namespace: z.string().min(1).describe("Module namespace without prefix (e.g., 'terraform-aws-modules')"),
  name: z.string().min(1).describe("Simple module name WITHOUT 'terraform-aws-' or similar prefix (e.g., 'vpc', 's3-bucket')"),
  target: z.string().min(1).describe("Module target platform (e.g., 'aws', 'kubernetes', 'azurerm')"),
};

const moduleVersionsOutputSchema = {
  namespace: z.string().describe("Module namespace"),
  name: z.string().describe("Module name"),
  target: z.string().describe("Module target platform"),
  latest: z.string().optional().describe("The latest version id, e.g. '4.0.0'"),
  versions: z
    .array(
      z.object({
        id: z.string().describe("Version id, e.g. '4.0.0'"),
        published: z.string().describe("ISO 8601 date-time the version was published"),
      }),
    )
    .describe("All available versions, sorted newest-first"),
};

const resourceDocsSchema = {
  namespace: z.string().min(1).describe("Provider namespace (e.g., 'hashicorp', 'opentofu')"),
  name: z.string().min(1).describe("Provider name WITHOUT 'terraform-provider-' prefix (e.g., 'aws', 'kubernetes')"),
  resource: z.string().min(1).describe("Resource name WITHOUT provider prefix (e.g., 's3_bucket', 'instance')"),
  version: z.string().optional().describe("Provider version (e.g., 'v4.0.0'). If not specified, latest version will be used"),
};

const dataSourceDocsSchema = {
  namespace: z.string().min(1).describe("Provider namespace (e.g., 'hashicorp', 'opentofu')"),
  name: z.string().min(1).describe("Provider name WITHOUT 'terraform-provider-' prefix (e.g., 'aws', 'kubernetes')"),
  dataSource: z.string().min(1).describe("Data source name WITHOUT provider prefix (e.g., 'ami', 'vpc')"),
  version: z.string().optional().describe("Provider version (e.g., 'v4.0.0'). If not specified, latest version will be used"),
};

export const serverInstructions = `The OpenTofu Registry is a public index of providers, modules, resources, and data sources for OpenTofu and Terraform. 
You can:
- **Search** for providers, modules, resources, and data sources using the \`search-opentofu-registry\` tool.
- **Get detailed information** about a provider or module using \`get-provider-details\` or \`get-module-details\`.
- **Get just the available versions** of a provider or module using \`get-provider-versions\` or \`get-module-versions\` (lighter-weight than the full details tools).
- **Retrieve documentation** for a specific resource or data source using \`get-resource-docs\` or \`get-datasource-docs\`.

**Tips:**
- Do **not** include prefixes like \`terraform-provider-\` or \`terraform-aws-\` in names.
- Use simple search terms (e.g., \`aws\`, \`kubernetes\`, \`s3\`, \`database\`).
- For resources and data sources, use the short name (e.g., \`s3_bucket\`, \`instance\`, \`ami\`).

This MCP server is designed to work with OpenTofu (A fork of HashiCorp Terraform) and provides access to the OpenTofu Registry.
For more details, use the search and info tools above to explore the registry.`;

// Wraps a tool handler for observability (e.g. tracing spans). This is so the CF
// worker can have telemetry but locally we dont need it.
export type ToolTracer = <T, R>(toolName: string, handler: (params: T) => Promise<R>) => (params: T) => Promise<R>;

const identityTracer: ToolTracer = (_toolName, handler) => handler;

export async function setupRegistry(server: McpServer, f: typeof globalThis.fetch = globalThis.fetch, traced: ToolTracer = identityTracer) {
  const client = new RegistryClient(API_BASE_URL, f);

  server.registerResource("opentofu-registry-info", "opentofu:registry-info", {}, async (uri) => ({
    contents: [
      {
        uri: uri.href,
        text: serverInstructions,
      },
    ],
  }));

  // Register all tools
  server.registerTool(
    "search-opentofu-registry",
    {
      description: "Search the OpenTofu Registry to find providers, modules, resources, and data sources. Use simple terms without prefixes like 'terraform-provider-' or 'terraform-module-'.",
      inputSchema: searchSchema,
    },
    traced("search-opentofu-registry", async (params) => {
      try {
        const results = await client.search(params.query, params.type);
        if (results.length === 0) {
          return textResult(`No results found for "${params.query}" in the OpenTofu Registry.`);
        }
        return textResult(`Found ${results.length} results for "${params.query}" in the OpenTofu Registry:\n\n${results.map((r) => renderSearchResults(r)).join("\n\n")}`);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        return textResult(`Error searching the OpenTofu Registry: ${errorMessage}`);
      }
    }),
  );

  server.registerTool(
    "get-provider-details",
    {
      description: "Get detailed information about a specific OpenTofu provider by namespace and name. Do NOT include 'terraform-provider-' prefix in the name.",
      inputSchema: providerDetailsSchema,
    },
    traced("get-provider-details", async (params) => {
      try {
        const provider = await client.getProviderDetails(params.namespace, params.name);
        return textResult(renderProviderDetails(params.name, params.namespace, provider));
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Provider not found";
        return textResult(`Failed to get details for provider ${params.namespace}/${params.name}: ${errorMessage}`);
      }
    }),
  );

  server.registerTool(
    "get-provider-versions",
    {
      description:
        "Get the list of available versions for a specific OpenTofu provider by namespace and name, without fetching full provider documentation. Do NOT include 'terraform-provider-' prefix in the name.",
      inputSchema: providerDetailsSchema,
      outputSchema: providerVersionsOutputSchema,
    },
    traced("get-provider-versions", async (params) => {
      try {
        const versions = await client.getProviderVersions(params.namespace, params.name);
        const structuredContent = {
          namespace: params.namespace,
          name: params.name,
          latest: versions[0]?.id,
          versions,
        };
        return {
          structuredContent,
          content: [{ type: "text" as const, text: renderProviderVersions(params.name, params.namespace, structuredContent) }],
        };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Provider not found";
        return errorResult(`Failed to get versions for provider ${params.namespace}/${params.name}: ${errorMessage}`);
      }
    }),
  );

  server.registerTool(
    "get-module-details",
    {
      description: "Get detailed information about a specific OpenTofu module by namespace, name, and target. Use the simple module name, NOT the full repository name.",
      inputSchema: moduleDetailsSchema,
    },
    traced("get-module-details", async (params) => {
      try {
        const module = await client.getModuleDetails(params.namespace, params.name, params.target);
        return textResult(renderModuleDetails(module));
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Module not found";
        return textResult(`Failed to get details for module ${params.namespace}/${params.name} (${params.target}): ${errorMessage}`);
      }
    }),
  );

  server.registerTool(
    "get-module-versions",
    {
      description: "Get the list of available versions for a specific OpenTofu module by namespace, name, and target. Use the simple module name, NOT the full repository name.",
      inputSchema: moduleDetailsSchema,
      outputSchema: moduleVersionsOutputSchema,
    },
    traced("get-module-versions", async (params) => {
      try {
        const versions = await client.getModuleVersions(params.namespace, params.name, params.target);
        const structuredContent = {
          namespace: params.namespace,
          name: params.name,
          target: params.target,
          latest: versions[0]?.id,
          versions,
        };
        return {
          structuredContent,
          content: [{ type: "text" as const, text: renderModuleVersions(params.name, params.namespace, params.target, structuredContent) }],
        };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Module not found";
        return errorResult(`Failed to get versions for module ${params.namespace}/${params.name} (${params.target}): ${errorMessage}`);
      }
    }),
  );

  server.registerTool(
    "get-resource-docs",
    {
      description: "Get detailed documentation for a specific OpenTofu resource by provider namespace, provider name, and resource name.",
      inputSchema: resourceDocsSchema,
    },
    traced("get-resource-docs", async (params) => {
      try {
        const resourceDocs = await client.getResourceDocs(params.namespace, params.name, params.resource, params.version);
        return textResult(resourceDocs);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Resource documentation not found";
        return textResult(`Failed to get documentation for resource ${params.name}_${params.resource}: ${errorMessage}`);
      }
    }),
  );

  server.registerTool(
    "get-datasource-docs",
    {
      description: "Get detailed documentation for a specific OpenTofu data source by provider namespace, provider name, and data source name.",
      inputSchema: dataSourceDocsSchema,
    },
    traced("get-datasource-docs", async (params) => {
      try {
        const dataSourceDocs = await client.getDataSourceDocs(params.namespace, params.name, params.dataSource, params.version);
        return textResult(dataSourceDocs);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Data source documentation not found";
        return textResult(`Failed to get documentation for data source ${params.name}_${params.dataSource}: ${errorMessage}`);
      }
    }),
  );
}

export function textResult(result: string): {
  content: {
    type: "text";
    text: string;
  }[];
} {
  return {
    content: [
      {
        type: "text",
        text: result,
      },
    ],
  };
}

// Tools with an `outputSchema` must set `isError: true` on failure, since the SDK
// skips structured-content validation only when `isError` is set. Tools without an
// outputSchema can keep using `textResult`, but this is safe (and preferred) for both.
export function errorResult(message: string): {
  content: { type: "text"; text: string }[];
  isError: true;
} {
  return {
    content: [{ type: "text", text: message }],
    isError: true,
  };
}
