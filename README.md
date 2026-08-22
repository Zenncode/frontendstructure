# zenncode

`zenncode` is a frontend scaffolding CLI that creates a clean project structure with optional starter files and smart defaults.

Generated projects also include project-root folders:

- `docs/` — product notes, architecture, and onboarding
- `tests/` — unit, integration, and end-to-end tests

## Framework install commands

Create the app with the official CLI first, `cd` into it, then run `zenncode init`.

### React

```bash
npm create vite@latest my-app -- --template react
cd my-app
npm install
npx zenncode init --framework react
```

TypeScript:

```bash
npm create vite@latest my-app -- --template react-ts
cd my-app
npm install
npx zenncode init --framework react --ts
```

### React Router

```bash
npx create-react-router@latest my-app
cd my-app
npm install
npx zenncode init --framework react-router --ts
```

### React Expo

```bash
npx create-expo-app@latest my-app
cd my-app
npm install
npx zenncode init --framework expo --ts
```

### Vue

```bash
npm create vue@latest my-app
cd my-app
npm install
npx zenncode init --framework vue
```

### Nuxt

```bash
npx nuxi@latest init my-app
cd my-app
npm install
npx zenncode init --framework nuxt
```

### Next.js

```bash
npx create-next-app@latest my-app
cd my-app
npx zenncode init --framework next --ts --yes
```

### Angular

```bash
npx @angular/cli@latest new my-app
cd my-app
npm install
npx zenncode init --framework angular --install
```

### Vite

```bash
npm create vite@latest my-app
cd my-app
npm install
npx zenncode init --framework vite
```

TypeScript:

```bash
npm create vite@latest my-app -- --template react-ts
cd my-app
npm install
npx zenncode init --framework vite --ts
```

## Install zenncode

```bash
npm i zenncode
```

## Run without install

```bash
npx zenncode init
```

## zenncode init

```bash
zenncode init
zenncode init --framework react-router --ts
zenncode init --framework expo --ts
zenncode init --framework vue --router
zenncode init --framework nuxt
zenncode init --framework next --yes
zenncode init --framework angular --install
zenncode init --interactive
```

Interactive mode uses a radio-style template selector with green highlight for the active option. Use arrow keys, then press Enter.

## Available options

- `--framework <react-router|expo|vue|nuxt|next|angular|react|vite>`
- `--react-router`, `--expo`, `--vue`, `--nuxt`, `--next`, `--angular`, `--react`, `--vite`
- `--tailwind` / `--no-tailwind`
- `--ts` / `--no-ts`
- `--router` / `--no-router`
- `--install` / `--no-install`
- `--interactive`
- `--yes`
- `--help`
