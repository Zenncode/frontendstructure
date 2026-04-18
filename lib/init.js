import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import readline from "node:readline/promises";

const CHECK = "\u2714";
const WARN = "!";

function logCreated(message) {
  console.log(`${CHECK} ${message}`);
}

function logInfo(message) {
  console.log(`i ${message}`);
}

function logWarn(message) {
  console.log(`${WARN} ${message}`);
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    logCreated(`Created ${path.relative(process.cwd(), dir) || "."}`);
    return true;
  }

  return false;
}

function writeFileIfMissing(filePath, contents) {
  if (fs.existsSync(filePath)) {
    logInfo(`Skipped existing ${path.relative(process.cwd(), filePath)}`);
    return false;
  }

  fs.writeFileSync(filePath, `${contents.trimEnd()}\n`, "utf8");
  logCreated(`Created ${path.relative(process.cwd(), filePath)}`);
  return true;
}

function normalizeFramework(raw) {
  if (!raw) {
    return undefined;
  }

  const normalized = raw.trim().toLowerCase();

  if (normalized === "next" || normalized === "nextjs") {
    return "next";
  }

  if (normalized === "vite") {
    return "vite";
  }

  if (normalized === "react" || normalized === "reactjs") {
    return "react";
  }

  if (normalized === "react-router" || normalized === "router") {
    return "react";
  }

  throw new Error(
    `Invalid framework "${raw}". Use one of: react, next, vite.`
  );
}

function parseInitArgs(rawArgs) {
  const options = {
    framework: undefined,
    tailwind: undefined,
    typescript: undefined,
    router: undefined,
    install: undefined,
    yes: false,
    interactive: false,
    help: false
  };

  let hasPresetFlags = false;

  for (let i = 0; i < rawArgs.length; i += 1) {
    const arg = rawArgs[i];

    switch (arg) {
      case "--help":
      case "-h":
        options.help = true;
        break;
      case "--tailwind":
        options.tailwind = true;
        hasPresetFlags = true;
        break;
      case "--no-tailwind":
        options.tailwind = false;
        hasPresetFlags = true;
        break;
      case "--ts":
      case "--typescript":
        options.typescript = true;
        hasPresetFlags = true;
        break;
      case "--no-ts":
      case "--no-typescript":
        options.typescript = false;
        hasPresetFlags = true;
        break;
      case "--router":
        options.router = true;
        hasPresetFlags = true;
        break;
      case "--no-router":
        options.router = false;
        hasPresetFlags = true;
        break;
      case "--install":
        options.install = true;
        hasPresetFlags = true;
        break;
      case "--no-install":
        options.install = false;
        hasPresetFlags = true;
        break;
      case "--framework": {
        const value = rawArgs[i + 1];

        if (!value || value.startsWith("-")) {
          throw new Error("Missing value for --framework.");
        }

        options.framework = normalizeFramework(value);
        i += 1;
        hasPresetFlags = true;
        break;
      }
      case "--next":
        options.framework = "next";
        hasPresetFlags = true;
        break;
      case "--vite":
        options.framework = "vite";
        hasPresetFlags = true;
        break;
      case "--react":
        options.framework = "react";
        hasPresetFlags = true;
        break;
      case "--interactive":
        options.interactive = true;
        break;
      case "--yes":
      case "-y":
        options.yes = true;
        break;
      default:
        throw new Error(`Unknown option: ${arg}`);
    }
  }

  return { options, hasPresetFlags };
}

function detectFramework() {
  const cwd = process.cwd();
  const packageJsonPath = path.join(cwd, "package.json");
  const nextConfigFiles = [
    "next.config.js",
    "next.config.mjs",
    "next.config.ts"
  ];
  const viteConfigFiles = [
    "vite.config.js",
    "vite.config.mjs",
    "vite.config.ts",
    "vite.config.cjs"
  ];

  if (nextConfigFiles.some((file) => fs.existsSync(path.join(cwd, file)))) {
    return "next";
  }

  if (viteConfigFiles.some((file) => fs.existsSync(path.join(cwd, file)))) {
    return "vite";
  }

  if (fs.existsSync(packageJsonPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
      const deps = {
        ...(pkg.dependencies ?? {}),
        ...(pkg.devDependencies ?? {})
      };

      if ("next" in deps) {
        return "next";
      }

      if ("vite" in deps) {
        return "vite";
      }

      if ("react-router-dom" in deps || "react-router" in deps) {
        return "react-router";
      }

      if ("react" in deps) {
        return "react";
      }
    } catch (error) {
      logWarn("Could not parse package.json for framework detection.");
    }
  }

  return "unknown";
}

