// lib/branchIdentity.ts
// Identidad de sucursal por equipo. Cada PC guarda server-side a qué
// sucursal pertenece (Setting "device_branch_id") y su rol
// (Setting "device_role": main | branch | pending). Sin valor configurado,
// el equipo se comporta como Casa Central (compatibilidad hacia atrás).
import prisma from "./prisma";
import { getDeviceSetting, setDeviceSettings } from "./deviceSettings";

export type DeviceRole = "main" | "branch" | "pending";

export async function getDeviceBranchId(): Promise<number | null> {
  const setting = await prisma.setting.findUnique({ where: { key: "device_branch_id" } });
  if (!setting || !setting.value) return null;
  const id = parseInt(setting.value, 10);
  return isNaN(id) ? null : id;
}

export async function setDeviceBranchId(branchId: number): Promise<void> {
  await prisma.setting.upsert({
    where: { key: "device_branch_id" },
    update: { value: String(branchId) },
    create: { key: "device_branch_id", value: String(branchId) },
  });
}

export async function getDeviceRole(): Promise<DeviceRole | null> {
  const setting = await prisma.setting.findUnique({ where: { key: "device_role" } });
  const v = setting?.value;
  if (v === "main" || v === "branch" || v === "pending") return v;
  return null;
}

export async function setDeviceRole(role: DeviceRole): Promise<void> {
  await prisma.setting.upsert({
    where: { key: "device_role" },
    update: { value: role },
    create: { key: "device_role", value: role },
  });
}

// Sucursal efectiva del equipo. Si no hay device_branch_id configurado
// (Casa Central legacy), se usa la Sucursal Principal.
export async function getEffectiveDeviceBranchId(): Promise<number | null> {
  const deviceBranchId = await getDeviceBranchId();
  if (deviceBranchId !== null) return deviceBranchId;
  const mainBranch = await prisma.branch.findFirst({ where: { isMain: true }, select: { id: true } });
  return mainBranch?.id ?? null;
}

export async function isMainDevice(): Promise<boolean> {
  const role = await getDeviceRole();
  if (role === "main") return true;
  if (role === "branch" || role === "pending") return false;
  // Legacy: sin rol configurado, se deduce de la sucursal asignada.
  const deviceBranchId = await getDeviceBranchId();
  if (deviceBranchId === null) return true;
  const branch = await prisma.branch.findUnique({ where: { id: deviceBranchId } });
  if (!branch) return true;
  return branch.isMain === true;
}

// El plan Pro se deduce de las Settings a nivel máquina (store.json en
// multi-negocio, DB local en legacy). En las sucursales remotas el valor llega
// vía sync (la Casa Central lo escribe en la nube y ellas lo descargan).
export async function isProDevice(): Promise<boolean> {
  const appPlan = await getDeviceSetting("app_plan");
  const planType = await getDeviceSetting("plan_type");
  const unlockedPro = await getDeviceSetting("unlocked_plan_pro");
  const storageMode = await getDeviceSetting("storage_mode");
  return (
    appPlan === "pro" ||
    planType === "pro" ||
    unlockedPro === "true" ||
    storageMode === "seguro"
  );
}

export async function setPlanSettings(plan: "pro" | "basico"): Promise<void> {
  const isPro = plan === "pro";
  const entries: Record<string, string> = {
    app_plan: plan,
    plan_type: plan,
    unlocked_plan_pro: isPro ? "true" : "false",
    storage_mode: isPro ? "seguro" : "local",
  };
  await setDeviceSettings(entries);
}
