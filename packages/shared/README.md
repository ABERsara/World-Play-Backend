# Shared Package

This lightweight package lives at `packages/shared` and provides code that is reused by other components in the monorepo. Its primary purpose is to avoid duplication and keep validation logic consistent across the client, server, and media-server.

##  Contents

- `src/index.js` – exports several [Zod](https://github.com/colinhacks/zod) schemas used for input validation:
  - `CreateGameSchema`
  - `JoinGameSchema`
  - `SubmitAnswerSchema`

  These help ensure both frontend forms and backend endpoints agree on the same rules.

##  Usage

Each package references `shared` via a workspace dependency (see `package.json` entries like `"packages/shared": "workspace:*"`). Example import:

```js
import { CreateGameSchema } from '@world-play/shared';
```

You can publish this package to an internal registry or continue consuming it via yarn/npm workspaces in the monorepo.

## Development

No build step is required (plain JavaScript). Just modify the source and update dependent packages by reinstalling or running `yarn workspace <pkg> add @world-play/shared@*`.

---

> Keep shared logic minimal. If a dependency grows too large or becomes domain-specific, consider moving it to the appropriate package instead.

