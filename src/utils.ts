import * as path from "path";
import { spawnSync } from "child_process";
import fsExtra = require("fs-extra");
import { IPackage, ILocation, IMark } from "./type";

const builtinModules: string[] = [
  "assert",
  "async_hooks",
  "buffer",
  "child_process",
  "cluster",
  "console",
  "constants",
  "crypto",
  "dgram",
  "dns",
  "domain",
  "events",
  "fs",
  "http",
  "http2",
  "https",
  "inspector",
  "module",
  "net",
  "os",
  "path",
  "perf_hooks",
  "process",
  "punycode",
  "querystring",
  "readline",
  "repl",
  "stream",
  "string_decoder",
  "timers",
  "tls",
  "tty",
  "url",
  "util",
  "v8",
  "vm",
  "zlib"
];

export function isBuildInModule(moduleName: string): boolean {
  const moduleSet = new Set(builtinModules);
  return moduleSet.has(moduleName);
}

export function findPackage(packageName: string, cwd: string): string | void {
  if (cwd === "/" || !cwd) {
    return void 0;
  }
  const packagePath: string = path.join(cwd, "node_modules", packageName);
  try {
    const fs: typeof fsExtra = require("fs-extra");
    fs.readdirSync(packagePath);
    return packagePath;
  } catch (err) {
    return findPackage(packageName, path.dirname(cwd));
  }
}

export function isValidNpmPackageName(name: string): boolean {
  return /^(@[a-z]([\w\-_]+)?\/)?[a-z]([\w\-_\.]+)?$/i.test(name);
}

export function createMark(
  sourceName: string,
  filepath: string,
  location: ILocation
): IMark | void {
  try {
    if (isBuildInModule(sourceName)) {
      return {
        location,
        name: sourceName,
        version: getCurrentUsingNodeVersion(),
        buildIn: true
      };
    } else {
      const packageNameParser = require("parse-package-name");
      const packageInfo: IPackage = packageNameParser(sourceName);

      const packagePath = findPackage(packageInfo.name, filepath);
      if (!packagePath) {
        return {
          location,
          name: packageInfo.name,
          version: null,
          buildIn: false
        };
      }
      const pkg = require(path.join(packagePath, "package.json"));
      return {
        location,
        name: packageInfo.name,
        version: pkg.version,
        buildIn: false
      };
    }
  } catch (err) {
    return;
  }
}

let currentNodeVersion: string;

function getCurrentUsingNodeVersion(): string {
  if (currentNodeVersion) {
    return currentNodeVersion;
  }
  try {
    currentNodeVersion = spawnSync("node", ["--version"], { encoding: "utf8" })
      .output[1];
    currentNodeVersion = currentNodeVersion.trim().replace(/^v/, "");
  } catch (err) {
    //
  }
  return currentNodeVersion || "0.0.0";
}
