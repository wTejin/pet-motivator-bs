<template>
  <div class="max-w-4xl mx-auto">
    <h2 class="text-2xl font-bold mb-6">评分配置</h2>

    <!-- Tabs -->
    <div class="flex gap-2 mb-6">
      <button
        :class="[
          'px-4 py-2 rounded-lg text-sm font-semibold transition-colors',
          activeTab === 'dimensions' ? 'bg-blue-600 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10',
        ]"
        @click="activeTab = 'dimensions'"
      >
        评分维度
      </button>
      <button
        :class="[
          'px-4 py-2 rounded-lg text-sm font-semibold transition-colors',
          activeTab === 'indicators' ? 'bg-blue-600 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10',
        ]"
        @click="activeTab = 'indicators'"
      >
        评分指标
      </button>
    </div>

    <!-- Dimensions Tab -->
    <div v-if="activeTab === 'dimensions'" class="space-y-4">
      <!-- Add Dimension Form -->
      <div class="bg-white/5 border border-white/10 rounded-xl p-4">
        <h3 class="text-sm font-semibold mb-3">{{ editingDim ? '编辑维度' : '添加维度' }}</h3>
        <div class="flex flex-col md:flex-row gap-3">
          <input
            v-model="dimForm.name"
            placeholder="维度名称"
            class="bg-white/5 border border-white/20 text-white rounded-lg px-3 py-2 flex-1 focus:border-blue-500 focus:outline-none placeholder:text-white/30"
          />
          <div class="flex gap-2">
            <select
              v-model="dimForm.icon"
              class="bg-white/5 border border-white/20 text-white rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none"
            >
              <option value="⚽">⚽ 足球</option>
              <option value="📚">📚 学习</option>
              <option value="🏃">🏃 体能</option>
              <option value="🤝">🤝 团队</option>
              <option value="🧠">🧠 战术</option>
              <option value="💪">💪 态度</option>
              <option value="🎯">🎯 技术</option>
              <option value="⭐">⭐ 其他</option>
            </select>
          </div>
          <input
            v-model.number="dimForm.sortOrder"
            type="number"
            placeholder="排序"
            class="bg-white/5 border border-white/20 text-white rounded-lg px-3 py-2 w-20 focus:border-blue-500 focus:outline-none placeholder:text-white/30"
          />
          <button
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
            @click="editingDim ? saveDimEdit() : addDimension()"
          >
            {{ editingDim ? '保存' : '添加' }}
          </button>
          <button
            v-if="editingDim"
            class="px-4 py-2 bg-white/10 text-white/60 rounded-lg hover:bg-white/20 transition-colors"
            @click="cancelDimEdit()"
          >
            取消
          </button>
        </div>
      </div>

      <!-- Dimension List -->
      <div class="space-y-3">
        <div
          v-for="dim in dimensions"
          :key="dim.id"
          class="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between"
        >
          <div class="flex items-center gap-3">
            <span class="text-2xl">{{ dim.icon }}</span>
            <div>
              <div class="font-semibold">{{ dim.name }}</div>
              <div class="text-xs text-white/40">排序: {{ dim.sortOrder }}</div>
            </div>
          </div>
          <div class="flex gap-2">
            <button
              class="px-3 py-1 text-sm bg-white/10 text-white/60 rounded-lg hover:bg-white/20 transition-colors"
              @click="selectDimForIndicators(dim)"
            >
              指标
            </button>
            <button
              class="px-3 py-1 text-sm bg-white/10 text-white/60 rounded-lg hover:bg-white/20 transition-colors"
              @click="startEditDim(dim)"
            >
              编辑
            </button>
            <button
              class="px-3 py-1 text-sm bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
              @click="deleteDimension(dim.id)"
            >
              删除
            </button>
          </div>
        </div>
        <div v-if="dimensions.length === 0" class="text-center text-white/40 py-8">暂无维度，请添加</div>
      </div>
    </div>

    <!-- Indicators Tab -->
    <div v-if="activeTab === 'indicators'" class="space-y-4">
      <!-- Dimension Selector for Indicators -->
      <div class="flex gap-2 flex-wrap">
        <button
          v-for="dim in dimensions"
          :key="dim.id"
          :class="[
            'px-4 py-2 rounded-lg text-sm transition-colors',
            selectedDimId === dim.id ? 'bg-blue-600 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10',
          ]"
          @click="selectDimForIndicators(dim)"
        >
          {{ dim.icon }} {{ dim.name }}
        </button>
      </div>

      <div v-if="selectedDimId" class="space-y-4">
        <!-- Add Indicator Form -->
        <div class="bg-white/5 border border-white/10 rounded-xl p-4">
          <h3 class="text-sm font-semibold mb-3">{{ editingInd ? '编辑指标' : '添加指标' }}</h3>
          <div class="grid grid-cols-1 md:grid-cols-5 gap-3">
            <input
              v-model="indForm.name"
              placeholder="指标名称"
              class="bg-white/5 border border-white/20 text-white rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none placeholder:text-white/30"
            />
            <input
              v-model="indForm.criteria"
              placeholder="评分标准"
              class="bg-white/5 border border-white/20 text-white rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none placeholder:text-white/30"
            />
            <input
              v-model.number="indForm.defaultPoints"
              type="number"
              placeholder="默认分值"
              class="bg-white/5 border border-white/20 text-white rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none placeholder:text-white/30"
            />
            <input
              v-model.number="indForm.dailyLimit"
              type="number"
              placeholder="每日上限"
              class="bg-white/5 border border-white/20 text-white rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none placeholder:text-white/30"
            />
            <div class="flex gap-2">
              <button
                class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors flex-1"
                @click="editingInd ? saveIndEdit() : addIndicator()"
              >
                {{ editingInd ? '保存' : '添加' }}
              </button>
              <button
                v-if="editingInd"
                class="px-4 py-2 bg-white/10 text-white/60 rounded-lg hover:bg-white/20 transition-colors"
                @click="cancelIndEdit()"
              >
                取消
              </button>
            </div>
          </div>
        </div>

        <!-- Indicator List -->
        <div class="space-y-2">
          <div
            v-for="ind in indicators"
            :key="ind.id"
            class="bg-white/5 border border-white/10 rounded-lg p-3 flex items-center justify-between"
          >
            <div class="flex-1">
              <div class="font-medium text-sm">{{ ind.name }}</div>
              <div class="flex gap-4 text-xs text-white/40 mt-1">
                <span>标准: {{ ind.criteria || '-' }}</span>
                <span class="text-yellow-400">+{{ ind.defaultPoints }}</span>
                <span>上限: {{ ind.dailyLimit }}/天</span>
              </div>
            </div>
            <div class="flex gap-2 ml-4">
              <button
                class="px-3 py-1 text-xs bg-white/10 text-white/60 rounded hover:bg-white/20 transition-colors"
                @click="startEditInd(ind)"
              >
                编辑
              </button>
              <button
                class="px-3 py-1 text-xs bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors"
                @click="deleteIndicator(ind.id)"
              >
                删除
              </button>
            </div>
          </div>
          <div v-if="indicators.length === 0" class="text-center text-white/40 py-4">暂无指标，请添加</div>
        </div>
      </div>
      <div v-else class="text-center text-white/40 py-8">请先选择一个维度</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { coachApi } from '@/api'

