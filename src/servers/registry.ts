import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { definitions } from "../generated/opentofu-api.js";
import { type ProviderWithLatestVersion, RegistryClient } from "../registry/index.js";

export async function setupRegistry(server: McpServer) {
  const client = new RegistryClient();

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

  server.tool(
    "search-opentofu-registry",
    "Search the OpenTofu Registry to find providers, modules, resources, and data sources. Use simple terms without prefixes like 'terraform-provider-' or 'terraform-module-'.",
    {
      query: z.string().min(2).describe("Search query for finding OpenTofu components (e.g., 'aws', 'kubernetes', 'database', 's3')"),
      type: z.enum(["provider", "module", "resource", "data-source", "all"]).default("all").describe("Type of registry items to search for"),
    },
    async ({ query, type }) => {
      try {
        const results = await client.search(query, type);
        if (results.length === 0) {
          return textResult(`No results found for "${query}" in the OpenTofu Registry.`);
        }
        return textResult(`Found ${results.length} results for "${query}" in the OpenTofu Registry:\n\n${results.map((r) => renderSearchResults(r)).join("\n\n")}`);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        return textResult(`Error searching the OpenTofu Registry: ${errorMessage}`);
      }
    },
  );

  server.tool(
    "get-provider-details",
    "Get detailed information about a specific OpenTofu provider by namespace and name. Do NOT include 'terraform-provider-' prefix in the name.",
    {
      namespace: z.string().min(1).describe("Provider namespace (e.g., 'hashicorp', 'opentofu')"),
      name: z.string().min(1).describe("Provider name WITHOUT 'terraform-provider-' prefix (e.g., 'aws', 'kubernetes', 'azurerm')"),
    },
    async ({ namespace, name }) => {
      try {
        const provider = await client.getProviderDetails(namespace, name);
        return textResult(renderProviderDetails(name, namespace, provider));
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Provider not found";
        return textResult(`Failed to get details for provider ${namespace}/${name}: ${errorMessage}`);
      }
    },
  );

  server.tool(
    "get-module-details",
    "Get detailed information about a specific OpenTofu module by namespace, name, and target. Use the simple module name, NOT the full repository name.",
    {
      namespace: z.string().min(1).describe("Module namespace without prefix (e.g., 'terraform-aws-modules')"),
      name: z.string().min(1).describe("Simple module name WITHOUT 'terraform-aws-' or similar prefix (e.g., 'vpc', 's3-bucket')"),
      target: z.string().min(1).describe("Module target platform (e.g., 'aws', 'kubernetes', 'azurerm')"),
    },
    async ({ namespace, name, target }) => {
      try {
        const module = await client.getModuleDetails(namespace, name, target);
        return textResult(renderModuleDetails(module));
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Module not found";
        return textResult(`Failed to get details for module ${namespace}/${name} (${target}): ${errorMessage}`);
      }
    },
  );

  server.tool(
    "get-resource-docs",
    "Get detailed documentation for a specific OpenTofu resource by provider namespace, provider name, and resource name.",
    {
      namespace: z.string().min(1).describe("Provider namespace (e.g., 'hashicorp', 'opentofu')"),
      name: z.string().min(1).describe("Provider name WITHOUT 'terraform-provider-' prefix (e.g., 'aws', 'kubernetes')"),
      resource: z.string().min(1).describe("Resource name WITHOUT provider prefix (e.g., 's3_bucket', 'instance')"),
      version: z.string().optional().describe("Provider version (e.g., 'v4.0.0'). If not specified, latest version will be used"),
    },
    async ({ namespace, name, resource, version }) => {
      try {
        const resourceDocs = await client.getResourceDocs(namespace, name, resource, version);
        return textResult(resourceDocs);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Resource documentation not found";
        return textResult(`Failed to get documentation for resource ${name}_${resource}: ${errorMessage}`);
      }
    },
  );

  server.tool(
    "get-datasource-docs",
    "Get detailed documentation for a specific OpenTofu data source by provider namespace, provider name, and data source name.",
    {
      namespace: z.string().min(1).describe("Provider namespace (e.g., 'hashicorp', 'opentofu')"),
      name: z.string().min(1).describe("Provider name WITHOUT 'terraform-provider-' prefix (e.g., 'aws', 'kubernetes')"),
      dataSource: z.string().min(1).describe("Data source name WITHOUT provider prefix (e.g., 'ami', 'vpc')"),
      version: z.string().optional().describe("Provider version (e.g., 'v4.0.0'). If not specified, latest version will be used"),
    },
    async ({ namespace, name, dataSource, version }) => {
      try {
        const dataSourceDocs = await client.getDataSourceDocs(namespace, name, dataSource, version);
        return textResult(dataSourceDocs);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Data source documentation not found";
        return textResult(`Failed to get documentation for data source ${name}_${dataSource}: ${errorMessage}`);
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

function renderProviderDetails(name: string, namespace: string, provider: ProviderWithLatestVersion): string {
  let formattedResponse = `## Provider: ${provider.addr.display}\n
${provider.description}

**Latest Version**: ${provider.versions[0]?.id || "Unknown"}
**All Versions**: ${provider.versions.map((v) => v.id).join(", ")}

**Popularity Score**: ${provider.popularity}
${provider.link ? `\n**Documentation**: ${provider.link}\n` : ""}`;

  if (provider.latestVersion) {
    const v = provider.latestVersion;
    formattedResponse += `\n## Latest Version Details (${v.id})\n`;

    if (v.docs?.resources) {
      formattedResponse += `\n${renderResourcesSection(v.docs.resources, name, namespace)}\n`;
    }

    if (v.docs?.datasources) {
      formattedResponse += `\n${renderDataSourcesSection(v.docs.datasources, name, namespace)}\n`;
    }
  }
  return formattedResponse;
}

function renderModuleDetails(module: definitions["Module"]): string {
  return `## Module: ${module.addr.display}\n
${module.description}

**Available Versions**: ${module.versions.map((v) => v.id).join(", ")}

**Popularity Score**: ${module.popularity}
${module.fork_of ? `\n**Forked from**: ${module.fork_of.display}\n` : ""}${module.fork_count > 0 ? `\n**Fork count**: ${module.fork_count}\n` : ""}`;
}

function truncateString(str: string | undefined, maxLength = 50): string | undefined {
  if (!str) return undefined;
  if (str.length <= maxLength) return str;
  return `${str.slice(0, maxLength - 3)}...`;
}

function renderResourcesSection(resources: definitions["ProviderDocItem"][], providerName: string, namespace: string): string {
  if (!resources?.length) return "";
  return `
### Resources (${resources.length})
**Note**: When used in opentofu/terraform, the resource names are prefixed with the provider name (e.g., \`${providerName}_${resources[0].name}\`).

**Example**: Use \`get-resource-docs\` with namespace="${namespace}", name="${providerName}", resource="${resources[0].name}" to get documentation for the first resource.

${resources.map((resource) => `- ${resource.name}: ${truncateString(resource.description) || "No description"}`).join("\n")}
`.trim();
}

function renderDataSourcesSection(datasources: definitions["ProviderDocItem"][], providerName: string, namespace: string): string {
  if (!datasources?.length) return "";
  return `
### Data Sources (${datasources.length})
**Note**: When used in opentofu/terraform, the data source names are prefixed with the provider name (e.g., \`${providerName}_${datasources[0].name}\`).

**Example**: Use \`get-datasource-docs\` with namespace="${namespace}", name="${providerName}", dataSource="${datasources[0].name}" to get documentation for the first data source.

${datasources.map((datasource) => `- ${datasource.name}: ${truncateString(datasource.description) || "No description"}`).join("\n")}
`.trim();
}

function renderSearchResults(r: definitions["SearchResultItem"]): string {
  let result = `- ${r.title} ${r.description.trim()} (${r.type})`;
  result += ` (latest version: ${r.version})`;
  switch (r.type) {
    case "provider":
      result += `\n  Provider: ${r.link_variables.namespace}/${r.link_variables.name}`;
      result += `\n  Provider Details: Use 'get-provider-details' with namespace="${r.link_variables.namespace}" and name="${r.link_variables.name}"`;
      break;
    case "module":
      result += `\n  Module: ${r.link_variables.namespace}/${r.link_variables.name} (${r.link_variables.target})`;
      result += `\n  Module Details: Use 'get-module-details' with namespace="${r.link_variables.namespace}", name="${r.link_variables.name}", target="${r.link_variables.target}"`;
      break;
    case "provider/resource": {
      const versionParam = r.version ? `, version="${r.version}"` : "";
      result += `\n  Resource: ${r.link_variables.namespace}/${r.link_variables.name} (${r.link_variables.id})`;
      result += `\n  Full identifier: ${r.link_variables.name}_${r.link_variables.id}`;
      result += `\n  Resource Docs: Use 'get-resource-docs' with namespace="${r.link_variables.namespace}", name="${r.link_variables.name}", resource="${r.link_variables.id}"${versionParam}`;
      result += `\n  Provider Details: Use 'get-provider-details' with namespace="${r.link_variables.namespace}" and name="${r.link_variables.name}"`;
      break;
    }
    case "provider/data-source": {
      const versionParam = r.version ? `, version="${r.version}"` : "";
      result += `\n  Data Source: ${r.link_variables.namespace}/${r.link_variables.name} (${r.link_variables.id})`;
      result += `\n  Full identifier: ${r.link_variables.name}_${r.link_variables.id}`;
      result += `\n  Data Source Docs: Use 'get-datasource-docs' with namespace="${r.link_variables.namespace}", name="${r.link_variables.name}", dataSource="${r.link_variables.id}"${versionParam}`;
      result += `\n  Provider Details: Use 'get-provider-details' with namespace="${r.link_variables.namespace}" and name="${r.link_variables.name}"`;
      break;
    }
    default:
      result += `\n  Unknown type: ${r.type}`;
  }
  return result;
}
