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
    id: "react-router-v7",
    label: "React Router v7",
    aliases: ["router-v7", "router7", "react-router-7", "rr7", "rrv7"]
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
  "react-router-v7",
  "expo",
  "vue",
  "nuxt",
  "next",
  "angular",
  "react",
  "vite"
];

const DEFAULT_ARCHITECTURE = "type-based";

const ARCHITECTURES = [
  {
    id: "monolithic",
    label: "Monolithic (Traditional) Architecture",
    aliases: ["monolith", "traditional"]
  },
  {
    id: "type-based",
    label: "Type-Based / Technical Folder Structure",
    aliases: ["typebased", "type", "technical", "default"]
  },
  {
    id: "layer-based",
    label: "Layer-Based Architecture (Separation of Concerns)",
    aliases: ["layer", "layered", "layers", "soc", "separation-of-concerns"]
  },
  {
    id: "modular",
    label: "Modular Architecture (Feature-Based)",
    aliases: ["module", "modules", "feature", "features", "feature-based"]
  },
  {
    id: "atomic-design",
    label: "Atomic Design (UI Hierarchy)",
    aliases: ["atomic", "atomicdesign"]
  },
  {
    id: "fsd",
    label: "Feature-Sliced Design (FSD)",
    aliases: [
      "feature-sliced",
      "feature-sliced-design",
      "sliced",
      "featuresliced"
    ]
  },
  {
    id: "micro-frontend",
    label: "Micro-Frontend Architecture",
    aliases: [
      "microfrontend",
      "micro-frontends",
      "microfrontends",
      "mfe",
      "micro"
    ]
  },
  {
    id: "clean-architecture",
    label: "Clean Architecture (Uncle Bob)",
    aliases: ["clean", "cleanarch", "uncle-bob", "unclebob"]
  },
  {
    id: "hexagonal",
    label: "Hexagonal Architecture (Ports & Adapters)",
    aliases: [
      "ports-and-adapters",
      "portsadapters",
      "hexagon",
      "hex"
    ]
  },
  {
    id: "n-tier",
    label: "N-Tier / Multi-Tier Architecture",
    aliases: ["ntier", "multi-tier", "multitier", "tier"]
  },
  {
    id: "jamstack",
    label: "Jamstack Architecture (JavaScript, APIs, Markup)",
    aliases: ["jam-stack", "jam"]
  },
  {
    id: "headless",
    label: "Headless Architecture (Decoupled Frontend and Backend)",
    aliases: ["headless-cms", "decoupled"]
  }
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

const ARCHITECTURE_ALIAS_MAP = new Map();
ARCHITECTURES.forEach((architecture) => {
  ARCHITECTURE_ALIAS_MAP.set(architecture.id, architecture.id);
  ARCHITECTURE_ALIAS_MAP.set(architecture.id.replace(/-/g, ""), architecture.id);

  architecture.aliases.forEach((alias) => {
    const normalized = alias.trim().toLowerCase().replace(/[_\s]+/g, "-");
    ARCHITECTURE_ALIAS_MAP.set(normalized, architecture.id);
    ARCHITECTURE_ALIAS_MAP.set(normalized.replace(/-/g, ""), architecture.id);
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

function getRelativeImportSpecifier(fromFileWithoutExt, toFileWithoutExt) {
  const fromDir = path.posix.dirname(fromFileWithoutExt);
  const relative = toPosixPath(path.posix.relative(fromDir, toFileWithoutExt));
  return relative.startsWith(".") ? relative : `./${relative}`;
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

function writeExtraFiles(root, blueprint) {
  (blueprint.extraFiles ?? []).forEach((file) => {
    writeFileIfMissing(path.join(root, file.path), file.content);
  });
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

function normalizeArchitecture(raw) {
  if (!raw) {
    return undefined;
  }

  const normalized = raw.trim().toLowerCase().replace(/[_\s]+/g, "-");
  const compact = normalized.replace(/-/g, "");

  const exact = ARCHITECTURE_ALIAS_MAP.get(normalized);
  if (exact) {
    return exact;
  }

  const compactMatch = ARCHITECTURE_ALIAS_MAP.get(compact);
  if (compactMatch) {
    return compactMatch;
  }

  const allowed = ARCHITECTURES.map((architecture) => architecture.id).join(", ");
  throw new Error(`Invalid architecture "${raw}". Use one of: ${allowed}.`);
}

function tryNormalizeArchitecture(raw) {
  if (!raw) {
    return undefined;
  }

  const normalized = raw.trim().toLowerCase().replace(/[_\s]+/g, "-");

  return (
    ARCHITECTURE_ALIAS_MAP.get(normalized) ??
    ARCHITECTURE_ALIAS_MAP.get(normalized.replace(/-/g, ""))
  );
}

function parseInitArgs(rawArgs) {
  const options = {
    framework: undefined,
    architecture: undefined,
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
      case "--architecture":
      case "--arch": {
        const value = rawArgs[i + 1];
        if (!value || value.startsWith("-")) {
          throw new Error("Missing value for --architecture.");
        }

        options.architecture = normalizeArchitecture(value);
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
          const architectureId = tryNormalizeArchitecture(arg.slice(2));
          if (architectureId) {
            options.architecture = architectureId;
            hasPresetFlags = true;
            break;
          }

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

function getReactRouterMajorVersion(packageJson) {
  const deps = getDependencyMap(packageJson);
  const raw = deps["react-router"] ?? deps["react-router-dom"];

  if (typeof raw !== "string") {
    return null;
  }

  const match = raw.match(/\d+/);
  return match ? Number(match[0]) : null;
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
    return getReactRouterMajorVersion(packageJson) === 7
      ? "react-router-v7"
      : "react-router";
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

  if (framework === "react-router" || framework === "react-router-v7") {
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

  if (framework === "react-router" || framework === "react-router-v7") {
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
    case "react-router-v7":
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

function architectureLabel(architecture) {
  const entry = ARCHITECTURES.find((item) => item.id === architecture);
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

function getReactMainLayoutTemplate({ tailwind, typescript, navbarImport }) {
  const navbarPath = navbarImport ?? "../components/layout/Navbar";
  const wrapperClass = tailwind
    ? "min-h-screen bg-slate-50 text-slate-900"
    : "main-layout";
  const mainClass = tailwind ? "mx-auto max-w-6xl p-6" : "main-content";

  if (typescript) {
    return `import type { ReactNode } from "react";
import Navbar from "${navbarPath}";

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

  return `import Navbar from "${navbarPath}";

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

function getReactRouterV7AppRoutesTemplate({ typescript, layoutImport }) {
  const mainLayoutPath = layoutImport ?? "../layouts/MainLayout";
  if (typescript) {
    return `import { createBrowserRouter, RouterProvider } from "react-router";
import MainLayout from "${mainLayoutPath}";

const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <MainLayout>
        <h2>Home page</h2>
      </MainLayout>
    )
  }
]);

const AppRoutes = (): JSX.Element => {
  return <RouterProvider router={router} />;
};

export default AppRoutes;`;
  }

  return `import { createBrowserRouter, RouterProvider } from "react-router";
import MainLayout from "${mainLayoutPath}";

const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <MainLayout>
        <h2>Home page</h2>
      </MainLayout>
    )
  }
]);

const AppRoutes = () => {
  return <RouterProvider router={router} />;
};

export default AppRoutes;`;
}

function getReactAppRoutesTemplate({
  framework,
  router,
  typescript,
  routerImport,
  layoutImport
}) {
  const mainLayoutPath = layoutImport ?? "../layouts/MainLayout";
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

  if (framework === "react-router-v7") {
    return getReactRouterV7AppRoutesTemplate({ typescript, layoutImport });
  }

  const useRouter = framework === "react-router" || router;

  if (useRouter) {
    const routerPackage =
      framework === "react-router"
        ? "react-router"
        : routerImport || "react-router-dom";

    if (typescript) {
      return `import { BrowserRouter, Route, Routes } from "${routerPackage}";
import MainLayout from "${mainLayoutPath}";

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
import MainLayout from "${mainLayoutPath}";

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
    return `import MainLayout from "${mainLayoutPath}";

const AppRoutes = (): JSX.Element => {
  return (
    <MainLayout>
      <h2>Home page</h2>
    </MainLayout>
  );
};

export default AppRoutes;`;
  }

  return `import MainLayout from "${mainLayoutPath}";

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

function getExpoHomeScreenTemplate({ typescript, navbarImport, themeImport }) {
  const navbarPath = navbarImport ?? "../components/layout/Navbar";
  const themePath = themeImport ?? "../styles/theme";

  if (typescript) {
    return `import { SafeAreaView, Text, View } from "react-native";
import Navbar from "${navbarPath}";
import { theme } from "${themePath}";

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
import Navbar from "${navbarPath}";
import { theme } from "${themePath}";

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

function getExpoAppTemplate({ typescript, baseDir, screenPath }) {
  const importPath = toImportPathFromRoot(
    baseDir,
    screenPath ?? "screens/HomeScreen"
  );

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

function getVueMainLayoutTemplate({ tailwind, navbarImport }) {
  const navbarPath = `${navbarImport ?? "../components/layout/Navbar"}.vue`;
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
import Navbar from "${navbarPath}";
</script>`;
}

function getVuePageTemplate({ layoutImport }) {
  const mainLayoutPath = `${layoutImport ?? "../layouts/MainLayout"}.vue`;

  return `<template>
  <MainLayout>
    <h2>Home page</h2>
  </MainLayout>
</template>

<script setup>
import MainLayout from "${mainLayoutPath}";
</script>`;
}

function getVueRouterTemplate({ typescript, pageImport }) {
  const appRoutesPath = `${pageImport ?? "../pages/AppRoutes"}.vue`;
  const typeImport = typescript ? ", type RouteRecordRaw" : "";
  const routeType = typescript ? ": RouteRecordRaw[]" : "";

  return `import { createRouter, createWebHistory${typeImport} } from "vue-router";
import AppRoutes from "${appRoutesPath}";

const routes${routeType} = [{ path: "/", component: AppRoutes }];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;`;
}

function getNuxtDefaultLayoutTemplate({ navbarImport }) {
  const navbarPath = `${navbarImport ?? "../components/layout/Navbar"}.vue`;

  return `<template>
  <div>
    <Navbar />
    <main>
      <slot />
    </main>
  </div>
</template>

<script setup>
import Navbar from "${navbarPath}";
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

function getAngularMainLayoutTemplate({ navbarImport }) {
  const navbarPath = navbarImport ?? "../components/layout/navbar.component";

  return `import { Component } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { NavbarComponent } from "${navbarPath}";

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

function getAngularRoutesTemplate({ homeImport }) {
  const homePagePath = `${homeImport ?? "./pages/home.component"}`;

  return `import { Routes } from "@angular/router";
import { HomePageComponent } from "${homePagePath}";

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
  logInfo(`Architecture: ${architectureLabel(preset.architecture)}`);
  logInfo(`TypeScript: ${preset.typescript ? "yes" : "no"}`);
  logInfo(`Tailwind: ${preset.tailwind ? "yes" : "no"}`);
  logInfo(`Router starter: ${preset.router ? "yes" : "no"}`);
  logInfo(`Install deps: ${preset.install ? "yes" : "no"}`);
  console.log("");
}

async function askYesNo(ask, label, defaultValue) {
  const suffix = defaultValue ? "Y/n" : "y/N";
  const answer = String((await ask(`${label} (${suffix}): `)) ?? "")
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

async function askChoiceNumberedFallback(ask, entries, defaultId) {
  console.log("Choose an option:");
  entries.forEach((entry, index) => {
    const isDefault = entry.id === defaultId;
    console.log(
      `${index + 1}. ${entry.label}${isDefault ? " (default)" : ""}`
    );
  });

  const answer = String(
    (await ask(`Option [1-${entries.length}]: `)) ?? ""
  ).trim();

  if (!answer) {
    return defaultId;
  }

  const choice = Number(answer);
  if (Number.isInteger(choice) && choice >= 1 && choice <= entries.length) {
    return entries[choice - 1].id;
  }

  const byLabel = entries.find(
    (entry) => entry.id === answer || entry.label.toLowerCase() === answer.toLowerCase()
  );
  if (byLabel) {
    return byLabel.id;
  }

  logWarn("Invalid choice. Using default value.");
  return defaultId;
}

function createRadioLine(label, isSelected, isDefault) {
  const text = `${label}${isDefault ? " (default)" : ""}`;
  const marker = isSelected ? "[x]" : "[ ]";
  const prefix = isSelected ? ">" : " ";
  const canColor =
    process.stdout.isTTY &&
    !("NO_COLOR" in process.env) &&
    process.env.FORCE_COLOR !== "0";

  if (!canColor) {
    return `${prefix} ${marker} ${text}`;
  }

  const reset = "\x1b[0m";
  const green = "\x1b[32m";
  const bold = "\x1b[1m";
  const dim = "\x1b[2m";

  if (isSelected) {
    return `${green}${bold}${prefix} ${marker} ${text}${reset}`;
  }

  return `${dim}${prefix} ${marker} ${text}${reset}`;
}

async function askChoiceRadio(ask, { title, entries, defaultId }) {
  const defaultIndex = entries.findIndex((entry) => entry.id === defaultId);
  let selectedIndex = defaultIndex >= 0 ? defaultIndex : 0;

  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    return askChoiceNumberedFallback(ask, entries, entries[selectedIndex].id);
  }

  const input = process.stdin;
  const output = process.stdout;
  const previousRawMode =
    typeof input.isRaw === "boolean" ? input.isRaw : false;
  const canControlCursor =
    output.isTTY &&
    !("NO_COLOR" in process.env) &&
    process.env.FORCE_COLOR !== "0";
  let renderedOnce = false;

  output.write(`${title} (green means selected, use arrow keys then Enter):\n`);
  if (canControlCursor) {
    output.write("\x1b[?25l");
  }

  const render = () => {
    if (renderedOnce) {
      output.write(`\x1b[${entries.length}A`);
    }

    entries.forEach((entry, index) => {
      const isSelected = index === selectedIndex;
      const isDefault = entry.id === defaultId;
      const line = createRadioLine(entry.label, isSelected, isDefault);
      output.write(`\x1b[2K\r${line}\n`);
    });

    renderedOnce = true;
  };

  if (typeof input.setRawMode === "function") {
    input.setRawMode(true);
  }
  input.resume();
  render();

  const selectedId = await new Promise((resolve) => {
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
        resolve(entries[selectedIndex].id);
        return;
      }

      if (key === "\u001b[A" || key.toLowerCase() === "k") {
        selectedIndex = (selectedIndex - 1 + entries.length) % entries.length;
        render();
        return;
      }

      if (key === "\u001b[B" || key.toLowerCase() === "j") {
        selectedIndex = (selectedIndex + 1) % entries.length;
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

  return selectedId;
}

async function askFramework(ask, detectedFramework) {
  const options = INTERACTIVE_FRAMEWORKS;
  const defaultFramework = options.includes(detectedFramework)
    ? detectedFramework
    : "react-router";

  return askChoiceRadio(ask, {
    title: "Choose framework",
    entries: options.map((framework) => ({
      id: framework,
      label: frameworkLabel(framework)
    })),
    defaultId: defaultFramework
  });
}

async function askArchitecture(ask, currentArchitecture) {
  const defaultArchitecture = ARCHITECTURES.some(
    (architecture) => architecture.id === currentArchitecture
  )
    ? currentArchitecture
    : DEFAULT_ARCHITECTURE;

  return askChoiceRadio(ask, {
    title: "Choose architecture",
    entries: ARCHITECTURES.map((architecture) => ({
      id: architecture.id,
      label: architecture.label
    })),
    defaultId: defaultArchitecture
  });
}

function readPipedLines() {
  try {
    const raw = fs.readFileSync(0, "utf8");
    return raw.split(/\r?\n/).map((line) => line.trim());
  } catch (error) {
    return [];
  }
}

async function collectInteractivePreset(detected, currentArchitecture) {
  const canUseReadline =
    Boolean(process.stdin.isTTY) && Boolean(process.stdout.isTTY);
  let rl = null;
  let pipedLines = [];

  if (canUseReadline) {
    rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  } else {
    pipedLines = readPipedLines();
  }

  const ask = async (prompt) => {
    if (rl) {
      return rl.question(prompt);
    }

    return pipedLines.length > 0 ? pipedLines.shift() : "";
  };

  try {
    const framework = await askFramework(ask, detected.framework);
    const architecture = await askArchitecture(ask, currentArchitecture);

    let typescript = detected.typescript;
    if (requiresTypeScript(framework)) {
      typescript = true;
      logInfo("Angular template uses TypeScript by default.");
    } else {
      typescript = await askYesNo(ask, "Use TypeScript?", detected.typescript);
    }

    let tailwind = false;
    if (supportsTailwind(framework)) {
      tailwind = await askYesNo(ask, "Use Tailwind?", detected.tailwind);
    }

    let router = false;
    if (supportsRouterOption(framework)) {
      const routerDefault = detected.router;
      router = await askYesNo(ask, "Add router starter?", routerDefault);
    }

    const install = await askYesNo(ask, "Install dependencies now?", false);

    return { framework, architecture, typescript, tailwind, router, install };
  } finally {
    if (rl) {
      rl.close();
    }
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

  if (
    preset.framework === "react-router" ||
    preset.framework === "react-router-v7"
  ) {
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
      if (preset.architecture === "monolithic") {
        if (preset.framework === "angular") {
          return ["navbar.component.ts"];
        }
        return [`Navbar.${componentExt}`];
      }
      if (preset.framework === "angular") {
        return ["ui/button.component.ts", "layout/navbar.component.ts"];
      }
      return [`ui/button.${componentExt}`, `layout/Navbar.${componentExt}`];
    case "components/atoms":
      return [`button.${componentExt}`];
    case "components/molecules":
      return [`SearchBar.${componentExt}`];
    case "components/organisms":
      if (preset.framework === "angular") {
        return ["navbar.component.ts"];
      }
      return [`Navbar.${componentExt}`];
    case "components/templates":
      if (preset.framework === "angular") {
        return ["main-layout.component.ts"];
      }
      return [`MainTemplate.${componentExt}`];
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
    case "docs":
      return ["README.md"];
    case "tests":
      return ["README.md"];
    case "features":
      return ["README.md"];
    case "features/home/components":
      return [`HomePage.${componentExt}`];
    case "features/home/hooks":
    case "features/home/composables":
      return [`useHomeData.${scriptExt}`];
    case "features/dashboard/components":
      return [`DashboardPage.${componentExt}`];
    case "features/dashboard/hooks":
    case "features/dashboard/composables":
      return [`useDashboardData.${scriptExt}`];
    case "shared/components/ui":
      return [`button.${componentExt}`];
    case "shared/components/layout":
      if (preset.framework === "angular") {
        return ["navbar.component.ts"];
      }
      return [`Navbar.${componentExt}`];
    case "shared/layouts":
      if (preset.framework === "angular") {
        return ["main-layout.component.ts"];
      }
      return [`MainLayout.${componentExt}`];
    case "shared/hooks":
    case "shared/composables":
      return [`useAuth.${scriptExt}`];
    case "shared/utils":
      return [`formatDate.${scriptExt}`];
    case "shared/constants":
      return [`app.${scriptExt}`];
    case "shared/services":
      return [`api.${scriptExt}`];
    case "shared/lib":
      return [`httpClient.${scriptExt}`];
    case "shared/ui":
      return [`button.${componentExt}`];
    case "shared/api":
      return [`httpClient.${scriptExt}`];
    case "shared/config":
      return [`config.${scriptExt}`];
    case "app/providers":
      return [`AppProviders.${componentExt}`];
    case "app/ui":
      if (preset.framework === "nuxt") {
        return [];
      }
      return [`MainLayout.${componentExt}`];
    case "pages/home":
      if (preset.framework === "vue") {
        return [];
      }
      return [`HomePage.${componentExt}`];
    case "widgets/navbar/ui":
      if (preset.framework === "nuxt") {
        return [];
      }
      return [`Navbar.${componentExt}`];
    case "widgets/footer/ui":
      return [`Footer.${componentExt}`];
    case "entities/user/ui":
      return [`UserCard.${componentExt}`];
    case "entities/user/model":
      return [`useUserStore.${scriptExt}`];
    case "container/layouts":
      return [`MainLayout.${componentExt}`];
    case "container/pages":
      return [`AppRoutes.${componentExt}`];
    case "remotes/home/pages":
      return [`HomeView.${componentExt}`];
    case "remotes/home/components":
      return [`ProductCard.${componentExt}`];
    case "remotes/dashboard/pages":
      return [`DashboardView.${componentExt}`];
    case "remotes/dashboard/components":
      return [`StatCard.${componentExt}`];
    case "presentation/components/layout":
      if (preset.framework === "angular") {
        return ["navbar.component.ts"];
      }
      return [`Navbar.${componentExt}`];
    case "presentation/components/ui":
      return [`button.${componentExt}`];
    case "presentation/components/common":
      return [`EmptyState.${componentExt}`];
    case "presentation/layouts":
      if (preset.framework === "angular") {
        return ["main-layout.component.ts"];
      }
      return [`MainLayout.${componentExt}`];
    case "presentation/pages":
      if (preset.framework === "angular") {
        return ["home.component.ts"];
      }
      return [`AppRoutes.${componentExt}`];
    case "presentation/hooks":
      return [`useAuth.${scriptExt}`];
    case "application/services":
      return [`authService.${scriptExt}`];
    case "application/state":
      return [`appStore.${scriptExt}`];
    case "application/use-cases":
      return [`registerUser.${scriptExt}`];
    case "domain/entities":
      return [`user.${scriptExt}`];
    case "data/repositories":
    case "infrastructure/repositories":
    case "data-access/repositories":
      return [`userRepository.${scriptExt}`];
    case "infrastructure/api":
      return [`client.${scriptExt}`];
    case "infrastructure/config":
      return [`config.${scriptExt}`];
    case "core/domain":
      return [`user.${scriptExt}`];
    case "core/ports":
      return [`repository.port.${scriptExt}`];
    case "adapters/in/web/components/common":
      return [`EmptyState.${componentExt}`];
    case "adapters/in/web/components/ui":
      return [`button.${componentExt}`];
    case "adapters/in/web/components/layout":
      if (preset.framework === "angular") {
        return ["navbar.component.ts"];
      }
      return [`Navbar.${componentExt}`];
    case "adapters/in/web/layouts":
      if (preset.framework === "angular") {
        return ["main-layout.component.ts"];
      }
      return [`MainLayout.${componentExt}`];
    case "adapters/in/web/pages":
      if (preset.framework === "angular") {
        return ["home.component.ts"];
      }
      return [`AppRoutes.${componentExt}`];
    case "adapters/in/web/hooks":
      return [`useAuth.${scriptExt}`];
    case "adapters/out/api":
      return [`client.${scriptExt}`];
    case "adapters/out/persistence":
      return [`storage.${scriptExt}`];
    case "business/services":
      return [`orderService.${scriptExt}`];
    case "data-access/api":
      return [`client.${scriptExt}`];
    case "common/utils":
      return [`formatDate.${scriptExt}`];
    case "common/constants":
      return [`app.${scriptExt}`];
    case "content/posts":
      return ["hello-world.md"];
    case "api":
      return [`client.${scriptExt}`, `endpoints.${scriptExt}`];
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
    case "docs":
      return "Project documentation, architecture notes, and onboarding guides.";
    case "tests":
      return "Unit, integration, and end-to-end tests for the app.";
    case "components/atoms":
      return "Smallest atomic UI units such as buttons, inputs, and labels.";
    case "components/molecules":
      return "Simple combinations of atoms, such as search bars and form fields.";
    case "components/organisms":
      return "Complex self-contained sections such as navigation bars and cards.";
    case "components/templates":
      return "Page-level layout blueprints that arrange organisms into screens.";
    case "features":
    case "shared":
      return "Shared building blocks and helpers consumed by every feature.";
    case "app":
      return "App-level wiring: providers, global styles, and initialization.";
    case "widgets":
      return "Composite page sections that combine entities and features.";
    case "entities":
      return "Domain entity slices, each owning its UI and state models.";
    case "presentation":
      return "Presentation layer handling rendering and user interaction.";
    case "application":
      return "Application layer orchestrating use cases and app state.";
    case "domain":
      return "Core business models and rules, kept framework-free.";
    case "data":
      return "Data layer abstracting backend access behind repositories.";
    case "infrastructure":
      return "Technical implementations: HTTP clients, config, persistence.";
    case "core":
      return "Framework-independent core with domain logic and ports.";
    case "adapters":
      return "Driving UI adapters and driven API or storage adapters.";
    case "container":
      return "Host shell of the micro-frontend setup; composes remote apps.";
    case "remotes":
      return "Independently deployable micro-frontend apps mounted by the host.";
    case "business":
      return "Business logic tier between the UI and data access tiers.";
    case "data-access":
      return "Data access tier isolating all backend communication.";
    case "common":
      return "Cross-cutting utilities and constants shared by all tiers.";
    case "content":
      return "Markdown and content files processed at build time (Jamstack).";
    case "api":
      return "Typed client layer for the decoupled headless backend.";
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

function buildFolderSection(folderPath, resolvedPrefix, preset) {
  const fullFolderPath =
    !resolvedPrefix || resolvedPrefix === "."
      ? folderPath
      : `${resolvedPrefix}/${folderPath}`;
  const description = getFolderDescription(folderPath, preset);
  const samples = getFolderSampleFiles(folderPath, preset);
  const sampleLines = samples.map((sample) => `- \`${sample}\``).join("\n");

  return `## \`${fullFolderPath}\`
Description: ${description}
Sample files:
${sampleLines}`;
}

function buildZennCodeDocContent(baseDir, folders, preset, rootFolders = []) {
  const normalizedBaseDir = toPosixPath(baseDir).replace(/^\.\/+/, "").replace(/\/+$/, "");
  const resolvedBaseDir = normalizedBaseDir && normalizedBaseDir !== "."
    ? normalizedBaseDir
    : ".";
  const rootFoldersWithParents = expandFoldersWithParents(rootFolders);
  const foldersWithParents = expandFoldersWithParents(folders);

  const rootSections = rootFoldersWithParents.map((folderPath) =>
    buildFolderSection(folderPath, ".", preset)
  );
  const sourceSections = foldersWithParents.map((folderPath) =>
    buildFolderSection(folderPath, resolvedBaseDir, preset)
  );
  const sections = [...rootSections, ...sourceSections];

  return `# ZennCode Folder Guide

Framework: ${frameworkLabel(preset.framework)}
Architecture: ${architectureLabel(preset.architecture)}
Base directory: \`${resolvedBaseDir}\`

This file explains each generated folder and gives sample starter files.

${sections.join("\n\n")}`;
}

function scaffoldZennCodeDoc(baseDir, folders, preset, rootFolders = []) {
  writeFileIfMissing(
    path.join(process.cwd(), "zenncode.md"),
    buildZennCodeDocContent(baseDir, folders, preset, rootFolders)
  );
}

function getProjectRootFolders() {
  return ["docs", "tests"];
}

function getDocsReadmeTemplate(preset) {
  return `# Docs

Use this folder for product notes, architecture decisions, and onboarding.

Framework: ${frameworkLabel(preset.framework)}

## Starter files

- \`README.md\` â€” this file

## Convention

When you add a page, route, or shared module, update the matching note here.
Keep \`zenncode.md\` in sync with generated folders.`;
}

function getTestsReadmeTemplate(preset) {
  return `# Tests

Use this folder for unit, integration, and end-to-end tests.

Framework: ${frameworkLabel(preset.framework)}

Suggested layout:

- \`tests/unit/\` â€” isolated helper and component tests
- \`tests/e2e/\` â€” full user-flow checks`;
}

function scaffoldProjectRootFolders(preset) {
  const cwd = process.cwd();
  const rootFolders = getProjectRootFolders();
  ensureFolders(cwd, rootFolders);

  writeFileIfMissing(path.join(cwd, "docs", "README.md"), getDocsReadmeTemplate(preset));
  writeFileIfMissing(path.join(cwd, "tests", "README.md"), getTestsReadmeTemplate(preset));

  return rootFolders;
}

function getJamstackContentPostTemplate() {
  return `---
title: "Hello World"
date: "2026-01-01"
draft: false
---

Welcome to your first Jamstack content file.
Replace this post with your own markdown content.`;
}

function getArchitectureRawBlueprint(architecture) {
  switch (architecture) {
    case "monolithic":
      return {
        folders: [
          "assets/images",
          "assets/icons",
          "components",
          "layouts",
          "pages",
          "hooks",
          "context",
          "utils",
          "styles"
        ],
        navbar: "components/Navbar",
        layout: "layouts/MainLayout",
        page: "pages/AppRoutes",
        api: "utils/api"
      };
    case "layer-based":
      return {
        folders: [
          "presentation/components/common",
          "presentation/components/ui",
          "presentation/components/layout",
          "presentation/layouts",
          "presentation/pages",
          "presentation/hooks",
          "application/services",
          "application/state",
          "domain/models",
          "data",
          "data/repositories",
          "types",
          "constants",
          "styles"
        ],
        navbar: "presentation/components/layout/Navbar",
        layout: "presentation/layouts/MainLayout",
        page: "presentation/pages/AppRoutes",
        api: "data/api"
      };
    case "modular":
      return {
        folders: [
          "features/home/components",
          "features/home/hooks",
          "features/dashboard/components",
          "features/dashboard/hooks",
          "shared/components/ui",
          "shared/components/layout",
          "shared/layouts",
          "shared/hooks",
          "shared/utils",
          "shared/constants",
          "shared/services",
          "lib",
          "pages",
          "styles",
          "types"
        ],
        navbar: "shared/components/layout/Navbar",
        layout: "shared/layouts/MainLayout",
        page: "pages/AppRoutes",
        api: "shared/services/api"
      };
    case "atomic-design":
      return {
        folders: [
          "components/atoms",
          "components/molecules",
          "components/organisms",
          "components/templates",
          "pages",
          "hooks",
          "context",
          "services",
          "utils",
          "constants",
          "styles",
          "types"
        ],
        navbar: "components/organisms/Navbar",
        layout: "components/templates/MainTemplate",
        page: "pages/AppRoutes",
        api: "services/api"
      };
    case "fsd":
      return {
        folders: [
          "app/providers",
          "app/ui",
          "pages/home",
          "widgets/navbar/ui",
          "widgets/footer/ui",
          "features",
          "entities/user/ui",
          "entities/user/model",
          "shared/ui",
          "shared/lib",
          "shared/api",
          "shared/config",
          "styles"
        ],
        navbar: "widgets/navbar/ui/Navbar",
        layout: "app/ui/MainLayout",
        page: "pages/AppRoutes",
        api: "shared/api/httpClient"
      };
    case "micro-frontend":
      return {
        folders: [
          "container/layouts",
          "container/pages",
          "remotes/home/pages",
          "remotes/home/components",
          "remotes/dashboard/pages",
          "remotes/dashboard/components",
          "shared/components/ui",
          "shared/components/layout",
          "shared/hooks",
          "shared/lib",
          "shared/utils",
          "shared/services",
          "types",
          "styles"
        ],
        navbar: "shared/components/layout/Navbar",
        layout: "container/layouts/MainLayout",
        page: "container/pages/AppRoutes",
        api: "shared/services/api"
      };
    case "clean-architecture":
      return {
        folders: [
          "domain/entities",
          "application/use-cases",
          "presentation/components/common",
          "presentation/components/ui",
          "presentation/components/layout",
          "presentation/layouts",
          "presentation/pages",
          "presentation/hooks",
          "infrastructure/api",
          "infrastructure/repositories",
          "utils",
          "types",
          "constants",
          "styles"
        ],
        navbar: "presentation/components/layout/Navbar",
        layout: "presentation/layouts/MainLayout",
        page: "presentation/pages/AppRoutes",
        api: "infrastructure/api/client"
      };
    case "hexagonal":
      return {
        folders: [
          "core/domain",
          "core/ports",
          "adapters/in/web/components/common",
          "adapters/in/web/components/ui",
          "adapters/in/web/components/layout",
          "adapters/in/web/layouts",
          "adapters/in/web/pages",
          "adapters/in/web/hooks",
          "adapters/out/api",
          "adapters/out/persistence",
          "infrastructure/config",
          "types",
          "styles"
        ],
        navbar: "adapters/in/web/components/layout/Navbar",
        layout: "adapters/in/web/layouts/MainLayout",
        page: "adapters/in/web/pages/AppRoutes",
        api: "adapters/out/api/client"
      };
    case "n-tier":
      return {
        folders: [
          "presentation/components/common",
          "presentation/components/ui",
          "presentation/components/layout",
          "presentation/layouts",
          "presentation/pages",
          "presentation/hooks",
          "business/services",
          "data-access/api",
          "data-access/repositories",
          "common/utils",
          "common/constants",
          "types",
          "styles"
        ],
        navbar: "presentation/components/layout/Navbar",
        layout: "presentation/layouts/MainLayout",
        page: "presentation/pages/AppRoutes",
        api: "data-access/api/client"
      };
    case "jamstack":
      return {
        folders: [
          "assets/images",
          "assets/icons",
          "components/ui",
          "components/layout",
          "layouts",
          "pages",
          "content/posts",
          "lib",
          "hooks",
          "utils",
          "styles",
          "types"
        ],
        navbar: "components/layout/Navbar",
        layout: "layouts/MainLayout",
        page: "pages/AppRoutes",
        api: "lib/api",
        extraFiles: [
          { path: "content/posts/hello-world.md", content: getJamstackContentPostTemplate() }
        ]
      };
    case "headless":
      return {
        folders: [
          "api",
          "components/ui",
          "components/layout",
          "layouts",
          "pages",
          "hooks",
          "context",
          "types",
          "constants",
          "utils",
          "styles"
        ],
        navbar: "components/layout/Navbar",
        layout: "layouts/MainLayout",
        page: "pages/AppRoutes",
        api: "api/client"
      };
    case "type-based":
    default:
      return {
        folders: [
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
        ],
        navbar: "components/layout/Navbar",
        layout: "layouts/MainLayout",
        page: "pages/AppRoutes",
        api: "services/api"
      };
  }
}

function adaptFoldersForFramework(folders, preset) {
  const framework = preset.framework;
  let adapted = folders.map((folder) => {
    if (
      framework === "expo" &&
      (folder === "pages" || folder.endsWith("/pages"))
    ) {
      return `${folder.slice(0, -"pages".length)}screens`;
    }

    return folder;
  });

  if (framework === "vue" || framework === "nuxt") {
    adapted = adapted.map((folder) =>
      folder.replace(/(^|\/)hooks(?=$|\/)/g, "$1composables")
    );
  }

  if (framework === "vue") {
    adapted = adapted.map((folder) => (folder === "context" ? "stores" : folder));
  }

  if (framework === "nuxt") {
    adapted = adapted.filter((folder) => folder !== "context");
  }

  if (framework === "expo") {
    adapted = adapted.filter((folder) => folder !== "types");
  }

  if (framework === "angular") {
    adapted = adapted.filter(
      (folder) =>
        !folder.startsWith("assets/") &&
        !["hooks", "context", "lib", "types"].includes(folder)
    );
    adapted.push("models");
  }

  return adapted;
}

function getLegacyTypeBasedBlueprint(preset) {
  switch (preset.framework) {
    case "expo":
      return {
        folders: [
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
        ],
        navbar: "components/layout/Navbar",
        layout: null,
        page: "screens/HomeScreen",
        api: "services/api"
      };
    case "vue":
      return {
        folders: [
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
        ],
        navbar: "components/layout/Navbar",
        layout: "layouts/MainLayout",
        page: "pages/AppRoutes",
        api: "services/api"
      };
    case "nuxt":
      return {
        folders: [
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
        ],
        navbar: "components/layout/Navbar",
        layout: "layouts/default",
        page: "pages/index",
        api: "services/api"
      };
    case "angular":
      return {
        folders: [
          "components/ui",
          "components/layout",
          "layouts",
          "pages",
          "services",
          "models",
          "utils",
          "constants",
          "styles"
        ],
        navbar: "components/layout/Navbar",
        layout: "layouts/MainLayout",
        page: "pages/AppRoutes",
        api: "services/api"
      };
    default:
      return undefined;
  }
}

function ensureRequiredRoleDirs(folders, preset) {
  const guaranteed = [];

  if (preset.framework === "expo") {
    guaranteed.push("screens");
  }

  if (preset.framework === "nuxt") {
    guaranteed.push("layouts", "pages");
  }

  guaranteed.forEach((dir) => {
    if (!folders.includes(dir)) {
      folders.push(dir);
    }
  });

  return folders;
}

function buildBlueprint(preset) {
  const architectureId = preset.architecture ?? DEFAULT_ARCHITECTURE;

  if (architectureId === DEFAULT_ARCHITECTURE) {
    const legacy = getLegacyTypeBasedBlueprint(preset);
    if (legacy) {
      return {
        architecture: architectureId,
        folders: legacy.folders,
        navbar: legacy.navbar,
        layout: legacy.layout,
        page: legacy.page,
        api: legacy.api,
        extraFiles: []
      };
    }
  }

  const raw = getArchitectureRawBlueprint(architectureId);
  const folders = ensureRequiredRoleDirs(
    adaptFoldersForFramework(raw.folders, preset),
    preset
  );
  let { navbar, layout, page, api } = raw;

  if (preset.framework === "expo") {
    page = "screens/HomeScreen";
    layout = null;
  }

  if (preset.framework === "nuxt") {
    layout = "layouts/default";
    page = "pages/index";
  }

  return {
    architecture: architectureId,
    folders,
    navbar,
    layout,
    page,
    api,
    extraFiles: raw.extraFiles ?? []
  };
}

function scaffoldReactFamily(root, preset, blueprint) {
  const folders = [...blueprint.folders];

  if (
    preset.router ||
    preset.framework === "react-router" ||
    preset.framework === "react-router-v7"
  ) {
    folders.push("routes");
  }

  ensureFolders(root, folders);

  const componentExt = preset.typescript ? "tsx" : "jsx";
  const scriptExt = preset.typescript ? "ts" : "js";
  const navbarImport = getRelativeImportSpecifier(
    blueprint.layout,
    blueprint.navbar
  );
  const layoutImport = getRelativeImportSpecifier(blueprint.page, blueprint.layout);

  writeFileIfMissing(
    path.join(root, `${blueprint.navbar}.${componentExt}`),
    getReactNavbarTemplate(preset)
  );

  writeFileIfMissing(
    path.join(root, `${blueprint.layout}.${componentExt}`),
    getReactMainLayoutTemplate({ ...preset, navbarImport })
  );

  writeFileIfMissing(
    path.join(root, `${blueprint.page}.${componentExt}`),
    getReactAppRoutesTemplate({ ...preset, layoutImport })
  );

  writeFileIfMissing(
    path.join(root, `${blueprint.api}.${scriptExt}`),
    getAxiosApiTemplate(preset)
  );

  writeFileIfMissing(
    path.join(root, "styles", "globals.css"),
    getGlobalStyleTemplate(preset)
  );

  writeExtraFiles(root, blueprint);

  return folders;
}

function scaffoldExpo(root, preset, baseDir, blueprint) {
  const folders = [...blueprint.folders];
  ensureFolders(root, folders);

  const componentExt = preset.typescript ? "tsx" : "jsx";
  const scriptExt = preset.typescript ? "ts" : "js";
  const navbarImport = getRelativeImportSpecifier(
    blueprint.page,
    blueprint.navbar
  );
  const themeImport = getRelativeImportSpecifier(blueprint.page, "styles/theme");

  writeFileIfMissing(
    path.join(root, `${blueprint.navbar}.${componentExt}`),
    getExpoNavbarTemplate(preset)
  );

  writeFileIfMissing(
    path.join(root, `${blueprint.page}.${componentExt}`),
    getExpoHomeScreenTemplate({ ...preset, navbarImport, themeImport })
  );

  writeFileIfMissing(
    path.join(root, `${blueprint.api}.${scriptExt}`),
    getAxiosApiTemplate(preset)
  );

  writeFileIfMissing(
    path.join(root, "styles", `theme.${scriptExt}`),
    getExpoThemeTemplate(preset)
  );

  const appFile = path.join(process.cwd(), `App.${componentExt}`);
  writeFileIfMissing(
    appFile,
    getExpoAppTemplate({ ...preset, baseDir, screenPath: blueprint.page })
  );

  writeExtraFiles(root, blueprint);

  return folders;
}

function scaffoldVue(root, preset, blueprint) {
  const folders = [...blueprint.folders];

  if (preset.router) {
    folders.push("router");
  }

  ensureFolders(root, folders);

  const scriptExt = preset.typescript ? "ts" : "js";
  const navbarImport = getRelativeImportSpecifier(
    blueprint.layout,
    blueprint.navbar
  );
  const layoutImport = getRelativeImportSpecifier(blueprint.page, blueprint.layout);

  writeFileIfMissing(
    path.join(root, `${blueprint.navbar}.vue`),
    getVueNavbarTemplate(preset)
  );

  writeFileIfMissing(
    path.join(root, `${blueprint.layout}.vue`),
    getVueMainLayoutTemplate({ ...preset, navbarImport })
  );

  writeFileIfMissing(
    path.join(root, `${blueprint.page}.vue`),
    getVuePageTemplate({ layoutImport })
  );

  if (preset.router) {
    const pageImport = getRelativeImportSpecifier("router/index", blueprint.page);
    writeFileIfMissing(
      path.join(root, "router", `index.${scriptExt}`),
      getVueRouterTemplate({ ...preset, pageImport })
    );
  }

  writeFileIfMissing(
    path.join(root, `${blueprint.api}.${scriptExt}`),
    getAxiosApiTemplate(preset)
  );

  writeFileIfMissing(
    path.join(root, "styles", "globals.css"),
    getGlobalStyleTemplate(preset)
  );

  writeExtraFiles(root, blueprint);

  return folders;
}

function scaffoldNuxt(root, preset, blueprint) {
  const folders = [...blueprint.folders];
  ensureFolders(root, folders);

  const scriptExt = preset.typescript ? "ts" : "js";
  const navbarImport = getRelativeImportSpecifier(
    blueprint.layout,
    blueprint.navbar
  );

  writeFileIfMissing(
    path.join(root, `${blueprint.navbar}.vue`),
    getVueNavbarTemplate(preset)
  );

  writeFileIfMissing(
    path.join(root, `${blueprint.layout}.vue`),
    getNuxtDefaultLayoutTemplate({ navbarImport })
  );

  writeFileIfMissing(
    path.join(root, `${blueprint.page}.vue`),
    getNuxtIndexPageTemplate()
  );

  writeFileIfMissing(
    path.join(root, `${blueprint.api}.${scriptExt}`),
    getAxiosApiTemplate(preset)
  );

  writeFileIfMissing(
    path.join(root, "styles", "globals.css"),
    getGlobalStyleTemplate(preset)
  );

  writeExtraFiles(root, blueprint);

  return folders;
}

function scaffoldAngular(root, preset, blueprint) {
  const folders = [...blueprint.folders];
  ensureFolders(root, folders);

  const navbarDir = path.posix.dirname(blueprint.navbar);
  const layoutDir = path.posix.dirname(blueprint.layout);
  const pageDir = path.posix.dirname(blueprint.page);
  const apiDir = path.posix.dirname(blueprint.api);
  const layoutFile = path.posix.join(layoutDir, "main-layout.component");
  const navbarTarget = path.posix.join(navbarDir, "navbar.component");
  const homeTarget = path.posix.join(pageDir, "home.component");
  const navbarImport = getRelativeImportSpecifier(layoutFile, navbarTarget);
  const homeImport = getRelativeImportSpecifier("app.routes", homeTarget);

  writeFileIfMissing(
    path.join(root, navbarDir, "navbar.component.ts"),
    getAngularNavbarTemplate()
  );

  writeFileIfMissing(
    path.join(root, layoutDir, "main-layout.component.ts"),
    getAngularMainLayoutTemplate({ navbarImport })
  );

  writeFileIfMissing(
    path.join(root, pageDir, "home.component.ts"),
    getAngularHomePageTemplate()
  );

  writeFileIfMissing(
    path.join(root, apiDir, "api.service.ts"),
    getAngularApiServiceTemplate()
  );

  writeFileIfMissing(path.join(root, "app.routes.ts"), getAngularRoutesTemplate({ homeImport }));

  writeFileIfMissing(
    path.join(root, "styles", "styles.scss"),
    `:host {
  display: block;
}`
  );

  writeExtraFiles(root, blueprint);

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
  const blueprint = buildBlueprint(preset);
  const root = path.join(process.cwd(), baseDir);
  let folders = [];

  if (preset.framework === "vue") {
    folders = scaffoldVue(root, preset, blueprint);
  } else if (preset.framework === "nuxt") {
    folders = scaffoldNuxt(root, preset, blueprint);
  } else if (preset.framework === "angular") {
    folders = scaffoldAngular(root, preset, blueprint);
  } else if (preset.framework === "expo") {
    folders = scaffoldExpo(root, preset, baseDir, blueprint);
  } else {
    folders = scaffoldReactFamily(root, preset, blueprint);
  }

  if (preset.tailwind) {
    scaffoldTailwindConfig(baseDir, preset.framework);
  }

  const rootFolders = scaffoldProjectRootFolders(preset);
  scaffoldZennCodeDoc(baseDir, folders, preset, rootFolders);
}

function resolvePreset(parsed, detected) {
  const frameworkCandidate =
    parsed.framework ??
    (detected.framework === "unknown" ? "react-router" : detected.framework);

  return {
    framework: frameworkCandidate,
    architecture: parsed.architecture ?? DEFAULT_ARCHITECTURE,
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

  if (
    nextPreset.framework === "react-router" ||
    nextPreset.framework === "react-router-v7"
  ) {
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
  const architectureIds = ARCHITECTURES.map((item) => item.id).join(" | ");

  console.log(`zenncode usage

  zenncode init [options]

Options:
  --framework <name>  Select template
                      (react-router | react-router-v7 | expo | vue | nuxt | next | angular | react | vite)
  --react-router      Shortcut for --framework react-router
  --react-router-v7   Shortcut for --framework react-router-v7 (createBrowserRouter/RouterProvider)
  --expo              Shortcut for --framework expo
  --vue               Shortcut for --framework vue
  --nuxt              Shortcut for --framework nuxt
  --next              Shortcut for --framework next
  --angular           Shortcut for --framework angular
  --react             Shortcut for --framework react
  --vite              Shortcut for --framework vite
  --architecture <name>
                      Select folder architecture (${architectureIds})
  --arch <name>       Alias for --architecture
  --monolithic        Shortcut for --architecture monolithic
  --type-based        Shortcut for --architecture type-based (default)
  --layer-based       Shortcut for --architecture layer-based
  --modular           Shortcut for --architecture modular
  --atomic            Shortcut for --architecture atomic-design
  --fsd               Shortcut for --architecture fsd
  --micro-frontend    Shortcut for --architecture micro-frontend
  --clean             Shortcut for --architecture clean-architecture
  --hexagonal         Shortcut for --architecture hexagonal
  --n-tier            Shortcut for --architecture n-tier
  --jamstack          Shortcut for --architecture jamstack
  --headless          Shortcut for --architecture headless
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
    const interactivePreset = await collectInteractivePreset(
      detected,
      preset.architecture
    );
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
