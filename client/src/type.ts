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
