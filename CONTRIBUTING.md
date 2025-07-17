# How to Contribute

## Prerequisites

- Have [`git`](https://git-scm.com/) installed.
- Have [`docker`](https://docker.com/) installed.
- Have [`node`](https://nodejs.org/) & [`pnpm`](https://pnpm.io/) installed.
- Have a [manual](https://docs.automa.app/bots/types#manual) bot in either [Automa](https://automa.app) (Cloud or Self-hosted) or in [automa/monorepo](https://github.com/automa/monorepo) local setup.

## Setup environment variables

```sh
export AUTOMA_WEBHOOK_SECRET=your_secret_here
export ANTHROPIC_API_KEY=your_key_here
```

## Installing dependencies

```sh
pnpm install
```

## Starting the server

```sh
pnpm start
```

## Stopping the server

```sh
pnpm stop
```

## CI/CD

#### Testing

```sh
pnpm start-deps
pnpm test
```

#### Linting

```sh
pnpm lint
```

#### Formatting

```sh
pnpm format
```
