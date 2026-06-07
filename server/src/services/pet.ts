// ── 宠物进化公共函数 ──
// player.ts / assessment.ts / pipeline.ts 共用

/** carePoints → stage 映射 */
export function getStageByCarePoints(carePoints: number): string {
  if (carePoints >= 1000) return 'rare'
  if (carePoints >= 600) return 'level3'
  if (carePoints >= 300) return 'level2'
  if (carePoints >= 100) return 'level1'
  return 'egg'
}

/** stage → level 映射 */
export const STAGE_TO_LEVEL: Record<string, number> = {
  egg: 1, level1: 2, level2: 3, level3: 4, rare: 5,
  baby: 2, teen: 3, adult: 4, // 兼容旧 stage 命名
}

/** 同步 pet.level 与 stage */
export function syncLevelWithStage(pet: { stage: string; level: number }, stage?: string) {
  const s = stage ?? pet.stage
  pet.level = STAGE_TO_LEVEL[s] ?? pet.level ?? 1
}

/** carePoints 增量更新 + 进化检查，返回可直接展开到 Prisma update data 的字段 */
export function applyCarePoints(
  pet: { stage: string; hunger: number; mood: number; carePoints: number; level: number },
  bonus: number,
  now: bigint = BigInt(Date.now()),
): { carePoints: number; stage?: string; level?: number; evolvedAt?: bigint } {
  const carePoints = Math.min(1000, pet.carePoints + bonus)
  const newStage = getStageByCarePoints(carePoints)
  const shouldEvolve = newStage !== pet.stage && pet.hunger >= 50 && pet.mood >= 50
  if (!shouldEvolve) return { carePoints }
  pet.level = STAGE_TO_LEVEL[newStage] ?? pet.level ?? 1
  return { carePoints, stage: newStage, level: pet.level, evolvedAt: now }
}

