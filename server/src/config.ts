export const config = {
  port: parseInt(process.env.PORT || '3000'),
  jwtSecret: process.env.JWT_SECRET || 'pet-motivator-jwt-secret-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  superAdminUsername: process.env.SUPER_ADMIN_USERNAME || 'admin',
  superAdminPassword: process.env.SUPER_ADMIN_PASSWORD || 'admin123',
  trialDays: 7,
  defaultPasswordDigits: 6,
}

export function getDefaultPassword(phone: string): string {
  return phone.slice(-config.defaultPasswordDigits)
}
