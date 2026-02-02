export interface Customer {
  email: string;
  name: string;
  address: Address;
  phone: string;
}

export interface Address {
  postalCode: string;
  prefecture: string;
  city: string;
  street: string;
  building?: string;
}
