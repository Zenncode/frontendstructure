import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import readline from "node:readline/promises";

const CHECK = "\u2714";
const WARN = "!";

const FRAMEWORKS = [
  {
    id: "react-router",
    label: "React Router",
    aliases: ["router", "reactrouter"]
  },
  {
    id: "expo",
    label: "React Expo",
    aliases: ["react-expo", "react-native", "rn"]
  },
  {
    id: "vue",
    label: "Vue",
    aliases: []
  },
  {
    id: "nuxt",
    label: "Nuxt",
    aliases: ["nuxtjs"]
  },
  {
    id: "next",
    label: "Next.js",
    aliases: ["nextjs"]
  },
  {
    id: "angular",
    label: "Angular",
    aliases: ["ng"]
  },
  {
    id: "react",
    label: "React",
    aliases: ["reactjs"]
  },
  {
    id: "vite",
    label: "Vite",
    aliases: []
  }
];

const INTERACTIVE_FRAMEWORKS = [
  "react-router",
  "expo",
  "vue",
  "nuxt",
  "next",
  "angular",
  "react",
  "vite"
];

const NEXT_CONFIG_FILES = ["next.config.js", "next.config.mjs", "next.config.ts"];
const NUXT_CONFIG_FILES = ["nuxt.config.js", "nuxt.config.mjs", "nuxt.config.ts"];
const VITE_CONFIG_FILES = [
  "vite.config.js",
  "vite.config.mjs",
  "vite.config.ts",
  "vite.config.cjs"
];
const VUE_CONFIG_FILES = ["vue.config.js", "vue.config.cjs"];
const REACT_ROUTER_CONFIG_FILES = [
  "react-router.config.ts",
  "react-router.config.js",
  "react-router.config.mjs"
];
const EXPO_CONFIG_FILES = ["app.config.js", "app.config.ts", "app.config.mjs"];

const FRAMEWORK_ALIAS_MAP = new Map();
FRAMEWORKS.forEach((framework) => {
  FRAMEWORK_ALIAS_MAP.set(framework.id, framework.id);
  FRAMEWORK_ALIAS_MAP.set(framework.id.replace(/-/g, ""), framework.id);

  framework.aliases.forEach((alias) => {
    const normalized = alias.trim().toLowerCase().replace(/[_\s]+/g, "-");
    FRAMEWORK_ALIAS_MAP.set(normalized, framework.id);
    FRAMEWORK_ALIAS_MAP.set(normalized.replace(/-/g, ""), framework.id);
  });
});

function logCreated(message) {
  console.log(`${CHECK} ${message}`);
}

function logInfo(message) {
  console.log(`i ${message}`);
}

function logWarn(message) {
  console.log(`${WARN} ${message}`);
}

function logThankYou() {
  const message = "THANK YOU FOR USING ZENNCODE!";
  const output = process.stdout;
  const columns = Number(output.columns || 0);
  const canColor = output.isTTY && !("NO_COLOR" in process.env) && process.env.FORCE_COLOR !== "0";
  const bold = "\x1b[1m";
  const yellow = "\x1b[33m";
  const reset = "\x1b[0m";

  const centerWithin = (text, width) => {
    if (text.length >= width) {
      return text;
    }

    const totalPadding = width - text.length;
    const leftPadding = Math.floor(totalPadding / 2);
    const rightPadding = totalPadding - leftPadding;
    return `${" ".repeat(leftPadding)}${text}${" ".repeat(rightPadding)}`;
  };

  const wrapMessage = (text, maxWidth) => {
    if (maxWidth <= 0) {
      return [text];
    }

    const words = text.split(" ");
    const lines = [];
    let current = "";

    words.forEach((word) => {
      if (word.length > maxWidth) {
        if (current) {
          lines.push(current);
          current = "";
        }

        for (let i = 0; i < word.length; i += maxWidth) {
          lines.push(word.slice(i, i + maxWidth));
        }
        return;
      }

      if (!current) {
        current = word;
        return;
      }

      const next = `${current} ${word}`;
      if (next.length <= maxWidth) {
        current = next;
      } else {
        lines.push(current);
        current = word;
      }
    });

    if (current) {
      lines.push(current);
    }

    return lines.length > 0 ? lines : [text];
  };

  const printCentered = (line) => {
    const leftPaddingCount = columns > line.length ? Math.floor((columns - line.length) / 2) : 0;
    const leftPadding = " ".repeat(leftPaddingCount);
    const painted = canColor ? `${yellow}${bold}${line}${reset}` : line;
    console.log(`${leftPadding}${painted}`);
  };

  const minInnerWidth = message.length + 2;
  const idealInnerWidth = message.length + 14;
  const maxInnerWidth = columns > 0 ? columns - 4 : idealInnerWidth;

  if (maxInnerWidth < minInnerWidth) {
    const fallbackWidth = columns > 0 ? Math.max(columns - 2, 8) : message.length;
    const fallbackLines = wrapMessage(message, fallbackWidth);
    fallbackLines.forEach((line) => {
      printCentered(line);
    });
    return;
  }

  const innerWidth = Math.min(idealInnerWidth, maxInnerWidth);
  const lines = [
    `+${"-".repeat(innerWidth)}+`,
    `|${" ".repeat(innerWidth)}|`,
    `|${centerWithin(message, innerWidth)}|`,
    `|${" ".repeat(innerWidth)}|`,
    `+${"-".repeat(innerWidth)}+`
  ];

  lines.forEach((line) => {
    printCentered(line);
  });
}

function toPosixPath(value) {
  return value.split(path.sep).join("/");
}

function toImportPathFromRoot(baseDir, targetPathWithoutExt) {
  const relative = baseDir === "."
    ? targetPathWithoutExt
    : `${baseDir}/${targetPathWithoutExt}`;

  return `./${toPosixPath(relative)}`;
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

function readJsonFileSafe(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    return null;
  }
}

function readPackageJsonSafe() {
  const packageJsonPath = path.join(process.cwd(), "package.json");
  const parsed = readJsonFileSafe(packageJsonPath);

  if (fs.existsSync(packageJsonPath) && !parsed) {
    logWarn("Could not parse package.json.");
  }

  return parsed;
}

