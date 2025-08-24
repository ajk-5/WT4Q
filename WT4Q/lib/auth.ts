export function isLoggedIn(): boolean {
  return typeof window !== 'undefined' && localStorage.getItem('wt4q_logged_in') === 'true';
}

export function setLoggedIn(value: boolean) {
  if (typeof window === 'undefined') return;
  if (value) {
    localStorage.setItem('wt4q_logged_in', 'true');
  } else {
    localStorage.removeItem('wt4q_logged_in');
  }
}
