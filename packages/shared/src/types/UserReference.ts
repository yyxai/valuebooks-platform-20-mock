/**
 * Lightweight reference to a user for cross-domain use.
 * Other domains should use this instead of importing User directly.
 */
export interface UserReference {
  id: string;
  email: string;
  name: string;
  userType: 'consumer' | 'employee' | 'business_partner';
}
