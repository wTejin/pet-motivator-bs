// shared/types.ts

export type PetStage = 'egg' | 'level1' | 'level2' | 'level3' | 'rare'
export type PetCategory = 'dog' | 'cat' | 'dragon' | 'fantasy' | 'ocean' | 'cute'
export type ScoreType = 'earn' | 'spend' | 'bonus' | 'penalty' | 'system'
export type OperatorType = 'coach' | 'system'
export type ShopItemType = 'food' | 'accessory' | 'background' | 'toy' | 'special' | 'badge'
export type ShopItemUsageType = 'consume' | 'equip' | 'rent' | 'charge' | 'replace'
export type AccessorySlotType = 'head' | 'neck' | 'body' | 'back' | 'face'
export type PlayerModeType = 'open' | 'display'

export interface PetStageVisual { emoji: string; imageUrl?: string; scale: number; animation: string; filter?: string; label: string }
export interface PetSpecies { id: string; name: string; category: PetCategory; description: string; emoji: string; backgroundColor: string; accentColor: string; stages: Record<PetStage, PetStageVisual> }
export interface AccessoryDef { id: string; name: string; slot: AccessorySlotType; emoji: string; imageUrl?: string; position: { top: string; left: string; scale: number; rotate?: number } }
export interface PetBackgroundDef { id: string; name: string; cssGradient: string; imageUrl?: string; thumbnailColor: string }

export interface Admin { id: string; username: string; passwordHash: string; createdAt: number }
export interface Coach { id: string; phone: string; passwordHash: string; name: string; school: string; isActive: boolean; trialUntil: number; authorizedUntil: number; playerMode: PlayerModeType; createdAt: number; updatedAt: number }
export interface Player { id: string; coachId: string; name: string; avatar: string; age?: number | null; gender?: string | null; currentPoints: number; isActive: boolean; createdAt: number; updatedAt: number }
export interface Pet { id: string; playerId: string; speciesId: string; name: string; stage: PetStage; carePoints: number; level: number; hunger: number; mood: number; currentSkin: string; equippedDecorations: string[]; lastDecayAt: number; lastFedAt: number; lastPlayedAt: number; createdAt: number; evolvedAt: number }
export interface ScoreRecord { id: string; coachId: string; playerId: string; ruleId: string | null; indicatorId: string | null; points: number; type: ScoreType; reason: string; operatorType: OperatorType; operatorId: string; createdAt: number }
export interface ShopItem { id: string; coachId: string | null; name: string; description: string; type: ShopItemType; usageType: ShopItemUsageType; usageCount: number | null; price: number; effect: { hunger?: number; mood?: number; experience?: number; decoration?: string; backgroundId?: string; badgeSvg?: string }; imageClass: string; stock: number; isActive: boolean; isLuckyDrop?: boolean; rarity?: string; sortOrder: number; createdAt: number }
export interface PlayerInventory { id: string; playerId: string; itemId: string; quantity: number; isEquipped: boolean; acquiredAt: number; expiresAt?: number; lastUnequippedAt?: number }

export interface ApiResponse<T> { success: boolean; data?: T; message?: string; error?: string }
export interface LoginResponse { token: string; coach?: Omit<Coach, 'passwordHash'>; admin?: Omit<Admin, 'passwordHash'> }
export interface CoachRegisterInput { phone: string }
export interface CoachLoginInput { phone: string; password: string }
export interface AdminLoginInput { username: string; password: string }
export interface CreatePlayerInput { name: string; avatar: string }
export interface ScoreInput { playerId: string; indicatorId?: string | null; points: number; type: ScoreType; reason: string }
export interface PlayerStats {
  playerId: string; playerName: string; avatar: string; age: number | null; overall: number
  dimensions: {
    dimensionId: string; dimensionName: string; icon: string; score: number; maxScore: number
    indicators: { indicatorId: string; indicatorName: string; score: number }[]
  }[]
  totalPoints: number; weeklyPoints: number; todayPoints: number; rank: number
}

// ═══════════════════════════════════════════════════════════
// Bio-Leap 评估引擎类型（从 bio-leap 移植）
// ═══════════════════════════════════════════════════════════

export type MaturityCategory = 'early' | 'on_time' | 'late'
export type EnvCategory = 'high_pressure' | 'normal' | 'perfect_family'
export type CoachAlertType = 'biometrics_overdue' | 'assessment_incomplete' | 'physical_test_overdue'
export type PotentialTier = 'elite' | 'development' | 'role' | 'eliminate' | 'insufficient_data'

