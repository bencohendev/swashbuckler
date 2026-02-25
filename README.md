# swashbuckler
A ttrpg campaign logger

## Getting Started

### Environment Variables

Environment variables live in a single `.env.local` file at the repo root. Each app that needs them requires a symlink:

```bash
# From the repo root
ln -s ../../.env.local apps/web/.env.local
```

See `apps/web/.env.local.example` for the required keys. This is necessary because Next.js only loads `.env` files from its own project directory, not the monorepo root.
