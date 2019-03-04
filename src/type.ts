export interface IPackage {
  name: string;
  path?: string;
  version?: string;
}

export interface ILocation {
  start: number;
  end: number;
}

export interface IMark {
  location: ILocation;
  name: string;
  version: string | null;
  buildIn: boolean;
  method: "require" | "import";
}

export enum SupportLanguages {
  js = "javascript",
  jsx = "javascriptreact",
  ts = "typescript",
  tsx = "typescriptreact",
  vue = "vue"
}

export const SupportLanguagesMap: { [k: string]: boolean } = {
  [SupportLanguages.js]: true,
  [SupportLanguages.jsx]: true,
  [SupportLanguages.ts]: true,
  [SupportLanguages.tsx]: true,
  [SupportLanguages.vue]: true
};