// ── Bio-Leap 实体类型 ──

export interface BioLeapPlayerBiometric {
  id: string
  playerId: string
  coachId: string
  heightCm: number
  weightKg: number
  sittingHeightCm: number
  measuredAt: number
}

export interface BioLeapDailyAssessment {
  id: string
  coachId: string
  playerId: string
  sessionId: string | null
  spatialIq: number
  techExec: number
  engagement: number
  resilience: number
  altruism: number
  envNoise: number
  notes: string | null
  createdAt: number
  subScanRate?: number | null
  subDecisionSpeed?: number | null
  subOffBallMove?: number | null
  subRecoveryReact?: number | null
  subReengageDef?: number | null
  subConfToReceive?: number | null
  subCommunication?: number | null
  subCoverTeam?: number | null
  subUnfamiliarPos?: number | null
  subParentBehavior?: number | null
  subAttendance?: number | null
  subSelfSufficient?: number | null
}

export interface BioLeapPhysicalTest {
  id: string
  playerId: string
  coachId: string
  sprint10m: number | null
  sprint30m: number | null
  verticalJump: number | null
  firstTouch: number | null
  weakFoot: number | null
  shootingPower: number | null
  workRate: number | null
  agility: number | null
  endurance: number | null
  passingAccuracy: number | null
  measuredAt: number
  notes: string | null
}

// ── 输入类型 ──

export interface BiometricsInput {
  playerId: string
  heightCm: number
  weightKg: number
  sittingHeightCm: number
  measuredAt?: number
}

export interface AssessmentInput {
  playerId: string
  sessionId?: string | null
  spatialIq: number
  techExec: number
  engagement: number
  resilience: number
  altruism: number
  envNoise: number
  notes?: string | null
  subScanRate?: number | null
  subDecisionSpeed?: number | null
  subOffBallMove?: number | null
  subRecoveryReact?: number | null
  subReengageDef?: number | null
  subConfToReceive?: number | null
  subCommunication?: number | null
  subCoverTeam?: number | null
  subUnfamiliarPos?: number | null
  subParentBehavior?: number | null
  subAttendance?: number | null
  subSelfSufficient?: number | null
}

export interface PhysicalTestInput {
  playerId: string
  sprint10m?: number | null
  sprint30m?: number | null
  verticalJump?: number | null
  firstTouch?: number | null
  weakFoot?: number | null
  shootingPower?: number | null
  workRate?: number | null
  agility?: number | null
  endurance?: number | null
  passingAccuracy?: number | null
  measuredAt?: number
  notes?: string | null
}

// ── Pipeline 类型 ──

export interface PipelineDimensionResult {
  raw: number
  ema: number
  expectedScore: number
  correctionFactor: number
  maturityCorrected: number
  final: number
}

export interface PipelineSnapshotData {
  id: string
  playerId: string
  overall: number
  potentialIndex: number
  potentialTier: string
  dimensionJson: Record<string, PipelineDimensionResult>
  maturityOffset: number
  maturityCategory: MaturityCategory
  envCategory: EnvCategory
  envNoiseEma30d: number
  hedgingActive: boolean
  hedgingMultiplier: number
  computedAt: number
}

export interface BioLeapPlayerStats {
  playerId: string
  playerName: string
  avatar: string
  age: number | null
  overall: number
  potentialIndex: number
  potentialTier: string
  dimensions: {
    dimensionKey: string
    dimensionName: string
    icon: string
    score: number
    maxScore: number
  }[]
  maturityCategory: MaturityCategory
  envCategory: EnvCategory
  hedgingActive: boolean
  trainingYears: number | null
  totalPoints: number
  weeklyPoints: number
  todayPoints: number
  rank: number
}

// ── 维度元数据 ──

export interface DimensionMeta {
  key: string
  name: string
  icon: string
  description: string
}

