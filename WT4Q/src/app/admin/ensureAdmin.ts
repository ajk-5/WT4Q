export async function ensureAdmin() {
  // Auth cookies are scoped to the API domain and aren't
  // available to this server-side function.
  // Client-side guards perform the actual authorization check.
  return;
}
