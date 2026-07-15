import semver from "semver";
import type { components, operations } from "../generated/opentofu-api.js";
import { PACKAGE_NAME, PACKAGE_VERSION } from "../utils.js";

type apiDefinition = components["schemas"];

export const API_BASE_URL = "https://api.opentofu.org";

export type ProviderWithLatestVersion = apiDefinition["Provider"] & {
  latestVersion?: apiDefinition["ProviderVersion"];
};

export type DocType = operations["GetProviderDocItem"]["parameters"]["path"]["kind"];

export class RegistryClient {
  private apiBaseUrl: string;
  private userAgent = `${PACKAGE_NAME}/${PACKAGE_VERSION}`;
  private fetch: typeof globalThis.fetch;

  constructor(apiBaseUrl: string = API_BASE_URL, fetch: typeof globalThis.fetch = globalThis.fetch) {
    this.apiBaseUrl = apiBaseUrl;
    this.fetch = fetch;
  }

  private async fetchFromApi<T>(path: string, params: Record<string, string> = {}, responseType: "json" | "text" = "json"): Promise<T> {
    const queryParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        queryParams.append(key, value);
      }
    }

    const queryString = queryParams.toString();
    const url = `${this.apiBaseUrl}${String(path)}${queryString ? `?${queryString}` : ""}`;

    const response = await this.fetch(url, {
      headers: {
        "User-Agent": this.userAgent,
      },
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    return (responseType === "json" ? response.json() : response.text()) as Promise<T>;
  }

  /**
   * Sorts versions (provider or module) newest-first using semver. Versions that
   * cannot be parsed as semver are left in their original relative order, after
   * any valid semver versions.
   */
  private sortVersionsDescending<T extends { id: string; published: string }>(versions: T[]): T[] {
    if (!versions || versions.length === 0) {
      return [];
    }

    const withNormalized = versions.map((v) => ({
      version: v,
      normalized: semver.valid(semver.coerce(v.id.replace(/^v/, ""))),
    }));

    const valid = withNormalized.filter((v) => v.normalized !== null);
    const invalid = withNormalized.filter((v) => v.normalized === null);

    valid.sort((a, b) => semver.compare(b.normalized as string, a.normalized as string));

    return [...valid, ...invalid].map((v) => v.version);
  }

  private getLatestVersion(versions: apiDefinition["ProviderVersionDescriptor"][]): string | undefined {
    return this.sortVersionsDescending(versions)[0]?.id;
  }

  private async getLatestProviderVersion(namespace: string, name: string): Promise<string | undefined> {
    const provider = await this.fetchFromApi<apiDefinition["Provider"]>(`/registry/docs/providers/${namespace}/${name}/index.json`);
    return this.getLatestVersion(provider.versions);
  }

  async search(query: string, type?: string): Promise<apiDefinition["SearchResultItem"][]> {
    const params: Record<string, string> = { q: query };
    const response = await this.fetchFromApi<apiDefinition["SearchResultItem"][]>("/registry/docs/search", params);

    let results = response;
    if (type && type !== "all") {
      results = response.filter((item) => item.type.toLowerCase() === type.toLowerCase());
    }
    return results;
  }

  async getProviderList(): Promise<apiDefinition["ProviderList"]> {
    return await this.fetchFromApi<apiDefinition["ProviderList"]>("/registry/docs/providers/index.json");
  }

  async getProviderDetails(namespace: string, name: string): Promise<ProviderWithLatestVersion> {
    const path = `/registry/docs/providers/${namespace}/${name}/index.json`;
    const provider = await this.fetchFromApi<apiDefinition["Provider"]>(path);

    const enhancedProvider: ProviderWithLatestVersion = { ...provider };

    if (provider.versions?.length > 0) {
      const latestVersion = this.getLatestVersion(provider.versions);

      const versionPath = `/registry/docs/providers/${namespace}/${name}/${latestVersion}/index.json`;
      const versionDetails = await this.fetchFromApi<apiDefinition["ProviderVersion"]>(versionPath);
      enhancedProvider.latestVersion = versionDetails;
    }

    return enhancedProvider;
  }

  /**
   * Returns just the available versions for a provider (id + published date),
   * sorted newest-first. This performs a single, lightweight API call — unlike
   * getProviderDetails, it does not fetch the full docs for the latest version.
   */
  async getProviderVersions(namespace: string, name: string): Promise<apiDefinition["ProviderVersionDescriptor"][]> {
    const path = `/registry/docs/providers/${namespace}/${name}/index.json`;
    const provider = await this.fetchFromApi<apiDefinition["Provider"]>(path);
    return this.sortVersionsDescending(provider.versions);
  }

  async getModuleList(): Promise<apiDefinition["ModuleList"]> {
    return await this.fetchFromApi<apiDefinition["ModuleList"]>("/registry/docs/modules/index.json");
  }

  async getModuleDetails(namespace: string, name: string, target: string): Promise<apiDefinition["Module"]> {
    const path = `/registry/docs/modules/${namespace}/${name}/${target}/index.json`;
    return await this.fetchFromApi<apiDefinition["Module"]>(path);
  }

  /**
   * Returns just the available versions for a module (id + published date),
   * sorted newest-first. Note: unlike getProviderVersions vs getProviderDetails,
   * this isn't a lighter-weight call than getModuleDetails (both hit the same
   * single, already-lightweight module endpoint) — this exists to mirror
   * getProviderVersions and provide a dedicated, structured-output tool.
   */
  async getModuleVersions(namespace: string, name: string, target: string): Promise<apiDefinition["ModuleVersionDescriptor"][]> {
    const path = `/registry/docs/modules/${namespace}/${name}/${target}/index.json`;
    const module = await this.fetchFromApi<apiDefinition["Module"]>(path);
    return this.sortVersionsDescending(module.versions);
  }

  async getResourceDocs(namespace: string, name: string, target: string, version?: string): Promise<string> {
    return await this.fetchMarkdownDoc("resource", namespace, name, target, version);
  }

  async getDataSourceDocs(namespace: string, name: string, target: string, version?: string): Promise<string> {
    return await this.fetchMarkdownDoc("datasource", namespace, name, target, version);
  }

  private async fetchMarkdownDoc(docType: DocType, namespace: string, name: string, docName: string, version?: string): Promise<string> {
    let targetVersion = version;
    if (!targetVersion) {
      targetVersion = await this.getLatestProviderVersion(namespace, name);
      if (!targetVersion) {
        throw new Error(`Could not determine latest version for provider ${namespace}/${name}`);
      }
    }

    const path = `/registry/docs/providers/${namespace}/${name}/${targetVersion}/${docType}s/${docName}.md`;
    console.error(`Fetching ${path}`);
    return this.fetchFromApi<string>(path, {}, "text");
  }
}
