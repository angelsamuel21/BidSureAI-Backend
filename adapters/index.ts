import { GSTNAdapter } from './gstn'
import { PANAdapter } from './pan'
import { UdyamAdapter } from './udyam'
import { MCAAdapter } from './mca21'
import { DebarmentAdapter } from './debarment'
import { MakeInIndiaAdapter } from './mii'
import { PortalVerificationRecord } from '@/types'

import { MLServiceAdapter, mlServiceAdapter } from './mlServiceAdapter'

export { GSTNAdapter, PANAdapter, UdyamAdapter, MCAAdapter, DebarmentAdapter, MakeInIndiaAdapter, MLServiceAdapter, mlServiceAdapter }

export class GovernmentSandboxGateway {
  private gstAdapter = new GSTNAdapter()
  private panAdapter = new PANAdapter()
  private udyamAdapter = new UdyamAdapter()
  private mcaAdapter = new MCAAdapter()
  private debarmentAdapter = new DebarmentAdapter()
  private miiAdapter = new MakeInIndiaAdapter()

  async verifyAll(params: {
    legalName: string
    gstin?: string
    pan?: string
    udyamNumber?: string
    cin?: string
    claimedLocalContentPercent?: number
    oemLocalContentPercent?: number
    minLocalContentPercent?: number
  }): Promise<Record<string, PortalVerificationRecord>> {
    const results: Record<string, PortalVerificationRecord> = {}

    // 1. Debarment Check (Highest Priority)
    results.debarment = await this.debarmentAdapter.verify(params.legalName)

    // 2. GSTN Verification
    if (params.gstin) {
      results.gst = await this.gstAdapter.verify(params.gstin, { expectedLegalName: params.legalName })
    }

    // 3. PAN Verification
    if (params.pan) {
      results.pan = await this.panAdapter.verify(params.pan, {
        expectedLegalName: params.legalName,
        linkedGstin: params.gstin,
      })
    }

    // 4. Udyam Verification
    if (params.udyamNumber) {
      results.udyam = await this.udyamAdapter.verify(params.udyamNumber, { expectedLegalName: params.legalName })
    }

    // 5. MCA Verification
    if (params.cin) {
      results.mca = await this.mcaAdapter.verify(params.cin, { expectedLegalName: params.legalName })
    }

    // 6. Make in India Local Content Verification
    if (params.claimedLocalContentPercent !== undefined) {
      results.mii = await this.miiAdapter.verify(params.claimedLocalContentPercent.toString(), {
        minRequiredPercent: params.minLocalContentPercent ?? 50,
        oemDeclaredPercent: params.oemLocalContentPercent,
      })
    }

    return results
  }
}

export const sandboxGateway = new GovernmentSandboxGateway()
export default sandboxGateway
