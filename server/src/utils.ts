import { spawnSync } from "child_process";
import { builtinModules } from "module";
import { readJSONSync } from "fs-extra";
import * as resolvePackagePath from "resolve-package-path";
import { IPackage, ILocation, IMark } from "./type";

export function isBuildInModule(moduleName: string): boolean {
  const moduleSet = new Set(builtinModules);
  const isBuildIn = moduleSet.has(moduleName);

  if (isBuildIn) {
    return true;
  }

  return builtinModules.some(v => moduleName.startsWith(v + "/"));
}

export function findPackage(packageName: string, cwd: string): string | null {
  return resolvePackagePath(packageName, cwd, false);
}

export function isValidNpmPackageName(name: string): boolean {
  return /^(@[a-z]([\w\-_]+)?\/)?[a-z]([\w\-_\.\/]+)?$/i.test(name);
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
        description: "",
        version: getCurrentUsingNodeVersion(),
        buildIn: true
      };
    } else {
      const packageNameParser = require("parse-package-name");
      const packageInfo: IPackage = packageNameParser(sourceName);

      const packageJSONPath = findPackage(packageInfo.name, filepath);
      if (!packageJSONPath) {
        return {
          location,
          name: packageInfo.name,
          description: "",
          version: null,
          buildIn: false
        };
      }
      const pkg = readJSONSync(packageJSONPath);
      return {
        location,
        name: pkg.name,
        description: pkg.description || "",
        packagePath: packageJSONPath,
        version: pkg.version,
        buildIn: false
      };
    }
  } catch (err) {
    console.error(err);
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
