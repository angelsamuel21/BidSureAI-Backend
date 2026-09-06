import { PortalVerificationRecord } from '@/types'
import { GovernmentVerificationAdapter } from './types'

export class MCAAdapter implements GovernmentVerificationAdapter {
  portalName = 'MCA21' as const

  async verify(cinOrName: string, context?: { expectedLegalName?: string }): Promise<PortalVerificationRecord> {
    const cleanId = (cinOrName || '').trim().toUpperCase()
    const referenceId = `MCA21-SANDBOX-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`
    const timestamp = new Date().toISOString()

    const sandboxRegistry: Record<string, any> = {
      U28190UP2018PTC103948: {
        companyName: 'ABC Industries Pvt. Ltd.',
        rocCode: 'RoC-Kanpur',
        companyCategory: 'Company limited by Shares',
        companySubCategory: 'Non-govt company',
        classOfCompany: 'Private',
        authorizedCapitalCr: 5.0,
        paidUpCapitalCr: 2.5,
        dateOfIncorporation: '2018-04-12',
        companyStatus: 'ACTIVE',
        directors: ['Ramesh Sharma (DIN: 08123456)', 'Sunita Sharma (DIN: 08123457)'],
      },
      U28290MH2019LLP091823: {
        companyName: 'XYZ Enterprises',
        rocCode: 'RoC-Pune',
        companyCategory: 'Limited Liability Partnership',
        companySubCategory: 'LLP',
        classOfCompany: 'Private',
        authorizedCapitalCr: 3.0,
        paidUpCapitalCr: 1.8,
        dateOfIncorporation: '2019-08-15',
        companyStatus: 'ACTIVE',
        directors: ['Amitabh Verma (DPIN: 07891234)', 'Kavita Verma (DPIN: 07891235)'],
      },
    }

    const matched = sandboxRegistry[cleanId] || {
      companyName: context?.expectedLegalName || cleanId || 'Commercial Entity',
      rocCode: 'RoC-Delhi',
      companyCategory: 'Company limited by Shares',
      companySubCategory: 'Non-govt company',
      classOfCompany: 'Private',
      authorizedCapitalCr: 2.0,
      paidUpCapitalCr: 1.0,
      dateOfIncorporation: '2020-01-01',
      companyStatus: 'ACTIVE',
      directors: ['Director 1 (DIN: 09000001)'],
    }

    return {
      portal: 'MCA21',
      identifier: cleanId || 'MCA-ENTITY-DEFAULT',
      status: matched.companyStatus === 'ACTIVE' ? 'VERIFIED' : 'FAILED',
      source: 'Ministry of Corporate Affairs MCA21 Sandbox Gateway (External live verification unavailable)',
      checkedAt: timestamp,
      referenceId,
      isSandbox: true,
      verificationMethod: matched.companyStatus === 'ACTIVE' ? 'SANDBOX_VERIFIED' : 'FAILED',
      data: matched,
      rawSummary: `MCA21 record simulated in sandbox: Company Status is ${matched.companyStatus}. RoC Jurisdiction: ${matched.rocCode} (External live verification unavailable).`,
    }
  }
}
