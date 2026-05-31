import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function main() {
  const species = await db.petSpeciesDef.findMany()
  let updated = 0

  for (const s of species) {
    const stages = s.stages as Record<string, any>
    if (!stages) continue

    const needsUpdate = 'baby' in stages || 'teen' in stages || 'adult' in stages
    if (!needsUpdate) {
      console.log(`Skipping ${s.id} (already up-to-date)`)
      continue
    }

    const newStages = { ...stages }
    if (stages.baby) {
      newStages.level1 = stages.baby
      delete newStages.baby
    }
    if (stages.teen) {
      newStages.level2 = stages.teen
      delete newStages.teen
    }
    if (stages.adult) {
      newStages.level3 = stages.adult
      delete newStages.adult
    }

    await db.petSpeciesDef.update({
      where: { id: s.id },
      data: { stages: newStages },
    })
    updated++
    console.log(`Updated ${s.id}: baby→level1, teen→level2, adult→level3`)
  }

  console.log(`\nDone. Updated ${updated} species.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
