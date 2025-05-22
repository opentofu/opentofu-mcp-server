# OpenTofu MCP Server

A Model Context Protocol (MCP) server for accessing the OpenTofu Registry. This server allows language model assistants to search for and retrieve information about OpenTofu providers, modules, resources, and data sources.

## Features

- Search the OpenTofu Registry for providers, modules, resources, and data sources
- Get detailed information about specific providers and modules
- Access documentation for resources and data sources
- Retrieve comprehensive OpenTofu configuration examples
- MCP-compatible interface for AI assistants

## Usage

You can use this MCP server with any AI assistant that supports the Model Context Protocol.

### Using with npx

The easiest way to use the OpenTofu MCP server is with npx:

```bash
npx opentofu-mcp-server
```

This will start the MCP server, which can be used with Claude, ChatGPT, or other MCP-compatible assistants.

You can also install it globally:

```bash
npm install -g opentofu-mcp-server
opentofu-mcp-server
```

### Using with Claude Code

For Claude Code users, you can add this server to your session with:

```bash
claude mcp add opentofu-mcp-server
```

### Available Tools

The OpenTofu MCP server provides the following tools:

#### Registry Search and Information

- `search-opentofu-registry`: Search for providers, modules, resources, and data sources
- `get-provider-details`: Get detailed information about a specific provider
- `get-module-details`: Get detailed information about a specific module
- `get-resource-docs`: Get documentation for a specific resource
- `get-datasource-docs`: Get documentation for a specific data source
