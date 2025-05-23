import type { definitions } from "../../generated/opentofu-api.js";
import type { ProviderWithLatestVersion } from "../../registry/index.js";

export function renderProviderDetails(name: string, namespace: string, provider: ProviderWithLatestVersion): string {
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

export function renderModuleDetails(module: definitions["Module"]): string {
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

export function renderResourcesSection(resources: definitions["ProviderDocItem"][], providerName: string, namespace: string): string {
  if (!resources?.length) return "";
  return `
### Resources (${resources.length})
**Note**: When used in opentofu/terraform, the resource names are prefixed with the provider name (e.g., \`${providerName}_${resources[0].name}\`).

**Example**: Use \`get-resource-docs\` with namespace="${namespace}", name="${providerName}", resource="${resources[0].name}" to get documentation for the first resource.

${resources.map((resource) => `- ${resource.name}: ${truncateString(resource.description) || "No description"}`).join("\n")}
`.trim();
}

export function renderDataSourcesSection(datasources: definitions["ProviderDocItem"][], providerName: string, namespace: string): string {
  if (!datasources?.length) return "";
  return `
### Data Sources (${datasources.length})
**Note**: When used in opentofu/terraform, the data source names are prefixed with the provider name (e.g., \`${providerName}_${datasources[0].name}\`).

**Example**: Use \`get-datasource-docs\` with namespace="${namespace}", name="${providerName}", dataSource="${datasources[0].name}" to get documentation for the first data source.

${datasources.map((datasource) => `- ${datasource.name}: ${truncateString(datasource.description) || "No description"}`).join("\n")}
`.trim();
}

export function renderSearchResults(r: definitions["SearchResultItem"]): string {
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
