# OpenTofu MCP Server

A Model Context Protocol (MCP) server for accessing the OpenTofu Registry. This server allows language model assistants to search for and retrieve information about OpenTofu providers, modules, resources, and data sources.

Available as both a local Node.js server and a remote Cloudflare Worker deployment.

## Features

- Search the OpenTofu Registry for providers, modules, resources, and data sources
- Get detailed information about specific providers and modules
- Access documentation for resources and data sources
- Retrieve comprehensive OpenTofu configuration examples
- MCP-compatible interface for AI assistants

## Installation

You can use this MCP server with any AI assistant that supports the Model Context Protocol. Choose between the hosted service or local installation:

### Hosted Service (Recommended)

The easiest way to get started is to use our hosted service at `mcp.opentofu.org`. Benefits include:

- ✅ No local installation required
- ✅ Always up-to-date with the latest OpenTofu Registry data
- ✅ Globally distributed via Cloudflare Workers
- ✅ High availability and performance

#### Claude Code

Add the hosted OpenTofu MCP server to Claude Code:

```bash
claude mcp add opentofu -t sse https://mcp.opentofu.org/sse
```

#### Generic MCP Configuration

```json
{
  "mcpServers": {
    "opentofu": {
      "transport": "sse",
      "endpoint": "https://mcp.opentofu.org/sse"
    }
  }
}
```

### Local Server

#### Basic Usage

You can also run the server locally with npx:

```bash
npx @opentofu/opentofu-mcp-server
```

#### Global Installation

Install globally for repeated use:

```bash
npm install -g @opentofu/opentofu-mcp-server
opentofu-mcp-server
```

#### Claude Code (Local)

Add the local server to Claude Code:

```bash
claude mcp add opentofu -- npx @opentofu/opentofu-mcp-server
```

#### Generic MCP Configuration (Local)

```json
{
  "mcpServers": {
    "opentofu": {
      "command": "npx",
      "args": ["-y", "@opentofu/opentofu-mcp-server"]
    }
  }
}
```

### Available Tools

The OpenTofu MCP server provides the following tools:

#### Registry Search and Information

- `search-opentofu-registry`: Search for providers, modules, resources, and data sources
- `get-provider-details`: Get detailed information about a specific provider
- `get-module-details`: Get detailed information about a specific module
- `get-resource-docs`: Get documentation for a specific resource
- `get-datasource-docs`: Get documentation for a specific data source