interface IndicatorItem {
  id: string
  dimensionId: string
  name: string
  criteria: string
  defaultPoints: number
  dailyLimit: number
  isActive: boolean
  sortOrder: number
}

interface DimensionItem {
  id: string
  name: string
  icon: string
  sortOrder: number
  indicators: IndicatorItem[]
}

const activeTab = ref<'dimensions' | 'indicators'>('dimensions')
const dimensions = ref<DimensionItem[]>([])
const selectedDimId = ref<string | null>(null)
const indicators = ref<IndicatorItem[]>([])
const editingDim = ref<DimensionItem | null>(null)
const editingInd = ref<IndicatorItem | null>(null)

const dimForm = ref({ name: '', icon: '⚽', sortOrder: 0 })
const indForm = ref({ name: '', criteria: '', defaultPoints: 5, dailyLimit: 20 })

onMounted(loadDimensions)

async function loadDimensions() {
  try {
    const res = await coachApi.getDimensions()
    dimensions.value = res.data.data || []
    if (selectedDimId.value) {
      const dim = dimensions.value.find((d: DimensionItem) => d.id === selectedDimId.value)
      if (dim) indicators.value = dim.indicators || []
      else selectedDimId.value = null
    }
  } catch (e) {
    console.error('Failed to load dimensions', e)
  }
}

