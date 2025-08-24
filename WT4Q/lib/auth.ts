export const isLoggedIn = (): boolean => {
  if (typeof document === 'undefined') return false;
  return document.cookie.split(';').some((cookie) => cookie.trim().startsWith('JwtToken='));
};
