export function uid(n = 10) {
  const a = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const b = crypto.getRandomValues(new Uint8Array(n));
  let s = "";
  for (let i = 0; i < n; i++) s += a[b[i] % a.length];
  return s;
}
