export const UserType = {
  CONSUMER: 'consumer',
  EMPLOYEE: 'employee',
  BUSINESS_PARTNER: 'business_partner',
} as const;

export type UserTypeValue = (typeof UserType)[keyof typeof UserType];
