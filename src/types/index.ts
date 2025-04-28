export interface TypeMap {
  [partNumber: string]: string;
}

export interface Entry {
  PartnerID: string;
  PartNumber: string;
  itemCount: string;
  plan: string;
  accountGuid: string;
  domains: string;
}
