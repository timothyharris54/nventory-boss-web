# Nventory Boss Web

React frontend for Nventory Boss.

## Local development

Install dependencies and start Vite:

```bash
npm ci
npm run dev
```

Requests to `/api` are proxied to `http://localhost:3000`, so the backend
should be running there. Set `VITE_API_BASE_URL` in a root `.env.local` only
when you need to call a different backend directly. All `VITE_*` values are
compiled into the browser bundle and must be treated as public.

## Container

Build the production image:

```bash
docker build -t nventory-boss-web .
```

The container serves the SPA on port 80 and proxies `/api/*` to
`http://api:3000` by default. In a Compose stack, name the backend service
`api`, or set `API_UPSTREAM` on the web container:

```yaml
web:
  build: ./nventory-boss-web
  environment:
    API_UPSTREAM: http://api:3000
  ports:
    - "8080:80"
```

The container health endpoint is `/healthz`. Browser routes fall back to
`index.html`, while fingerprinted assets are cached for one year.

## Combined application stack

The root `compose.yaml` runs the web frontend, NestJS API, PostgreSQL, and a
one-shot Prisma migration service. It expects this repository and the backend
repository to be sibling directories:

```text
parent/
├── nventory-boss-web/
└── stockpilot-api/
```

Create deployment settings and start the stack:

```bash
cp compose.env.example .env
# Replace POSTGRES_PASSWORD and JWT_SECRET before continuing.
docker compose up --build -d
docker compose ps
```

The application is available on `http://localhost:8080` by default. Only the
web service is published to the host; the API and database are reachable only
on the internal Compose network. Database data is stored in the named
`postgres_data` volume.

Migrations run automatically before the API starts. To populate a new database
with the current Prisma seed data, run this explicitly after startup:

```bash
docker compose run --rm api npx prisma db seed
```

Useful operations:

```bash
docker compose logs -f
docker compose pull
docker compose up --build -d
docker compose down
```

`docker compose down` preserves database data. Adding `--volumes` deletes the
database and should only be used when a complete reset is intended. Back up the
database volume to storage outside the Docker host before production use.

## Vite reference

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