function detectTypeScript() {
  const cwd = process.cwd();

  return (
    fs.existsSync(path.join(cwd, "tsconfig.json")) ||
    fs.existsSync(path.join(cwd, "tsconfig.app.json"))
  );
}

function detectTailwind() {
  const cwd = process.cwd();
  const tailwindConfigs = [
    "tailwind.config.js",
    "tailwind.config.cjs",
    "tailwind.config.mjs",
    "tailwind.config.ts"
  ];

  return tailwindConfigs.some((file) => fs.existsSync(path.join(cwd, file)));
}

function resolveBaseDir(framework) {
  const cwd = process.cwd();
  const appDir = path.join(cwd, "app");
  const srcDir = path.join(cwd, "src");

  if (fs.existsSync(appDir)) {
    return "app";
  }

  if (fs.existsSync(srcDir)) {
    return "src";
  }

  if (framework === "next") {
    ensureDir(appDir);
    return "app";
  }

  ensureDir(srcDir);
  return "src";
}

function frameworkLabel(framework) {
  switch (framework) {
    case "next":
      return "Next.js";
    case "vite":
      return "Vite";
    case "react":
      return "React";
    default:
      return "Unknown";
  }
}

function getNavbarTemplate({ tailwind, typescript }) {
  const classes = tailwind
    ? "flex items-center justify-between rounded-lg bg-slate-900 px-4 py-3 text-white"
    : "navbar";

  if (typescript) {
    return `const Navbar = (): JSX.Element => {
  return (
    <nav className="${classes}">
      <h1>ZennCode</h1>
    </nav>
  );
};

export default Navbar;`;
  }

  return `const Navbar = () => {
  return (
    <nav className="${classes}">
      <h1>ZennCode</h1>
    </nav>
  );
};

export default Navbar;`;
}

function getMainLayoutTemplate({ tailwind, typescript, componentExt }) {
  const wrapperClass = tailwind
    ? "min-h-screen bg-slate-50 text-slate-900"
    : "main-layout";
  const mainClass = tailwind ? "mx-auto max-w-6xl p-6" : "main-content";
  const navbarImport = `../components/layout/Navbar.${componentExt}`;

  if (typescript) {
    return `import type { ReactNode } from "react";
import Navbar from "${navbarImport}";

type MainLayoutProps = {
  children: ReactNode;
};

const MainLayout = ({ children }: MainLayoutProps): JSX.Element => {
  return (
    <div className="${wrapperClass}">
      <Navbar />
      <main className="${mainClass}">{children}</main>
    </div>
  );
};

export default MainLayout;`;
  }

  return `import Navbar from "${navbarImport}";

const MainLayout = ({ children }) => {
  return (
    <div className="${wrapperClass}">
      <Navbar />
      <main className="${mainClass}">{children}</main>
    </div>
  );
};

export default MainLayout;`;
}

function getAppRoutesTemplate({ router, framework, typescript, componentExt }) {
  if (framework === "next") {
    if (typescript) {
      return `const AppRoutes = (): null => {
  return null;
};

export default AppRoutes;`;
    }

    return `const AppRoutes = () => {
  return null;
};

export default AppRoutes;`;
  }

  if (router) {
    if (typescript) {
      return `import { BrowserRouter, Route, Routes } from "react-router-dom";
import MainLayout from "../layouts/MainLayout.${componentExt}";

const AppRoutes = (): JSX.Element => {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <MainLayout>
              <h2>Home page</h2>
            </MainLayout>
          }
        />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRoutes;`;
    }

    return `import { BrowserRouter, Route, Routes } from "react-router-dom";
import MainLayout from "../layouts/MainLayout.${componentExt}";

const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <MainLayout>
              <h2>Home page</h2>
            </MainLayout>
          }
        />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRoutes;`;
  }

  if (typescript) {
    return `import MainLayout from "../layouts/MainLayout.${componentExt}";

const AppRoutes = (): JSX.Element => {
  return (
    <MainLayout>
      <h2>Home page</h2>
    </MainLayout>
  );
};

export default AppRoutes;`;
  }

  return `import MainLayout from "../layouts/MainLayout.${componentExt}";

const AppRoutes = () => {
  return (
    <MainLayout>
      <h2>Home page</h2>
    </MainLayout>
  );
};

export default AppRoutes;`;
}

