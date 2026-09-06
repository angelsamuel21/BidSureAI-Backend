import { PortalVerificationRecord } from '@/types'

export interface GovernmentVerificationAdapter {
  portalName: 'GSTN' | 'PAN' | 'UDYAM' | 'MCA21' | 'DEBARMENT' | 'MII' | 'EPFO'
  verify(identifier: string, context?: Record<string, any>): Promise<PortalVerificationRecord>
}
