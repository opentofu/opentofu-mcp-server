# Contributing to OpenTofu MCP Server

Thank you for your interest in contributing to the OpenTofu MCP Server project! This document outlines how you can contribute to the project.

## How to Contribute

The easiest way to contribute is by [opening an issue](https://github.com/opentofu/opentofu-mcp-server/issues/new/choose) to report bugs or suggest features.

External contributions are welcome via pull requests. For substantial changes, please open an issue first to discuss what you would like to change.

## Development Prerequisites

- Node.js (v18 or later)
- pnpm package manager

## Setting Up Development Environment

```bash
# Install dependencies
pnpm install

# Generate OpenAPI client from the OpenTofu Registry API spec
pnpm generate-api

# Run the server in development mode with hot reloading
pnpm dev
```

## Code Quality

Always run these commands before submitting changes:

```bash
# Run type checking
pnpm typecheck

# Run code formatting (Biome)
pnpm format

# Run linting (Biome)
pnpm lint
```

## Pull Request Process

1. Fork the repository on GitHub
2. Create an issue first to discuss your proposed change
3. Only work on issues that have been accepted
4. Create a branch in your fork for your changes
5. Make your changes following the development guidelines in CLAUDE.md
6. Ensure all checks pass (type checking, formatting, linting)
7. Submit a pull request to the main branch

## Developer Certificate of Origin (DCO)

Contributors must sign-off each commit by adding a `Signed-off-by: name <email>` line to commit messages to certify they have the right to submit the code they are contributing and agree to the [Developer Certificate of Origin](https://developercertificate.org/).

You can use the `-s` command line option with `git commit` to automatically add this signature:

```bash
git commit -s -m 'Add new feature'
```

## Additional Requirements

- Update documentation if necessary
- For user-facing changes, note the change in your pull request description
- Discuss potential contributions before starting work

## License

By contributing to this project, you agree that your contributions will be licensed under the project's license.