function getApiTemplate({ typescript }) {
  const typeLine = typescript ? "import type { AxiosInstance } from \"axios\";\n" : "";
  const declaration = typescript ? "const api: AxiosInstance = axios.create({" : "const api = axios.create({";

  return `${typeLine}import axios from "axios";

${declaration}
  baseURL: "/api"
});

export default api;`;
}

function getGlobalStyleTemplate({ tailwind }) {
  if (tailwind) {
    return `@tailwind base;
@tailwind components;
@tailwind utilities;
`;
  }

  return `:root {
  font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
}
`;
}

function renderPresetSummary(preset) {
  console.log("");
  logInfo(`Framework: ${frameworkLabel(preset.framework)}`);
  logInfo(`TypeScript: ${preset.typescript ? "yes" : "no"}`);
  logInfo(`Tailwind: ${preset.tailwind ? "yes" : "no"}`);
  logInfo(`Router starter: ${preset.router ? "yes" : "no"}`);
  logInfo(`Install deps: ${preset.install ? "yes" : "no"}`);
  console.log("");
}

async function askYesNo(rl, label, defaultValue) {
  const suffix = defaultValue ? "Y/n" : "y/N";
  const answer = (await rl.question(`${label} (${suffix}): `))
    .trim()
    .toLowerCase();

  if (!answer) {
    return defaultValue;
  }

  if (["y", "yes"].includes(answer)) {
    return true;
  }

  if (["n", "no"].includes(answer)) {
    return false;
  }

  logWarn("Invalid answer. Using default value.");
  return defaultValue;
}

async function askFramework(rl, detectedFramework) {
  const options = ["react", "vite", "next"];
  const defaultFramework = options.includes(detectedFramework)
    ? detectedFramework
    : "react";

  console.log("Choose framework:");
  options.forEach((framework, index) => {
    const isDefault = framework === defaultFramework;
    const display = frameworkLabel(framework);
    console.log(`${index + 1}. ${display}${isDefault ? " (default)" : ""}`);
  });

  const answer = (await rl.question("Framework [1-3]: ")).trim();

  if (!answer) {
    return defaultFramework;
  }

  const choice = Number(answer);
  if (Number.isInteger(choice) && choice >= 1 && choice <= options.length) {
    return options[choice - 1];
  }

  try {
    const fromName = normalizeFramework(answer);
    if (fromName) {
      return fromName;
    }
  } catch (error) {
    logWarn("Invalid framework. Using default value.");
  }

  return defaultFramework;
}

async function collectInteractivePreset(detected) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  try {
    const framework = await askFramework(rl, detected.framework);
    const typescript = await askYesNo(rl, "Use TypeScript?", detected.typescript);
    const tailwind = await askYesNo(rl, "Use Tailwind?", detected.tailwind);
    const routerDefault = framework === "next" ? false : detected.router;
    const router =
      framework === "next"
        ? false
        : await askYesNo(rl, "Add React Router starter?", routerDefault);
    const install = await askYesNo(rl, "Install dependencies now?", false);

    return { framework, typescript, tailwind, router, install };
  } finally {
    rl.close();
  }
}

function installDependencies(preset) {
  const runtimeDeps = ["axios"];
  const devDeps = [];

  if (preset.router && preset.framework !== "next") {
    runtimeDeps.push("react-router-dom");
  }

  if (preset.tailwind) {
    devDeps.push("tailwindcss", "postcss", "autoprefixer");
  }

  const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

  if (runtimeDeps.length > 0) {
    logInfo(`Installing runtime deps: ${runtimeDeps.join(", ")}`);
    const runtimeResult = spawnSync(npmCommand, ["install", ...runtimeDeps], {
      cwd: process.cwd(),
      stdio: "inherit"
    });

    if (runtimeResult.status !== 0) {
      throw new Error("Failed to install runtime dependencies.");
    }
  }

  if (devDeps.length > 0) {
    logInfo(`Installing dev deps: ${devDeps.join(", ")}`);
    const devResult = spawnSync(npmCommand, ["install", "-D", ...devDeps], {
      cwd: process.cwd(),
      stdio: "inherit"
    });

    if (devResult.status !== 0) {
      throw new Error("Failed to install dev dependencies.");
    }
  }
}

