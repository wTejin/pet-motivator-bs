import { ref, computed, watch, nextTick, type Ref } from 'vue'

export interface DateSelectOptions {
  yearRange: [number, number]
}

export function useDateSelect(modelValue: Ref<string>, options: DateSelectOptions) {
  const syncing = ref(false)

  const year = ref<number | null>(null)
  const month = ref<number | null>(null)
  const day = ref<number | null>(null)

  const [yearMin, yearMax] = options.yearRange
  const years = computed(() => {
    const list: number[] = []
    for (let y = yearMax; y >= yearMin; y--) list.push(y)
    return list
  })

  const daysInMonth = computed(() => {
    if (!year.value || !month.value) return 31
    return new Date(year.value, month.value, 0).getDate()
  })

  // modelValue → selects (e.g. editing an existing player)
  watch(
    () => modelValue.value,
    (val) => {
      if (syncing.value) return
      syncing.value = true
      if (val && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
        const parts = val.split('-')
        year.value = parseInt(parts[0])
        month.value = parseInt(parts[1])
        day.value = parseInt(parts[2])
      } else {
        year.value = null
        month.value = null
        day.value = null
      }
      nextTick(() => { syncing.value = false })
    },
    { immediate: true },
  )

  // selects → modelValue
  watch([year, month, day], () => {
    if (syncing.value) return
    syncing.value = true
    if (year.value != null && month.value != null && day.value != null) {
      modelValue.value = `${year.value}-${String(month.value).padStart(2, '0')}-${String(day.value).padStart(2, '0')}`
    }
    nextTick(() => { syncing.value = false })
  })

  // Clamp day when month changes (e.g. Jan 31 → Feb 28)
  watch(daysInMonth, (max) => {
    if (day.value && day.value > max) {
      day.value = max
    }
  })

  return { year, month, day, years, daysInMonth }
}
