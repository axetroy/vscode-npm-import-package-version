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
  version: string;
}
