export interface IPackage {
  name: string;
  description?: string;
  path?: string;
  version?: string;
}

export interface ILocation {
  start: number;
  end: number;
}

export interface IMark {
  name: string;
  description?: string;
  packagePath?: string;
  location: ILocation;
  version: string | null;
  buildIn: boolean;
}

export enum SupportLanguages {
  js = "javascript",
  jsx = "javascriptreact",
  ts = "typescript",
  tsx = "typescriptreact",
  vue = "vue"
}
