export interface AuthUser {
  id: string
  name: string
  username?: string
  email: string
  role: 'PROCUREMENT_OFFICER' | 'VIGILANCE_AUDITOR' | 'SYSTEM_ADMIN'
  department?: string
}
