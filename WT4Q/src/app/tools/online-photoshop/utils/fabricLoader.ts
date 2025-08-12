/* eslint-disable @typescript-eslint/no-explicit-any */
// Safe Fabric loader for ESM/CJS variants and Next.js environments.
export async function loadFabric(): Promise<any> {
  const mod: any = await import('fabric');
  const fabric = mod.fabric ?? mod.default ?? mod;
  if (!fabric || !fabric.Canvas) {
    throw new Error('fabric module loaded but no Canvas export found');
  }
  return fabric;
}