async function addDimension() {
  if (!dimForm.value.name) return
  try {
    await coachApi.createDimension({ ...dimForm.value })
    dimForm.value = { name: '', icon: '⚽', sortOrder: 0 }
    await loadDimensions()
  } catch (e: any) {
    alert(e.response?.data?.error || '添加失败')
  }
}

function startEditDim(dim: DimensionItem) {
  editingDim.value = dim
  dimForm.value = { name: dim.name, icon: dim.icon, sortOrder: dim.sortOrder }
}

function cancelDimEdit() {
  editingDim.value = null
  dimForm.value = { name: '', icon: '⚽', sortOrder: 0 }
}

async function saveDimEdit() {
  if (!editingDim.value) return
  try {
    await coachApi.updateDimension(editingDim.value.id, { ...dimForm.value })
    editingDim.value = null
    dimForm.value = { name: '', icon: '⚽', sortOrder: 0 }
    await loadDimensions()
  } catch (e: any) {
    alert(e.response?.data?.error || '保存失败')
  }
}

async function deleteDimension(id: string) {
  if (!confirm('确认删除该维度？相关指标也会被删除。')) return
  try {
    await coachApi.deleteDimension(id)
    if (selectedDimId.value === id) {
      selectedDimId.value = null
      indicators.value = []
    }
    await loadDimensions()
  } catch (e: any) {
    alert(e.response?.data?.error || '删除失败')
  }
}

function selectDimForIndicators(dim: DimensionItem) {
  selectedDimId.value = dim.id
  indicators.value = dim.indicators || []
  activeTab.value = 'indicators'
}

async function addIndicator() {
  if (!selectedDimId.value || !indForm.value.name) return
  try {
    await coachApi.createIndicator({ dimensionId: selectedDimId.value, ...indForm.value })
    indForm.value = { name: '', criteria: '', defaultPoints: 5, dailyLimit: 20 }
    await loadDimensions()
  } catch (e: any) {
    alert(e.response?.data?.error || '添加失败')
  }
}

function startEditInd(ind: IndicatorItem) {
  editingInd.value = ind
  indForm.value = { name: ind.name, criteria: ind.criteria, defaultPoints: ind.defaultPoints, dailyLimit: ind.dailyLimit }
}

function cancelIndEdit() {
  editingInd.value = null
  indForm.value = { name: '', criteria: '', defaultPoints: 5, dailyLimit: 20 }
}

async function saveIndEdit() {
  if (!editingInd.value) return
  try {
    await coachApi.updateIndicator(editingInd.value.id, { ...indForm.value })
    editingInd.value = null
    indForm.value = { name: '', criteria: '', defaultPoints: 5, dailyLimit: 20 }
    await loadDimensions()
  } catch (e: any) {
    alert(e.response?.data?.error || '保存失败')
  }
}

async function deleteIndicator(id: string) {
  if (!confirm('确认删除该指标？')) return
  try {
    await coachApi.deleteIndicator(id)
    await loadDimensions()
  } catch (e: any) {
    alert(e.response?.data?.error || '删除失败')
  }
}
</script>
