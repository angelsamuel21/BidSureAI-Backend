import { PortalVerificationRecord } from '@/types'
import { GovernmentVerificationAdapter } from './types'

export class PANAdapter implements GovernmentVerificationAdapter {
  portalName = 'PAN' as const

  async verify(pan: string, context?: { expectedLegalName?: string; linkedGstin?: string }): Promise<PortalVerificationRecord> {
    const cleanPan = (pan || '').trim().toUpperCase()
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/
    const isValidFormat = panRegex.test(cleanPan)

    const referenceId = `ITD-NSDL-SANDBOX-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`
    const timestamp = new Date().toISOString()

    if (!cleanPan || !isValidFormat) {
      return {
        portal: 'PAN',
        identifier: cleanPan || 'EMPTY',
        status: 'FAILED',
        source: 'Income Tax Department Syntax Validator (Local Regex)',
        checkedAt: timestamp,
        referenceId,
        isSandbox: true,
        verificationMethod: 'FAILED',
        data: {
          validFormat: false,
          error: 'Invalid PAN format. Standard format: 5 uppercase letters + 4 digits + 1 uppercase letter.',
        },
        rawSummary: 'PAN format validation failed.',
      }
    }

    // 4th Character checks
    const entityTypeChar = cleanPan[3]
    const entityTypeMap: Record<string, string> = {
      C: 'Company',
      P: 'Individual / Proprietor',
      H: 'Hindu Undivided Family (HUF)',
      F: 'Partnership Firm / LLP',
      A: 'Association of Persons (AOP)',
      T: 'Trust',
      B: 'Body of Individuals (BOI)',
      L: 'Local Authority',
      J: 'Artificial Juridical Person',
      G: 'Government Agency',
    }

    // Cross-check: If GSTIN provided, characters 3-12 of GSTIN must match PAN!
    let gstinPanConsistency = true
    if (context?.linkedGstin && context.linkedGstin.length >= 12) {
      const gstinPanPart = context.linkedGstin.substring(2, 12)
      if (gstinPanPart !== cleanPan) {
        gstinPanConsistency = false
      }
    }

    const sandboxRegistry: Record<string, any> = {
      ABCDE1234F: {
        legalName: 'ABC Industries Pvt. Ltd.',
        status: 'Operative & Valid',
        aadhaarSeedingStatus: 'Not Applicable (Company)',
        itrFilingStatus: 'AY 2025-26 Filed on 28-Oct-2025',
        form26ASVerified: true,
      },
      AAACB1234P: {
        legalName: 'XYZ Enterprises',
        status: 'Operative & Valid',
        aadhaarSeedingStatus: 'Not Applicable (LLP)',
        itrFilingStatus: 'AY 2025-26 Filed on 15-Nov-2025',
        form26ASVerified: true,
      },
      AAAAA0000A: {
        legalName: 'PQR Technologies',
        status: 'Operative & Valid',
        aadhaarSeedingStatus: 'Not Applicable (Company)',
        itrFilingStatus: 'AY 2024-25 Filed (AY 2025-26 Overdue)',
        form26ASVerified: false,
      },
    }

    const matchedRecord = sandboxRegistry[cleanPan] || {
      legalName: context?.expectedLegalName || 'Registered Taxpayer',
      status: 'Operative & Valid',
      aadhaarSeedingStatus: 'Not Applicable',
      itrFilingStatus: 'AY 2025-26 Filed',
      form26ASVerified: true,
    }

    const isSuccess = isValidFormat && gstinPanConsistency

    return {
      portal: 'PAN',
      identifier: cleanPan,
      status: isSuccess ? 'VERIFIED' : 'FAILED',
      source: 'PAN Local Validation & Sandbox (External live verification unavailable)',
      checkedAt: timestamp,
      referenceId,
      isSandbox: true,
      verificationMethod: isSuccess ? (context?.linkedGstin ? 'CROSS_VALIDATED' : 'SANDBOX_VERIFIED') : 'FAILED',
      data: {
        ...matchedRecord,
        entityType: entityTypeMap[entityTypeChar] || 'Corporate Body',
        gstinPanConsistency,
      },
      rawSummary: gstinPanConsistency
        ? `PAN ${cleanPan} format is valid and cross-consistent with GSTIN. Operative status simulated locally for "${matchedRecord.legalName}" (External live verification unavailable).`
        : `CRITICAL MISMATCH: PAN ${cleanPan} does not match the embedded PAN inside claimed GSTIN ${context?.linkedGstin}.`,
    }
  }
}
