# Cloudflare Workers deployment

This application uses Next.js server rendering, Server Actions, and Prisma. Deploy it to Cloudflare Workers through the OpenNext adapter; it is not a static Cloudflare Pages export.

Before the first deployment, authenticate Wrangler and add the production values as Worker secrets:

```bash
npx wrangler login
npx wrangler secret put DATABASE_URL
npx wrangler secret put SESSION_SECRET
npx wrangler secret put ADMIN_USERNAME
npx wrangler secret put ADMIN_PASSWORD
npx wrangler secret put NEXT_PUBLIC_SITE_URL
```

For PostgreSQL in Workers, create a Cloudflare Hyperdrive configuration and add its ID to the commented `hyperdrive` block in `wrangler.jsonc`. The project already uses `@prisma/adapter-pg`, which is the Prisma driver-adapter path supported with Hyperdrive.

Deploy or preview with:

```bash
npm run deploy
npm run preview
```

Cloudflare builds require Node.js 22 or newer, as declared in `package.json`.