function scaffoldTailwindConfig(baseDir) {
  const cwd = process.cwd();
  const contentGlob =
    baseDir === "app"
      ? "./app/**/*.{js,jsx,ts,tsx}"
      : "./src/**/*.{js,jsx,ts,tsx}";

  writeFileIfMissing(
    path.join(cwd, "tailwind.config.js"),
    `/** @type {import('tailwindcss').Config} */
export default {
  content: ["${contentGlob}"],
  theme: {
    extend: {}
  },
  plugins: []
};`
  );

  writeFileIfMissing(
    path.join(cwd, "postcss.config.js"),
    `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {}
  }
};`
  );
}

function scaffoldStructure(baseDir, preset) {
  const cwd = process.cwd();
  const root = path.join(cwd, baseDir);
  const folderList = [
    "assets/images",
    "assets/icons",
    "components/common",
    "components/layout",
    "layouts",
    "pages",
    "services",
    "hooks",
    "context",
    "utils",
    "constants",
    "styles",
    "lib",
    "types"
  ];

  if (preset.router && preset.framework !== "next") {
    folderList.push("routes");
  }

  folderList.forEach((folder) => {
    ensureDir(path.join(root, folder));
  });

  const componentExt = preset.typescript ? "tsx" : "jsx";
  const scriptExt = preset.typescript ? "ts" : "js";

  writeFileIfMissing(
    path.join(root, "components/layout", `Navbar.${componentExt}`),
    getNavbarTemplate(preset)
  );

  writeFileIfMissing(
    path.join(root, "layouts", `MainLayout.${componentExt}`),
    getMainLayoutTemplate({ ...preset, componentExt })
  );

  writeFileIfMissing(
    path.join(root, "pages", `AppRoutes.${componentExt}`),
    getAppRoutesTemplate({ ...preset, componentExt })
  );

  writeFileIfMissing(
    path.join(root, "services", `api.${scriptExt}`),
    getApiTemplate(preset)
  );

  writeFileIfMissing(
    path.join(root, "styles", "globals.css"),
    getGlobalStyleTemplate(preset)
  );

  if (preset.tailwind) {
    scaffoldTailwindConfig(baseDir);
  }
}

function resolvePreset(parsed, detected) {
  const detectedFramework = detected.framework;
  const detectedTs = detected.typescript;
  const detectedTailwind = detected.tailwind;
  const detectedRouter = detected.router;

  const frameworkCandidate =
    parsed.framework ??
    (detectedFramework === "react-router" ? "react" : detectedFramework);

  return {
    framework:
      frameworkCandidate === "unknown" ? "react" : frameworkCandidate,
    typescript: parsed.typescript ?? detectedTs,
    tailwind: parsed.tailwind ?? detectedTailwind,
    router: parsed.router ?? detectedRouter,
    install: parsed.install ?? false
  };
}

export function printHelp() {
  console.log(`zenncode usage

  zenncode init [options]

Options:
  --tailwind         Enable Tailwind-ready starter styles
  --no-tailwind      Disable Tailwind starter styles
  --ts               Use TypeScript starter files
  --no-ts            Use JavaScript starter files
  --router           Add React Router starter setup
  --no-router        Skip React Router starter setup
  --framework <name> Force framework (react | vite | next)
  --install          Install suggested dependencies
  --no-install       Skip dependency installation
  --interactive      Ask setup questions
  -y, --yes          Accept detected defaults
  -h, --help         Show help
`);
}

export async function initProject(rawArgs = []) {
  const { options, hasPresetFlags } = parseInitArgs(rawArgs);

  if (options.help) {
    printHelp();
    return;
  }

  const detectedFramework = detectFramework();
  const detected = {
    framework: detectedFramework,
    typescript: detectTypeScript(),
    tailwind: detectTailwind(),
    router: detectedFramework === "react-router"
  };

  const shouldAsk = options.interactive || (!options.yes && !hasPresetFlags);
  let preset = resolvePreset(options, detected);

  if (shouldAsk) {
    logInfo("Running interactive setup...");
    preset = await collectInteractivePreset(detected);
  } else if (preset.framework === "next" && preset.router) {
    logWarn("Router starter is skipped for Next.js projects.");
    preset.router = false;
  }

  renderPresetSummary(preset);

  const baseDir = resolveBaseDir(preset.framework);
  scaffoldStructure(baseDir, preset);

  if (preset.install) {
    installDependencies(preset);
  } else {
    logInfo("Dependency install skipped. Use --install to auto install.");
  }

  console.log("");
  logCreated(`Zenn structure initialized in ${baseDir}`);
}
