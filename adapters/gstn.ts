import { PortalVerificationRecord } from '@/types'
import { GovernmentVerificationAdapter } from './types'

export class GSTNAdapter implements GovernmentVerificationAdapter {
  portalName = 'GSTN' as const

  async verify(gstin: string, context?: { expectedLegalName?: string }): Promise<PortalVerificationRecord> {
    const cleanGstin = (gstin || '').trim().toUpperCase()
    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/
    const isValidFormat = gstinRegex.test(cleanGstin)

    const referenceId = `GSTN-SANDBOX-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`
    const timestamp = new Date().toISOString()

    if (!cleanGstin || !isValidFormat) {
      return {
        portal: 'GSTN',
        identifier: cleanGstin || 'EMPTY',
        status: 'FAILED',
        source: 'GSTN Syntax Validator (Local Regex)',
        checkedAt: timestamp,
        referenceId,
        isSandbox: true,
        verificationMethod: 'FAILED',
        data: {
          validFormat: false,
          error: 'Invalid GSTIN format. Expected 15-character alphanumeric format: 2-digit state code + 10-digit PAN + entity code + Z + checksum.',
        },
        rawSummary: 'GSTIN format validation failed due to malformed syntax.',
      }
    }

    // Sandbox Database Profile Lookups
    const sandboxRegistry: Record<string, any> = {
      '09ABCDE1234F1Z5': {
        legalName: 'ABC Industries Pvt. Ltd.',
        tradeName: 'ABC Industries',
        status: 'Active',
        taxpayerType: 'Regular',
        registrationDate: '2018-04-12',
        stateJurisdiction: 'Uttar Pradesh (State Code 09)',
        lastGstr3bFiling: '2026-07-20 (Compliant)',
        einvoiceEnabled: true,
      },
      '27AAACB1234P1Z8': {
        legalName: 'XYZ Enterprises',
        tradeName: 'XYZ Enterprises',
        status: 'Active',
        taxpayerType: 'Regular',
        registrationDate: '2019-08-15',
        stateJurisdiction: 'Maharashtra (State Code 27)',
        lastGstr3bFiling: '2026-07-18 (Compliant)',
        einvoiceEnabled: true,
      },
      '07AAAAA0000A1Z9': {
        legalName: 'PQR Technologies',
        tradeName: 'PQR Technologies',
        status: 'Active',
        taxpayerType: 'Regular',
        registrationDate: '2015-02-10',
        stateJurisdiction: 'Delhi (State Code 07)',
        lastGstr3bFiling: '2026-06-15 (Delayed)',
        einvoiceEnabled: false,
      },
    }

    const matchedRecord = sandboxRegistry[cleanGstin] || {
      legalName: context?.expectedLegalName || 'Enterprise Registered Entity',
      tradeName: context?.expectedLegalName || 'Commercial Entity',
      status: 'Active',
      taxpayerType: 'Regular',
      registrationDate: '2021-01-01',
      stateJurisdiction: `State Code ${cleanGstin.substring(0, 2)}`,
      lastGstr3bFiling: '2026-07-10 (Compliant)',
      einvoiceEnabled: true,
    }

    // Check name alignment if expectedLegalName is provided
    let nameAlignment = true
    if (context?.expectedLegalName) {
      const exp = context.expectedLegalName.toLowerCase().replace(/[^a-z0-9]/g, '')
      const act = matchedRecord.legalName.toLowerCase().replace(/[^a-z0-9]/g, '')
      nameAlignment = exp.includes(act) || act.includes(exp)
    }

    return {
      portal: 'GSTN',
      identifier: cleanGstin,
      status: nameAlignment && matchedRecord.status === 'Active' ? 'VERIFIED' : 'WARNING',
      source: 'GSTN Sandbox Simulation (External live verification unavailable)',
      checkedAt: timestamp,
      referenceId,
      isSandbox: true,
      verificationMethod: 'SANDBOX_VERIFIED',
      data: {
        ...matchedRecord,
        nameMatchWithBid: nameAlignment,
      },
      rawSummary: `GSTIN ${cleanGstin} format is valid. Active taxpayer status simulated locally for "${matchedRecord.legalName}" (External live verification unavailable).`,
    }
  }
}