function getDependencyMap(packageJson) {
  if (!packageJson) {
    return {};
  }

  return {
    ...(packageJson.dependencies ?? {}),
    ...(packageJson.devDependencies ?? {})
  };
}

function hasAnyFile(cwd, relativePaths) {
  return relativePaths.some((file) => fs.existsSync(path.join(cwd, file)));
}

function normalizeFramework(raw) {
  if (!raw) {
    return undefined;
  }

  const normalized = raw.trim().toLowerCase().replace(/[_\s]+/g, "-");
  const compact = normalized.replace(/-/g, "");

  const exact = FRAMEWORK_ALIAS_MAP.get(normalized);
  if (exact) {
    return exact;
  }

  const compactMatch = FRAMEWORK_ALIAS_MAP.get(compact);
  if (compactMatch) {
    return compactMatch;
  }

  const allowed = FRAMEWORKS.map((framework) => framework.id).join(", ");
  throw new Error(`Invalid framework "${raw}". Use one of: ${allowed}.`);
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
      case "--interactive":
        options.interactive = true;
        break;
      case "--yes":
      case "-y":
        options.yes = true;
        break;
      default: {
        if (arg.startsWith("--")) {
          const frameworkId = normalizeFramework(arg.slice(2));
          options.framework = frameworkId;
          hasPresetFlags = true;
          break;
        }

        throw new Error(`Unknown option: ${arg}`);
      }
    }
  }

  return { options, hasPresetFlags };
}

function detectExpoConfig(cwd) {
  if (hasAnyFile(cwd, EXPO_CONFIG_FILES)) {
    return true;
  }

  const appJsonPath = path.join(cwd, "app.json");
  if (!fs.existsSync(appJsonPath)) {
    return false;
  }

  const appJson = readJsonFileSafe(appJsonPath);
  return Boolean(appJson && typeof appJson === "object" && "expo" in appJson);
}

function detectFramework(packageJson) {
  const cwd = process.cwd();
  const deps = getDependencyMap(packageJson);

  if (hasAnyFile(cwd, NUXT_CONFIG_FILES) || "nuxt" in deps) {
    return "nuxt";
  }

  if (hasAnyFile(cwd, NEXT_CONFIG_FILES) || "next" in deps) {
    return "next";
  }

  if (fs.existsSync(path.join(cwd, "angular.json")) || "@angular/core" in deps) {
    return "angular";
  }

  if (detectExpoConfig(cwd) || "expo" in deps || "react-native" in deps) {
    return "expo";
  }

  if (
    hasAnyFile(cwd, REACT_ROUTER_CONFIG_FILES) ||
    "react-router" in deps ||
    "react-router-dom" in deps
  ) {
    return "react-router";
  }

  if (hasAnyFile(cwd, VUE_CONFIG_FILES) || "vue" in deps || "vue-router" in deps) {
    return "vue";
  }

  if (hasAnyFile(cwd, VITE_CONFIG_FILES) || "vite" in deps) {
    if ("vue" in deps || "vue-router" in deps) {
      return "vue";
    }

    if ("react" in deps) {
      return "react";
    }

    return "vite";
  }

  if ("react" in deps) {
    return "react";
  }

  return "unknown";
}

function detectRouterProject(packageJson, framework) {
  const cwd = process.cwd();
  const deps = getDependencyMap(packageJson);

  if (framework === "react-router") {
    return true;
  }

  if (framework === "react" || framework === "vite") {
    return (
      hasAnyFile(cwd, REACT_ROUTER_CONFIG_FILES) ||
      "react-router" in deps ||
      "react-router-dom" in deps
    );
  }

  if (framework === "vue") {
    return (
      "vue-router" in deps ||
      fs.existsSync(path.join(cwd, "router")) ||
      fs.existsSync(path.join(cwd, "src", "router"))
    );
  }

  return false;
}

function detectRouterImportSource(packageJson, framework) {
  const deps = getDependencyMap(packageJson);

  if (framework === "react-router") {
    return "react-router";
  }

  if (framework === "vue") {
    return "vue-router";
  }

  if (framework === "react" || framework === "vite") {
    if ("react-router-dom" in deps) {
      return "react-router-dom";
    }

    if ("react-router" in deps) {
      return "react-router";
    }

    return "react-router-dom";
  }

  return undefined;
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
  const srcAppDir = path.join(cwd, "src", "app");

  switch (framework) {
    case "nuxt":
      return ".";
    case "next":
      if (fs.existsSync(appDir)) {
        return "app";
      }
      if (fs.existsSync(srcDir)) {
        return "src";
      }
      ensureDir(appDir);
      return "app";
    case "angular":
      if (fs.existsSync(srcAppDir)) {
        return path.join("src", "app");
      }
      if (fs.existsSync(appDir)) {
        return "app";
      }
      ensureDir(srcDir);
      ensureDir(srcAppDir);
      return path.join("src", "app");
    case "react-router":
      if (fs.existsSync(appDir)) {
        return "app";
      }
      if (fs.existsSync(srcDir)) {
        return "src";
      }
      ensureDir(appDir);
      return "app";
    case "expo":
      if (fs.existsSync(srcDir)) {
        return "src";
      }
      if (fs.existsSync(appDir)) {
        return "app";
      }
      ensureDir(srcDir);
      return "src";
    default:
      if (fs.existsSync(srcDir)) {
        return "src";
      }
      if (fs.existsSync(appDir)) {
        return "app";
      }
      ensureDir(srcDir);
      return "src";
  }
}

function frameworkLabel(framework) {
  const entry = FRAMEWORKS.find((item) => item.id === framework);
  return entry ? entry.label : "Unknown";
}

function supportsRouterOption(framework) {
  return framework === "react" || framework === "vite" || framework === "vue";
}

function supportsTailwind(framework) {
  return framework !== "expo";
}

function requiresTypeScript(framework) {
  return framework === "angular";
}

