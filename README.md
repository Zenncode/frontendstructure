# zenncode

`zenncode` is a frontend scaffolding CLI that creates a clean project structure with optional starter files and smart defaults.

## Frontend templates

- `react-router`
- `expo`
- `vue`
- `nuxt`
- `next`
- `angular`
- `react`
- `vite`

## Install

```bash
npm i zenncode
```

## Run without install

```bash
npx zenncode init
```

## Usage

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

Interactive mode now uses a radio-style template selector with green highlight for the active option. Use arrow keys, then press Enter.

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
