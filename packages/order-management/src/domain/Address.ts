export interface AddressProps {
  name: string;
  street1: string;
  street2?: string;
  city: string;
  state: string;
  postalCode: string;
  country?: string;
}

export class Address {
  readonly name: string;
  readonly street1: string;
  readonly street2?: string;
  readonly city: string;
  readonly state: string;
  readonly postalCode: string;
  readonly country: string;

  private constructor(props: Required<Omit<AddressProps, 'street2'>> & Pick<AddressProps, 'street2'>) {
    this.name = props.name;
    this.street1 = props.street1;
    this.street2 = props.street2;
    this.city = props.city;
    this.state = props.state;
    this.postalCode = props.postalCode;
    this.country = props.country;
  }

  static create(props: AddressProps): Address {
    if (!props.name?.trim()) {
      throw new Error('Name is required');
    }
    if (!props.street1?.trim()) {
      throw new Error('Street address is required');
    }
    if (!props.city?.trim()) {
      throw new Error('City is required');
    }
    if (!props.state?.trim()) {
      throw new Error('State is required');
    }
    if (!props.postalCode?.trim()) {
      throw new Error('Postal code is required');
    }

    return new Address({
      name: props.name.trim(),
      street1: props.street1.trim(),
      street2: props.street2?.trim(),
      city: props.city.trim(),
      state: props.state.trim(),
      postalCode: props.postalCode.trim(),
      country: props.country?.trim() ?? 'US',
    });
  }

  equals(other: Address): boolean {
    return (
      this.name === other.name &&
      this.street1 === other.street1 &&
      this.street2 === other.street2 &&
      this.city === other.city &&
      this.state === other.state &&
      this.postalCode === other.postalCode &&
      this.country === other.country
    );
  }

  toJSON(): AddressProps & { country: string } {
    return {
      name: this.name,
      street1: this.street1,
      street2: this.street2,
      city: this.city,
      state: this.state,
      postalCode: this.postalCode,
      country: this.country,
    };
  }
}