export const BIO_LEAP_DIMENSIONS: DimensionMeta[] = [
  { key: 'spatialIq',  name: '空间觉察',  icon: '🧠', description: '球商芯片：观察场上局势、提前预判的能力' },
  { key: 'techExec',   name: '技术执行',  icon: '⚽', description: '抗压熟练度：高强度对抗下的技术完成质量' },
  { key: 'engagement', name: '执行饱和度', icon: '💪', description: '努力与坚持：训练的投入程度和持续性' },
  { key: 'resilience', name: '挫折复原力', icon: '🛡️', description: '抗挫折韧性：失误/落后后的恢复能力' },
  { key: 'altruism',   name: '无私协作性', icon: '🤝', description: '团队与利他：为团队贡献和配合的意愿' },
  { key: 'envNoise',   name: '环境抗噪度', icon: '🏠', description: '家长生态健康：家庭环境对训练的干扰程度' },
]

export interface SubIndicatorMeta {
  key: string
  name: string
  description: string
}

export interface DimensionSubIndicators {
  dimKey: string
  subs: SubIndicatorMeta[]
}

export const BIO_LEAP_SUB_INDICATORS: DimensionSubIndicators[] = [
  {
    dimKey: 'spatialIq',
    subs: [
      { key: 'subScanRate',      name: '视觉扫描频率', description: '无球时/接球前3-5秒内扭头观察身后和两侧的次数' },
      { key: 'subDecisionSpeed', name: '决策速度',     description: '接球前是否已想好下一步，受压下的出球选择质量' },
      { key: 'subOffBallMove',   name: '无球跑位',     description: '拉扯防线、攻防转换回撤、阵型保持的意识' },
    ],
  },
  {
    dimKey: 'resilience',
    subs: [
      { key: 'subRecoveryReact', name: '失误即时回追', description: '动作一：失误丢球后立刻高强度回追还是摊手抱怨' },
      { key: 'subReengageDef',   name: '防守对抗恢复', description: '动作二：下一次面对突破时保持合理防守距离还是鲁莽犯规' },
      { key: 'subConfToReceive', name: '再接球意愿',   description: '动作三：再次要球时敢于接球并提前扫视，还是退缩躲球' },
    ],
  },
  {
    dimKey: 'altruism',
    subs: [
      { key: 'subCommunication', name: '沟通指挥',     description: '通过言语和肢体指挥队友的频率和积极性' },
      { key: 'subCoverTeam',     name: '补位协防',     description: '队友失位时主动补位的意愿和到位率' },
      { key: 'subUnfamiliarPos', name: '不熟悉位置',   description: '被安排到不熟悉位置时的利他态度和执行质量' },
    ],
  },
  {
    dimKey: 'envNoise',
    subs: [
      { key: 'subParentBehavior', name: '家长场边行为', description: '家长在场边是施压还是鼓励 (FA 社会生态指标)' },
      { key: 'subAttendance',     name: '训练出勤',    description: '出勤率与迟到早退频率' },
      { key: 'subSelfSufficient', name: '装备自理',    description: '是否能独立管理装备、按时准备训练' },
    ],
  },
]

export const PHYSICAL_TEST_INDICATORS = {
  speed: [
    { key: 'sprint10m',    name: '0-10m 启动', unit: '秒', description: '0-10 米加速时间，反映起步爆发力' },
    { key: 'sprint30m',    name: '10-30m 冲刺', unit: '秒', description: '10-30 米分段冲刺时间，反映绝对速度' },
    { key: 'verticalJump', name: '垂直弹跳',    unit: 'cm', description: '原地纵跳摸高，反映下肢爆发力' },
    { key: 'agility',      name: '敏捷性',      unit: '秒', description: 'Illinois/505 变向测试时间，反映多方向移动能力' },
    { key: 'endurance',    name: '耐力',        unit: '级', description: 'Yo-Yo IR1 折返跑级别，反映有氧耐力' },
  ],
  technique: [
    { key: 'firstTouch',       name: '第一脚触球',   unit: '1-5', description: '接球瞬间定向领球到传跑空间，控球紧贴身体' },
    { key: 'weakFoot',         name: '非惯用脚',     unit: '1-5', description: '非惯用脚传接球的协调度与精度' },
    { key: 'shootingPower',    name: '射门力量精度', unit: '1-5', description: '原地与跑动中射门控制力，击球部位准确性' },
    { key: 'passingAccuracy',  name: '传球精度',     unit: '1-5', description: '短传与长传的落点控制与时机选择' },
  ],
  workRate: [
    { key: 'workRate', name: '跑动覆盖', unit: '1-5', description: '训练与比赛中的持续跑动能力和投入度' },
  ],
} as const
