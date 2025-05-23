import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { API_BASE_URL, RegistryClient } from "../../registry/index.js";
import { renderModuleDetails, renderProviderDetails, renderSearchResults } from "./render.js";

// Schema definitions
const searchSchema = {
  query: z.string().min(2).describe("Search query for finding OpenTofu components (e.g., 'aws', 'kubernetes', 'database', 's3')"),
  type: z.enum(["provider", "module", "resource", "data-source", "all"]).default("all").describe("Type of registry items to search for"),
};

const providerDetailsSchema = {
  namespace: z.string().min(1).describe("Provider namespace (e.g., 'hashicorp', 'opentofu')"),
  name: z.string().min(1).describe("Provider name WITHOUT 'terraform-provider-' prefix (e.g., 'aws', 'kubernetes', 'azurerm')"),
};

const moduleDetailsSchema = {
  namespace: z.string().min(1).describe("Module namespace without prefix (e.g., 'terraform-aws-modules')"),
  name: z.string().min(1).describe("Simple module name WITHOUT 'terraform-aws-' or similar prefix (e.g., 'vpc', 's3-bucket')"),
  target: z.string().min(1).describe("Module target platform (e.g., 'aws', 'kubernetes', 'azurerm')"),
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

export async function setupRegistry(server: McpServer, f: typeof globalThis.fetch = globalThis.fetch) {
  const client = new RegistryClient(API_BASE_URL, f);

  server.resource(
    "opentofu-registry-info",
    "opentofu:registry-info",

    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          text: `The OpenTofu Registry is a public index of providers, modules, resources, and data sources for OpenTofu and Terraform. 

You can:
- **Search** for providers, modules, resources, and data sources using the \`search-opentofu-registry\` tool.
- **Get detailed information** about a provider or module using \`get-provider-details\` or \`get-module-details\`.
- **Retrieve documentation** for a specific resource or data source using \`get-resource-docs\` or \`get-datasource-docs\`.

**Tips:**
- Do **not** include prefixes like \`terraform-provider-\` or \`terraform-aws-\` in names.
- Use simple search terms (e.g., \`aws\`, \`kubernetes\`, \`s3\`, \`database\`).
- For resources and data sources, use the short name (e.g., \`s3_bucket\`, \`instance\`, \`ami\`).

This MCP server is designed to work with OpenTofu (A fork of HashiCorp Terraform) and provides access to the OpenTofu Registry.
For more details, use the search and info tools above to explore the registry.`,
        },
      ],
    }),
  );

  // Register all tools
  server.tool(
    "search-opentofu-registry",
    "Search the OpenTofu Registry to find providers, modules, resources, and data sources. Use simple terms without prefixes like 'terraform-provider-' or 'terraform-module-'.",
    searchSchema,
    async (params) => {
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
    },
  );

  server.tool(
    "get-provider-details",
    "Get detailed information about a specific OpenTofu provider by namespace and name. Do NOT include 'terraform-provider-' prefix in the name.",
    providerDetailsSchema,
    async (params) => {
      try {
        const provider = await client.getProviderDetails(params.namespace, params.name);
        return textResult(renderProviderDetails(params.name, params.namespace, provider));
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Provider not found";
        return textResult(`Failed to get details for provider ${params.namespace}/${params.name}: ${errorMessage}`);
      }
    },
  );

  server.tool(
    "get-module-details",
    "Get detailed information about a specific OpenTofu module by namespace, name, and target. Use the simple module name, NOT the full repository name.",
    moduleDetailsSchema,
    async (params) => {
      try {
        const module = await client.getModuleDetails(params.namespace, params.name, params.target);
        return textResult(renderModuleDetails(module));
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Module not found";
        return textResult(`Failed to get details for module ${params.namespace}/${params.name} (${params.target}): ${errorMessage}`);
      }
    },
  );

  server.tool("get-resource-docs", "Get detailed documentation for a specific OpenTofu resource by provider namespace, provider name, and resource name.", resourceDocsSchema, async (params) => {
    try {
      const resourceDocs = await client.getResourceDocs(params.namespace, params.name, params.resource, params.version);
      return textResult(resourceDocs);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Resource documentation not found";
      return textResult(`Failed to get documentation for resource ${params.name}_${params.resource}: ${errorMessage}`);
    }
  });

  server.tool(
    "get-datasource-docs",
    "Get detailed documentation for a specific OpenTofu data source by provider namespace, provider name, and data source name.",
    dataSourceDocsSchema,
    async (params) => {
      try {
        const dataSourceDocs = await client.getDataSourceDocs(params.namespace, params.name, params.dataSource, params.version);
        return textResult(dataSourceDocs);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Data source documentation not found";
        return textResult(`Failed to get documentation for data source ${params.name}_${params.dataSource}: ${errorMessage}`);
      }
    },
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
