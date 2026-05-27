import bcrypt from 'bcryptjs'
import jwt, { type SignOptions } from 'jsonwebtoken'
import { config } from '../config'

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function signToken(payload: { id: string; role: 'admin' | 'coach' }): string {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn } as SignOptions)
}

export function verifyToken(token: string): { id: string; role: 'admin' | 'coach' } | null {
  try {
    return jwt.verify(token, config.jwtSecret) as { id: string; role: 'admin' | 'coach' }
  } catch {
    return null
  }
}
