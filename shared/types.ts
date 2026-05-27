// shared/types.ts

export type PetStage = 'egg' | 'baby' | 'teen' | 'adult' | 'rare'
export type PetCategory = 'dog' | 'cat' | 'dragon' | 'fantasy' | 'ocean' | 'cute'
export type ScoreType = 'earn' | 'spend' | 'bonus' | 'penalty' | 'system'
export type OperatorType = 'coach' | 'system'
export type ShopItemType = 'food' | 'decoration' | 'special'
export type AccessorySlotType = 'head' | 'neck' | 'body' | 'back' | 'face'
export type PlayerModeType = 'open' | 'display'

export interface PetStageVisual { emoji: string; imageUrl?: string; scale: number; animation: string; filter?: string; label: string }
export interface PetSpecies { id: string; name: string; category: PetCategory; description: string; emoji: string; backgroundColor: string; accentColor: string; stages: Record<PetStage, PetStageVisual> }
export interface AccessoryDef { id: string; name: string; slot: AccessorySlotType; emoji: string; imageUrl?: string; position: { top: string; left: string; scale: number; rotate?: number } }
export interface PetBackgroundDef { id: string; name: string; cssGradient: string; imageUrl?: string; thumbnailColor: string }

export interface Admin { id: string; username: string; passwordHash: string; createdAt: number }
export interface Coach { id: string; phone: string; passwordHash: string; name: string; school: string; isActive: boolean; trialUntil: number; authorizedUntil: number; playerMode: PlayerModeType; createdAt: number; updatedAt: number }
export interface Player { id: string; coachId: string; name: string; avatar: string; currentPoints: number; lifetimePoints: number; isActive: boolean; createdAt: number; updatedAt: number }
export interface Pet { id: string; playerId: string; speciesId: string; name: string; stage: PetStage; carePoints: number; level: number; hunger: number; mood: number; currentSkin: string; equippedDecorations: string[]; lastDecayAt: number; lastFedAt: number; lastPlayedAt: number; createdAt: number; evolvedAt: number }
export interface ScoreDimension { id: string; coachId: string; name: string; icon: string; sortOrder: number; isActive: boolean }
export interface ScoreIndicator { id: string; dimensionId: string; name: string; criteria: string; defaultPoints: number; dailyLimit: number; isActive: boolean; sortOrder: number }
export interface ScoreRecord { id: string; coachId: string; playerId: string; ruleId: string | null; indicatorId: string | null; sessionId: string | null; points: number; type: ScoreType; reason: string; operatorType: OperatorType; operatorId: string; createdAt: number }
export interface BonusRule { id: string; coachId: string; name: string; points: number; frequency: 'weekly' | 'monthly'; criteria: string; isActive: boolean }
export interface ShopItem { id: string; coachId: string | null; name: string; description: string; type: ShopItemType; price: number; effect: { hunger?: number; mood?: number; experience?: number; decoration?: string }; imageClass: string; stock: number; isActive: boolean; sortOrder: number; createdAt: number }
export interface PlayerInventory { id: string; playerId: string; itemId: string; quantity: number; isEquipped: boolean; acquiredAt: number }

export interface ApiResponse<T> { success: boolean; data?: T; message?: string; error?: string }
export interface LoginResponse { token: string; coach?: Omit<Coach, 'passwordHash'>; admin?: Omit<Admin, 'passwordHash'> }
export interface CoachRegisterInput { phone: string }
export interface CoachLoginInput { phone: string; password: string }
export interface AdminLoginInput { username: string; password: string }
export interface CreatePlayerInput { name: string; avatar: string }
export interface ScoreInput { playerId: string; indicatorId?: string | null; points: number; type: ScoreType; reason: string; sessionId?: string | null }
export interface CreateDimensionInput { name: string; icon: string; sortOrder?: number }
export interface CreateIndicatorInput { dimensionId: string; name: string; criteria: string; defaultPoints: number; dailyLimit: number; sortOrder?: number }
export interface PlayerStats { playerId: string; playerName: string; avatar: string; overall: number; dimensions: { dimensionId: string; dimensionName: string; icon: string; score: number; maxScore: number }[]; totalPoints: number; weeklyPoints: number; todayPoints: number; rank: number }
