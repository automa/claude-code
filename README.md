# claude-code

This is an [AI](https://docs.automa.app/agents/types#ai) & [manual](https://docs.automa.app/agents/types#manual) bot for [**Automa**](https://automa.app) that uses [Anthropic's Claude Code](https://www.anthropic.com/claude-code) tool to work on tasks.

#### Features

- Runs tasks via job schedule with retry and backoff support.
- Generates pull request titles and bodies using Claude Sonnet 4.

## Getting Started

[![Install on Automa](https://automa.app/install.svg)](https://automa.app/agents/anthropic/claude-code)

### Self-Hosting

This bot can be self-hosted. You can follow these steps to get it running.

#### Prerequisites

- Have [`docker`](https://docker.com/) installed.

#### Needed services

- Have [`redis`](https://github.com/redis/redis) or any redis compatible memory store running.

#### Automa agent

[Create an agent](https://docs.automa.app/agent-development/create-agent) of [manual](https://docs.automa.app/agents/types#manual) type on [Automa](https://automa.app) (Cloud or Self-hosted) and point its webhook to your planned server (e.g., `http://your-server-ip:8000/hooks/automa`). Copy the **webhook secret** after it is created.

#### Starting the server

```sh
docker run -it --rm -p 8000:8000 \
  -e REDIS_URL=your_url_here \
  -e AUTOMA_WEBHOOK_SECRET=your_secret_here \
  -e ANTHROPIC_API_KEY=your_key_here \
  ghcr.io/automa/claude-code
```

You can also use [AWS Bedrock](https://docs.anthropic.com/en/docs/claude-code/amazon-bedrock) by setting the relevant environment variables.

## How It Works

It runs [`claude-code`](https://www.anthropic.com/claude-code) in `bypassPermissions` mode.

## Contributing

Contributions and feedback are welcome! Feel free to open an issue or submit a pull request. See [CONTRIBUTING.md](CONTRIBUTING.md) for more details. Here is a list of [Contributors](https://github.com/automa/claude-code/contributors).

## LICENSE

MIT

## Bug Reports

Report [here](https://github.com/automa/claude-code/issues).
