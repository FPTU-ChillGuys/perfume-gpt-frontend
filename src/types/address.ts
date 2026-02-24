import type { components } from "./api/v1";

export type AddressResponse = components["schemas"]["AddressResponse"];
export type AddressListResponse =
  components["schemas"]["BaseResponseOfListOfAddressResponse"];

// Create address types
export type CreateAddressRequest = components["schemas"]["CreateAddressRequest"];
export type UpdateAddressRequest = components["schemas"]["UpdateAddressRequest"];

// Location lookup types
export type ProvinceResponse = components["schemas"]["ProvinceResponse"];
export type DistrictResponse = components["schemas"]["DistrictResponse"];
export type WardResponse = components["schemas"]["WardResponse"];
export type AddressLevel4Response = components["schemas"]["AddressLevel4Response"];

// Location lookup list response types
export type ProvinceListResponse = components["schemas"]["BaseResponseOfListOfProvinceResponse"];
export type DistrictListResponse = components["schemas"]["BaseResponseOfListOfDistrictResponse"];
export type WardListResponse = components["schemas"]["BaseResponseOfListOfWardResponse"];
export type StreetListResponse = components["schemas"]["BaseResponseOfAddressLevel4Response"];
