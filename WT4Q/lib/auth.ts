export function isLoggedIn(): boolean {
  return (
    typeof window !== 'undefined' &&
    localStorage.getItem('90stimes_logged_in') === 'true'
  );
}

export function setLoggedIn(value: boolean) {
  if (typeof window === 'undefined') return;
  if (value) {
    localStorage.setItem('90stimes_logged_in', 'true');
  } else {
    localStorage.removeItem('90stimes_logged_in');
  }
}
