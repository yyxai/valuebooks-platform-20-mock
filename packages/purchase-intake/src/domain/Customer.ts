export interface Customer {
  email: string;
  name: string;
  address: Address;
  phone?: string;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  zip: string;
}
