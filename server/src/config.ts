export const config = {
  port: parseInt(process.env.PORT || '3000'),
  jwtSecret: process.env.JWT_SECRET || 'pet-motivator-jwt-secret-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  superAdminUsername: process.env.SUPER_ADMIN_USERNAME || 'admin',
  superAdminPassword: process.env.SUPER_ADMIN_PASSWORD || 'admin123',
  defaultPasswordDigits: 6,
  biometricsMaxAgeDays: 90,  // Bio-Leap: 体测过期天数
  physicalTestMaxAgeDays: 60, // Bio-Leap: 运动表现体测过期天数
}

export function getDefaultPassword(phone: string): string {
  return phone.slice(-config.defaultPasswordDigits)
}