function getReactNavbarTemplate({ tailwind, typescript }) {
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

function getReactMainLayoutTemplate({ tailwind, typescript }) {
  const wrapperClass = tailwind
    ? "min-h-screen bg-slate-50 text-slate-900"
    : "main-layout";
  const mainClass = tailwind ? "mx-auto max-w-6xl p-6" : "main-content";

  if (typescript) {
    return `import type { ReactNode } from "react";
import Navbar from "../components/layout/Navbar";

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

  return `import Navbar from "../components/layout/Navbar";

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

function getReactAppRoutesTemplate({ framework, router, typescript, routerImport }) {
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

  const useRouter = framework === "react-router" || router;

  if (useRouter) {
    const routerPackage =
      framework === "react-router"
        ? "react-router"
        : routerImport || "react-router-dom";

    if (typescript) {
      return `import { BrowserRouter, Route, Routes } from "${routerPackage}";
import MainLayout from "../layouts/MainLayout";

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

    return `import { BrowserRouter, Route, Routes } from "${routerPackage}";
import MainLayout from "../layouts/MainLayout";

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
    return `import MainLayout from "../layouts/MainLayout";

const AppRoutes = (): JSX.Element => {
  return (
    <MainLayout>
      <h2>Home page</h2>
    </MainLayout>
  );
};

export default AppRoutes;`;
  }

  return `import MainLayout from "../layouts/MainLayout";

const AppRoutes = () => {
  return (
    <MainLayout>
      <h2>Home page</h2>
    </MainLayout>
  );
};

export default AppRoutes;`;
}

function getExpoNavbarTemplate({ typescript }) {
  if (typescript) {
    return `import { Text, View } from "react-native";

const Navbar = (): JSX.Element => {
  return (
    <View
      style={{
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: "#0f172a"
      }}
    >
      <Text style={{ color: "#ffffff", fontWeight: "700", fontSize: 18 }}>
        ZennCode
      </Text>
    </View>
  );
};

export default Navbar;`;
  }

  return `import { Text, View } from "react-native";

const Navbar = () => {
  return (
    <View
      style={{
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: "#0f172a"
      }}
    >
      <Text style={{ color: "#ffffff", fontWeight: "700", fontSize: 18 }}>
        ZennCode
      </Text>
    </View>
  );
};

export default Navbar;`;
}

function getExpoHomeScreenTemplate({ typescript }) {
  if (typescript) {
    return `import { SafeAreaView, Text, View } from "react-native";
import Navbar from "../components/layout/Navbar";
import { theme } from "../styles/theme";

const HomeScreen = (): JSX.Element => {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Navbar />
      <View style={{ padding: 20 }}>
        <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: "600" }}>
          Home screen
        </Text>
      </View>
    </SafeAreaView>
  );
};

export default HomeScreen;`;
  }

  return `import { SafeAreaView, Text, View } from "react-native";
import Navbar from "../components/layout/Navbar";
import { theme } from "../styles/theme";

const HomeScreen = () => {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Navbar />
      <View style={{ padding: 20 }}>
        <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: "600" }}>
          Home screen
        </Text>
      </View>
    </SafeAreaView>
  );
};

export default HomeScreen;`;
}

function getExpoThemeTemplate({ typescript }) {
  if (typescript) {
    return `export const theme = {
  colors: {
    background: "#f8fafc",
    text: "#0f172a"
  }
} as const;`;
  }

  return `export const theme = {
  colors: {
    background: "#f8fafc",
    text: "#0f172a"
  }
};`;
}

function getExpoAppTemplate({ typescript, baseDir }) {
  const importPath = toImportPathFromRoot(baseDir, "screens/HomeScreen");

  if (typescript) {
    return `import HomeScreen from "${importPath}";

const App = (): JSX.Element => {
  return <HomeScreen />;
};

export default App;`;
  }

  return `import HomeScreen from "${importPath}";

const App = () => {
  return <HomeScreen />;
};

export default App;`;
}

function getVueNavbarTemplate({ tailwind }) {
  const navClass = tailwind
    ? "flex items-center justify-between rounded-lg bg-slate-900 px-4 py-3 text-white"
    : "navbar";

  return `<template>
  <nav class="${navClass}">
    <h1>ZennCode</h1>
  </nav>
</template>`;
}

function getVueMainLayoutTemplate({ tailwind }) {
  const wrapperClass = tailwind
    ? "min-h-screen bg-slate-50 text-slate-900"
    : "main-layout";
  const mainClass = tailwind ? "mx-auto max-w-6xl p-6" : "main-content";

  return `<template>
  <div class="${wrapperClass}">
    <Navbar />
    <main class="${mainClass}">
      <slot />
    </main>
  </div>
</template>

<script setup>
import Navbar from "../components/layout/Navbar.vue";
</script>`;
}

function getVuePageTemplate() {
  return `<template>
  <MainLayout>
    <h2>Home page</h2>
  </MainLayout>
</template>

<script setup>
import MainLayout from "../layouts/MainLayout.vue";
</script>`;
}

function getVueRouterTemplate({ typescript }) {
  const typeImport = typescript ? ", type RouteRecordRaw" : "";
  const routeType = typescript ? ": RouteRecordRaw[]" : "";

  return `import { createRouter, createWebHistory${typeImport} } from "vue-router";
import AppRoutes from "../pages/AppRoutes.vue";

const routes${routeType} = [{ path: "/", component: AppRoutes }];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;`;
}

function getNuxtDefaultLayoutTemplate() {
  return `<template>
  <div>
    <Navbar />
    <main>
      <slot />
    </main>
  </div>
</template>

<script setup>
import Navbar from "../components/layout/Navbar.vue";
</script>`;
}

function getNuxtIndexPageTemplate() {
  return `<template>
  <section>
    <h2>Home page</h2>
  </section>
</template>`;
}

function getAngularNavbarTemplate() {
  return `import { Component } from "@angular/core";

@Component({
  selector: "app-navbar",
  standalone: true,
  template: \`
    <nav class="navbar">
      <h1>ZennCode</h1>
    </nav>
  \`
})
export class NavbarComponent {}
`;
}

function getAngularMainLayoutTemplate() {
  return `import { Component } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { NavbarComponent } from "../components/layout/navbar.component";

@Component({
  selector: "app-main-layout",
  standalone: true,
  imports: [NavbarComponent, RouterOutlet],
  template: \`
    <div class="main-layout">
      <app-navbar />
      <main class="main-content">
        <router-outlet />
      </main>
    </div>
  \`
})
export class MainLayoutComponent {}
`;
}

function getAngularHomePageTemplate() {
  return `import { Component } from "@angular/core";

@Component({
  selector: "app-home-page",
  standalone: true,
  template: \`
    <section>
      <h2>Home page</h2>
    </section>
  \`
})
export class HomePageComponent {}
`;
}

function getAngularRoutesTemplate() {
  return `import { Routes } from "@angular/router";
import { HomePageComponent } from "./pages/home.component";

export const routes: Routes = [{ path: "", component: HomePageComponent }];
`;
}

function getAngularApiServiceTemplate() {
  return `import { Injectable } from "@angular/core";
import axios, { type AxiosInstance } from "axios";

@Injectable({ providedIn: "root" })
export class ApiService {
  private readonly api: AxiosInstance = axios.create({
    baseURL: "/api"
  });

  get client(): AxiosInstance {
    return this.api;
  }
}
`;
}

function getAxiosApiTemplate({ typescript }) {
  const typeLine = typescript
    ? "import type { AxiosInstance } from \"axios\";\n"
    : "";
  const declaration = typescript
    ? "const api: AxiosInstance = axios.create({"
    : "const api = axios.create({";

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
@tailwind utilities;`;
  }

  return `:root {
  font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
}`;
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

async function askFrameworkFallback(rl, options, defaultFramework) {
  console.log("Choose framework:");
  options.forEach((framework, index) => {
    const isDefault = framework === defaultFramework;
    console.log(
      `${index + 1}. ${frameworkLabel(framework)}${isDefault ? " (default)" : ""}`
    );
  });

  const answer = (await rl.question(`Framework [1-${options.length}]: `)).trim();

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

function createRadioLine(framework, isSelected, isDefault) {
  const label = `${frameworkLabel(framework)}${isDefault ? " (default)" : ""}`;
  const marker = isSelected ? "[x]" : "[ ]";
  const prefix = isSelected ? ">" : " ";
  const canColor =
    process.stdout.isTTY &&
    !("NO_COLOR" in process.env) &&
    process.env.FORCE_COLOR !== "0";

  if (!canColor) {
    return `${prefix} ${marker} ${label}`;
  }

  const reset = "\x1b[0m";
  const green = "\x1b[32m";
  const bold = "\x1b[1m";
  const dim = "\x1b[2m";

  if (isSelected) {
    return `${green}${bold}${prefix} ${marker} ${label}${reset}`;
  }

  return `${dim}${prefix} ${marker} ${label}${reset}`;
}

async function askFramework(rl, detectedFramework) {
  const options = INTERACTIVE_FRAMEWORKS;
  const defaultFramework = options.includes(detectedFramework)
    ? detectedFramework
    : "react-router";
  const defaultIndex = options.indexOf(defaultFramework);

  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    return askFrameworkFallback(rl, options, defaultFramework);
  }

  const input = process.stdin;
  const output = process.stdout;
  const previousRawMode =
    typeof input.isRaw === "boolean" ? input.isRaw : false;
  const canControlCursor =
    output.isTTY &&
    !("NO_COLOR" in process.env) &&
    process.env.FORCE_COLOR !== "0";
  let selectedIndex = defaultIndex >= 0 ? defaultIndex : 0;
  let renderedOnce = false;

  output.write("Choose framework (green means selected, use arrow keys then Enter):\n");
  if (canControlCursor) {
    output.write("\x1b[?25l");
  }

  const render = () => {
    if (renderedOnce) {
      output.write(`\x1b[${options.length}A`);
    }

    options.forEach((framework, index) => {
      const isSelected = index === selectedIndex;
      const isDefault = framework === defaultFramework;
      const line = createRadioLine(framework, isSelected, isDefault);
      output.write(`\x1b[2K\r${line}\n`);
    });

    renderedOnce = true;
  };

  if (typeof input.setRawMode === "function") {
    input.setRawMode(true);
  }
  input.resume();
  render();

  const selectedFramework = await new Promise((resolve) => {
    const onData = (chunk) => {
      const key = chunk.toString("utf8");

      if (key === "\u0003") {
        if (typeof input.setRawMode === "function") {
          input.setRawMode(previousRawMode);
        }
        if (canControlCursor) {
          output.write("\x1b[?25h");
        }
        output.write("\n");
        process.exit(1);
      }

      if (key === "\r" || key === "\n") {
        input.off("data", onData);
        resolve(options[selectedIndex]);
        return;
      }

      if (key === "\u001b[A" || key.toLowerCase() === "k") {
        selectedIndex = (selectedIndex - 1 + options.length) % options.length;
        render();
        return;
      }

      if (key === "\u001b[B" || key.toLowerCase() === "j") {
        selectedIndex = (selectedIndex + 1) % options.length;
        render();
      }
    };

    input.on("data", onData);
  });

  if (typeof input.setRawMode === "function") {
    input.setRawMode(previousRawMode);
  }
  if (canControlCursor) {
    output.write("\x1b[?25h");
  }
  output.write("\n");

  return selectedFramework;
}

async function collectInteractivePreset(detected) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  try {
    const framework = await askFramework(rl, detected.framework);

    let typescript = detected.typescript;
    if (requiresTypeScript(framework)) {
      typescript = true;
      logInfo("Angular template uses TypeScript by default.");
    } else {
      typescript = await askYesNo(rl, "Use TypeScript?", detected.typescript);
    }

    let tailwind = false;
    if (supportsTailwind(framework)) {
      tailwind = await askYesNo(rl, "Use Tailwind?", detected.tailwind);
    }

    let router = false;
    if (supportsRouterOption(framework)) {
      const routerDefault = detected.router;
      router = await askYesNo(rl, "Add router starter?", routerDefault);
    }

    const install = await askYesNo(rl, "Install dependencies now?", false);

    return { framework, typescript, tailwind, router, install };
  } finally {
    rl.close();
  }
}

function isNpmOfflineMode() {
  const npmOffline = String(process.env.npm_config_offline || "").toLowerCase();
  const npmOfflineUpper = String(
    process.env.NPM_CONFIG_OFFLINE || ""
  ).toLowerCase();

  return npmOffline === "true" || npmOfflineUpper === "true";
}

function detectPackageManager() {
  const cwd = process.cwd();
  const isWindows = process.platform === "win32";
  const cmd = (name) => (isWindows ? `${name}.cmd` : name);

  if (fs.existsSync(path.join(cwd, "pnpm-lock.yaml"))) {
    return {
      name: "pnpm",
      command: cmd("pnpm"),
      installArgs: ["add"],
      installDevArgs: ["add", "-D"]
    };
  }

  if (fs.existsSync(path.join(cwd, "yarn.lock"))) {
    return {
      name: "yarn",
      command: cmd("yarn"),
      installArgs: ["add"],
      installDevArgs: ["add", "-D"]
    };
  }

  if (
    fs.existsSync(path.join(cwd, "bun.lockb")) ||
    fs.existsSync(path.join(cwd, "bun.lock"))
  ) {
    return {
      name: "bun",
      command: cmd("bun"),
      installArgs: ["add"],
      installDevArgs: ["add", "-d"]
    };
  }

  return {
    name: "npm",
    command: cmd("npm"),
    installArgs: ["install"],
    installDevArgs: ["install", "-D"]
  };
}

function printManualInstallCommands(packageManager, runtimeDeps, devDeps) {
  if (runtimeDeps.length === 0 && devDeps.length === 0) {
    return;
  }

  const runtime = runtimeDeps.join(" ");
  const dev = devDeps.join(" ");

  logInfo("Install manually with:");

  if (packageManager === "pnpm") {
    if (runtime) {
      console.log(`  pnpm add ${runtime}`);
    }
    if (dev) {
      console.log(`  pnpm add -D ${dev}`);
    }
    return;
  }

  if (packageManager === "yarn") {
    if (runtime) {
      console.log(`  yarn add ${runtime}`);
    }
    if (dev) {
      console.log(`  yarn add -D ${dev}`);
    }
    return;
  }

  if (packageManager === "bun") {
    if (runtime) {
      console.log(`  bun add ${runtime}`);
    }
    if (dev) {
      console.log(`  bun add -d ${dev}`);
    }
    return;
  }

  if (runtime) {
    console.log(`  npm install ${runtime}`);
  }
  if (dev) {
    console.log(`  npm install -D ${dev}`);
  }
}

function installDependencies(preset) {
  const packageJson = readPackageJsonSafe();
  const existingDeps = getDependencyMap(packageJson);
  const runtimeDeps = [];
  const devDeps = [];

  if (!("axios" in existingDeps)) {
    runtimeDeps.push("axios");
  }

  if (preset.framework === "react-router") {
    if (!("react-router" in existingDeps)) {
      runtimeDeps.push("react-router");
    }
  } else if (preset.router && (preset.framework === "react" || preset.framework === "vite")) {
    const routerPackage = preset.routerImport || "react-router-dom";
    if (!(routerPackage in existingDeps)) {
      runtimeDeps.push(routerPackage);
    }
  } else if (preset.router && preset.framework === "vue") {
    if (!("vue-router" in existingDeps)) {
      runtimeDeps.push("vue-router");
    }
  }

  if (preset.tailwind) {
    if (!("tailwindcss" in existingDeps)) {
      devDeps.push("tailwindcss");
    }
    if (!("postcss" in existingDeps)) {
      devDeps.push("postcss");
    }
    if (!("autoprefixer" in existingDeps)) {
      devDeps.push("autoprefixer");
    }
  }

  if (runtimeDeps.length === 0 && devDeps.length === 0) {
    logInfo("All suggested dependencies are already installed.");
    return true;
  }

  const packageManager = detectPackageManager();
  if (isNpmOfflineMode()) {
    logWarn("Offline mode detected. Skipping automatic dependency install.");
    printManualInstallCommands(packageManager.name, runtimeDeps, devDeps);
    return false;
  }

  let allGood = true;

  if (runtimeDeps.length > 0) {
    logInfo(`Installing runtime deps: ${runtimeDeps.join(", ")}`);
    const runtimeResult = spawnSync(
      packageManager.command,
      [...packageManager.installArgs, ...runtimeDeps],
      { cwd: process.cwd(), stdio: "inherit" }
    );

    if (runtimeResult.error || runtimeResult.status !== 0) {
      allGood = false;
    }
  }

  if (devDeps.length > 0) {
    logInfo(`Installing dev deps: ${devDeps.join(", ")}`);
    const devResult = spawnSync(
      packageManager.command,
      [...packageManager.installDevArgs, ...devDeps],
      { cwd: process.cwd(), stdio: "inherit" }
    );

    if (devResult.error || devResult.status !== 0) {
      allGood = false;
    }
  }

  if (!allGood) {
    logWarn("Automatic dependency install failed.");
    printManualInstallCommands(packageManager.name, runtimeDeps, devDeps);
    return false;
  }

  return true;
}

function ensureFolders(root, folders) {
  folders.forEach((folder) => {
    ensureDir(path.join(root, folder));
  });
}

function getScriptExtForPreset(preset) {
  if (preset.framework === "angular") {
    return "ts";
  }

  return preset.typescript ? "ts" : "js";
}

function getComponentExtForPreset(preset) {
  if (preset.framework === "angular") {
    return "component.ts";
  }

  if (preset.framework === "vue" || preset.framework === "nuxt") {
    return "vue";
  }

  return preset.typescript ? "tsx" : "jsx";
}

function getFolderSampleFiles(folderPath, preset) {
  const scriptExt = getScriptExtForPreset(preset);
  const componentExt = getComponentExtForPreset(preset);

  switch (folderPath) {
    case "assets":
      return ["images/hero-banner.png", "icons/menu.svg"];
    case "assets/images":
      return ["hero-banner.png"];
    case "assets/icons":
      return ["menu.svg"];
    case "components":
      if (preset.framework === "angular") {
        return ["ui/button.component.ts", "layout/navbar.component.ts"];
      }
      return [`ui/button.${componentExt}`, `layout/Navbar.${componentExt}`];
    case "components/ui":
      return [`button.${componentExt}`];
    case "components/common":
      return [`EmptyState.${componentExt}`];
    case "components/layout":
      if (preset.framework === "angular") {
        return ["navbar.component.ts"];
      }
      return [`Navbar.${componentExt}`];
    case "layouts":
      if (preset.framework === "nuxt") {
        return ["default.vue"];
      }
      if (preset.framework === "angular") {
        return ["main-layout.component.ts"];
      }
      return [`MainLayout.${componentExt}`];
    case "pages":
      if (preset.framework === "nuxt") {
        return ["index.vue"];
      }
      if (preset.framework === "angular") {
        return ["home.component.ts"];
      }
      if (preset.framework === "vue") {
        return ["AppRoutes.vue"];
      }
      return [`AppRoutes.${componentExt}`];
    case "screens":
      return [`HomeScreen.${componentExt}`];
    case "services":
      if (preset.framework === "angular") {
        return ["api.service.ts"];
      }
      return [`api.${scriptExt}`];
    case "hooks":
      return [`useAuth.${scriptExt}`];
    case "context":
      return [`AuthContext.${componentExt}`];
    case "utils":
      return [`formatDate.${scriptExt}`];
    case "constants":
      return [`app.${scriptExt}`];
    case "styles":
      if (preset.framework === "angular") {
        return ["styles.scss"];
      }
      if (preset.framework === "expo") {
        return [`theme.${scriptExt}`];
      }
      return ["globals.css"];
    case "lib":
      return [`httpClient.${scriptExt}`];
    case "types":
      return ["index.d.ts"];
    case "routes":
      return [`index.${scriptExt}`];
    case "router":
      return [`index.${scriptExt}`];
    case "composables":
      return [`useTheme.${scriptExt}`];
    case "stores":
      return [`appStore.${scriptExt}`];
    case "models":
      return ["user.model.ts"];
    default:
      return [`index.${scriptExt}`];
  }
}

function getFolderDescription(folderPath, preset) {
  switch (folderPath) {
    case "assets":
      return "Static files used by the UI, such as images and icons.";
    case "assets/images":
      return "Image assets for screens, cards, banners, and other visuals.";
    case "assets/icons":
      return "Icon files used in navigation, buttons, and status indicators.";
    case "components":
      return "Reusable UI building blocks shared across multiple pages/screens.";
    case "components/ui":
      return "Low-level design system components such as buttons and inputs.";
    case "components/common":
      return "Shared feature-agnostic components used in many places.";
    case "components/layout":
      return "Structural components that define app chrome, headers, and shells.";
    case "layouts":
      if (preset.framework === "nuxt") {
        return "Nuxt layout wrappers that define shared page structure.";
      }
      return "Page layout wrappers that organize global UI structure.";
    case "pages":
      if (preset.framework === "angular") {
        return "Top-level page components used by the Angular router.";
      }
      if (preset.framework === "nuxt") {
        return "File-based Nuxt route pages.";
      }
      return "Top-level view pages connected to routing.";
    case "screens":
      return "React Native screen components for the Expo app.";
    case "services":
      return "Data and API access layer for backend communication.";
    case "hooks":
      return "Custom React hooks for reusable stateful behavior.";
    case "context":
      return "React context providers and shared app state containers.";
    case "utils":
      return "Pure helper functions and reusable utility logic.";
    case "constants":
      return "Shared constant values, enums, and app-level configuration tokens.";
    case "styles":
      return "Global styling files and theme definitions.";
    case "lib":
      return "Internal infrastructure helpers and low-level integrations.";
    case "types":
      return "Type definitions and shared interfaces.";
    case "routes":
      return "Route declarations and route-level composition helpers.";
    case "router":
      return "Router setup and navigation rules.";
    case "composables":
      return "Vue composables for reusable state and logic.";
    case "stores":
      return "State store modules for centralized app state.";
    case "models":
      return "Domain models and typed data contracts.";
    default:
      return "Folder for related project modules.";
  }
}

function expandFoldersWithParents(folders) {
  const seen = new Set();
  const expanded = [];

  folders.forEach((folder) => {
    const normalized = toPosixPath(folder).replace(/^\.\/+/, "").replace(/\/+$/, "");
    if (!normalized) {
      return;
    }

    const parts = normalized.split("/").filter(Boolean);
    let current = "";

    parts.forEach((part) => {
      current = current ? `${current}/${part}` : part;
      if (!seen.has(current)) {
        seen.add(current);
        expanded.push(current);
      }
    });
  });

  return expanded;
}

function buildZennCodeDocContent(baseDir, folders, preset) {
  const normalizedBaseDir = toPosixPath(baseDir).replace(/^\.\/+/, "").replace(/\/+$/, "");
  const resolvedBaseDir = normalizedBaseDir && normalizedBaseDir !== "."
    ? normalizedBaseDir
    : ".";
  const foldersWithParents = expandFoldersWithParents(folders);

  const sections = foldersWithParents.map((folderPath) => {
    const fullFolderPath = resolvedBaseDir === "." ? folderPath : `${resolvedBaseDir}/${folderPath}`;
    const description = getFolderDescription(folderPath, preset);
    const samples = getFolderSampleFiles(folderPath, preset);
    const sampleLines = samples.map((sample) => `- \`${sample}\``).join("\n");

    return `## \`${fullFolderPath}\`
Description: ${description}
Sample files:
${sampleLines}`;
  });

  return `# ZennCode Folder Guide

Framework: ${frameworkLabel(preset.framework)}
Base directory: \`${resolvedBaseDir}\`

This file explains each generated folder and gives sample starter files.

${sections.join("\n\n")}`;
}

function scaffoldZennCodeDoc(baseDir, folders, preset) {
  writeFileIfMissing(
    path.join(process.cwd(), "zenncode.md"),
    buildZennCodeDocContent(baseDir, folders, preset)
  );
}

function scaffoldReactFamily(root, preset) {
  const folders = [
    "assets/images",
    "assets/icons",
    "components/common",
    "components/ui",
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

  if (preset.router || preset.framework === "react-router") {
    folders.push("routes");
  }

  ensureFolders(root, folders);

  const componentExt = preset.typescript ? "tsx" : "jsx";
  const scriptExt = preset.typescript ? "ts" : "js";

  writeFileIfMissing(
    path.join(root, "components/layout", `Navbar.${componentExt}`),
    getReactNavbarTemplate(preset)
  );

  writeFileIfMissing(
    path.join(root, "layouts", `MainLayout.${componentExt}`),
    getReactMainLayoutTemplate(preset)
  );

  writeFileIfMissing(
    path.join(root, "pages", `AppRoutes.${componentExt}`),
    getReactAppRoutesTemplate(preset)
  );

  writeFileIfMissing(
    path.join(root, "services", `api.${scriptExt}`),
    getAxiosApiTemplate(preset)
  );

  writeFileIfMissing(
    path.join(root, "styles", "globals.css"),
    getGlobalStyleTemplate(preset)
  );

  return folders;
}

function scaffoldExpo(root, preset, baseDir) {
  const folders = [
    "assets/images",
    "assets/icons",
    "components/common",
    "components/ui",
    "components/layout",
    "screens",
    "services",
    "hooks",
    "context",
    "utils",
    "constants",
    "styles"
  ];
  ensureFolders(root, folders);

  const componentExt = preset.typescript ? "tsx" : "jsx";
  const scriptExt = preset.typescript ? "ts" : "js";

  writeFileIfMissing(
    path.join(root, "components/layout", `Navbar.${componentExt}`),
    getExpoNavbarTemplate(preset)
  );

  writeFileIfMissing(
    path.join(root, "screens", `HomeScreen.${componentExt}`),
    getExpoHomeScreenTemplate(preset)
  );

  writeFileIfMissing(
    path.join(root, "services", `api.${scriptExt}`),
    getAxiosApiTemplate(preset)
  );

  writeFileIfMissing(
    path.join(root, "styles", `theme.${scriptExt}`),
    getExpoThemeTemplate(preset)
  );

  const appFile = path.join(process.cwd(), `App.${componentExt}`);
  writeFileIfMissing(appFile, getExpoAppTemplate({ ...preset, baseDir }));

  return folders;
}

function scaffoldVue(root, preset) {
  const folders = [
    "assets/images",
    "assets/icons",
    "components/common",
    "components/ui",
    "components/layout",
    "layouts",
    "pages",
    "services",
    "composables",
    "stores",
    "utils",
    "constants",
    "styles",
    "types"
  ];

  if (preset.router) {
    folders.push("router");
  }

  ensureFolders(root, folders);

  const scriptExt = preset.typescript ? "ts" : "js";

  writeFileIfMissing(
    path.join(root, "components/layout", "Navbar.vue"),
    getVueNavbarTemplate(preset)
  );

  writeFileIfMissing(
    path.join(root, "layouts", "MainLayout.vue"),
    getVueMainLayoutTemplate(preset)
  );

  writeFileIfMissing(
    path.join(root, "pages", "AppRoutes.vue"),
    getVuePageTemplate()
  );

  if (preset.router) {
    writeFileIfMissing(
      path.join(root, "router", `index.${scriptExt}`),
      getVueRouterTemplate(preset)
    );
  }

  writeFileIfMissing(
    path.join(root, "services", `api.${scriptExt}`),
    getAxiosApiTemplate(preset)
  );

  writeFileIfMissing(
    path.join(root, "styles", "globals.css"),
    getGlobalStyleTemplate(preset)
  );

  return folders;
}

function scaffoldNuxt(root, preset) {
  const folders = [
    "assets/images",
    "assets/icons",
    "components/common",
    "components/ui",
    "components/layout",
    "layouts",
    "pages",
    "services",
    "composables",
    "utils",
    "constants",
    "styles",
    "types"
  ];
  ensureFolders(root, folders);

  const scriptExt = preset.typescript ? "ts" : "js";

  writeFileIfMissing(
    path.join(root, "components/layout", "Navbar.vue"),
    getVueNavbarTemplate(preset)
  );

  writeFileIfMissing(
    path.join(root, "layouts", "default.vue"),
    getNuxtDefaultLayoutTemplate()
  );

  writeFileIfMissing(
    path.join(root, "pages", "index.vue"),
    getNuxtIndexPageTemplate()
  );

  writeFileIfMissing(
    path.join(root, "services", `api.${scriptExt}`),
    getAxiosApiTemplate(preset)
  );

  writeFileIfMissing(
    path.join(root, "styles", "globals.css"),
    getGlobalStyleTemplate(preset)
  );

  return folders;
}

function scaffoldAngular(root, preset) {
  const folders = [
    "components/ui",
    "components/layout",
    "layouts",
    "pages",
    "services",
    "models",
    "utils",
    "constants",
    "styles"
  ];
  ensureFolders(root, folders);

  writeFileIfMissing(
    path.join(root, "components/layout", "navbar.component.ts"),
    getAngularNavbarTemplate()
  );

  writeFileIfMissing(
    path.join(root, "layouts", "main-layout.component.ts"),
    getAngularMainLayoutTemplate()
  );

  writeFileIfMissing(
    path.join(root, "pages", "home.component.ts"),
    getAngularHomePageTemplate()
  );

  writeFileIfMissing(
    path.join(root, "services", "api.service.ts"),
    getAngularApiServiceTemplate()
  );

  writeFileIfMissing(path.join(root, "app.routes.ts"), getAngularRoutesTemplate());

  writeFileIfMissing(
    path.join(root, "styles", "styles.scss"),
    `:host {
  display: block;
}`
  );

  return folders;
}

function getTailwindContentGlobs(baseDir, framework) {
  const basePath = baseDir === "." ? "." : `./${toPosixPath(baseDir)}`;

  if (framework === "nuxt") {
    return [
      "./components/**/*.{vue,js,ts}",
      "./layouts/**/*.vue",
      "./pages/**/*.vue",
      "./app.vue",
      "./composables/**/*.{js,ts}",
      "./plugins/**/*.{js,ts}"
    ];
  }

  if (framework === "angular") {
    return ["./src/**/*.{html,ts}"];
  }

  if (framework === "vue") {
    return [`${basePath}/**/*.{vue,js,ts,jsx,tsx}`];
  }

  return [`${basePath}/**/*.{js,jsx,ts,tsx}`];
}

function scaffoldTailwindConfig(baseDir, framework) {
  const cwd = process.cwd();
  const contentGlobs = getTailwindContentGlobs(baseDir, framework);

  writeFileIfMissing(
    path.join(cwd, "tailwind.config.js"),
    `/** @type {import('tailwindcss').Config} */
export default {
  content: ${JSON.stringify(contentGlobs)},
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
  const root = path.join(process.cwd(), baseDir);
  let folders = [];

  if (preset.framework === "vue") {
    folders = scaffoldVue(root, preset);
  } else if (preset.framework === "nuxt") {
    folders = scaffoldNuxt(root, preset);
  } else if (preset.framework === "angular") {
    folders = scaffoldAngular(root, preset);
  } else if (preset.framework === "expo") {
    folders = scaffoldExpo(root, preset, baseDir);
  } else {
    folders = scaffoldReactFamily(root, preset);
  }

  if (preset.tailwind) {
    scaffoldTailwindConfig(baseDir, preset.framework);
  }

  scaffoldZennCodeDoc(baseDir, folders, preset);
}

function resolvePreset(parsed, detected) {
  const frameworkCandidate =
    parsed.framework ??
    (detected.framework === "unknown" ? "react-router" : detected.framework);

  return {
    framework: frameworkCandidate,
    typescript: parsed.typescript ?? detected.typescript,
    tailwind: parsed.tailwind ?? detected.tailwind,
    router: parsed.router ?? detected.router,
    routerImport: detected.routerImport,
    install: parsed.install ?? false
  };
}

function finalizePreset(preset) {
  const nextPreset = { ...preset };

  if (requiresTypeScript(nextPreset.framework) && !nextPreset.typescript) {
    logWarn("Angular template is TypeScript-first. Enabling TypeScript.");
    nextPreset.typescript = true;
  }

  if (!supportsTailwind(nextPreset.framework) && nextPreset.tailwind) {
    logWarn(
      `Tailwind starter is skipped for ${frameworkLabel(nextPreset.framework)} templates.`
    );
    nextPreset.tailwind = false;
  }

  if (nextPreset.framework === "react-router") {
    nextPreset.router = true;
    nextPreset.routerImport = "react-router";
  } else if (!supportsRouterOption(nextPreset.framework) && nextPreset.router) {
    logWarn(
      `Router starter is skipped for ${frameworkLabel(nextPreset.framework)} templates.`
    );
    nextPreset.router = false;
  }

  if (nextPreset.framework === "vue") {
    nextPreset.routerImport = "vue-router";
  } else if (nextPreset.framework === "react" || nextPreset.framework === "vite") {
    nextPreset.routerImport = nextPreset.routerImport || "react-router-dom";
  }

  return nextPreset;
}

export function printHelp() {
  console.log(`zenncode usage

  zenncode init [options]

Options:
  --framework <name>  Select template
                      (react-router | expo | vue | nuxt | next | angular | react | vite)
  --react-router      Shortcut for --framework react-router
  --expo              Shortcut for --framework expo
  --vue               Shortcut for --framework vue
  --nuxt              Shortcut for --framework nuxt
  --next              Shortcut for --framework next
  --angular           Shortcut for --framework angular
  --react             Shortcut for --framework react
  --vite              Shortcut for --framework vite
  --tailwind          Enable Tailwind-ready starter styles
  --no-tailwind       Disable Tailwind starter styles
  --ts                Use TypeScript starter files
  --no-ts             Use JavaScript starter files
  --router            Add router starter (React/Vite/Vue only)
  --no-router         Skip router starter
  --install           Install suggested dependencies
  --no-install        Skip dependency installation
  --interactive       Ask setup questions
  -y, --yes           Accept detected defaults
  -h, --help          Show help
`);
}

export async function initProject(rawArgs = []) {
  const { options, hasPresetFlags } = parseInitArgs(rawArgs);

  if (options.help) {
    printHelp();
    return;
  }

  const packageJson = readPackageJsonSafe();
  const detectedFramework = detectFramework(packageJson);
  const detected = {
    framework: detectedFramework,
    typescript: detectTypeScript(),
    tailwind: detectTailwind(),
    router: detectRouterProject(packageJson, detectedFramework),
    routerImport: detectRouterImportSource(packageJson, detectedFramework)
  };

  const shouldAsk = options.interactive || (!options.yes && !hasPresetFlags);
  let preset = resolvePreset(options, detected);

  if (shouldAsk) {
    logInfo("Running interactive setup...");
    const interactivePreset = await collectInteractivePreset(detected);
    preset = { ...preset, ...interactivePreset };
  }

  preset = finalizePreset(preset);

  renderPresetSummary(preset);

  const baseDir = resolveBaseDir(preset.framework);
  scaffoldStructure(baseDir, preset);

  if (preset.install) {
    const installed = installDependencies(preset);
    if (!installed) {
      logWarn("Scaffold completed, but dependency install needs attention.");
      logThankYou();
    } else {
      logThankYou();
    }
  } else {
    logInfo("Dependency install skipped. Use --install to auto install.");
  }

  console.log("");
  logCreated(`Zenn structure initialized in ${baseDir}`);
}
