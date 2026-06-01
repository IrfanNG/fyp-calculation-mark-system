export const UNIKL_ID_REGEX = /^522\d{7}$/;

export function isValidUniklId(value: string) {
  return UNIKL_ID_REGEX.test(value.trim());
}

export function isStrongPassword(value: string) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(value);
}

export const UNIKL_ID_MESSAGE =
  "please use Unikl ID";

export const PASSWORD_POLICY_MESSAGE =
  "Password must be at least 8 characters and include uppercase, lowercase, number, and special character.";
