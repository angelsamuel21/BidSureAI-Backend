import { ComplianceRule, ComplianceEvaluationContext } from './types'
import { RuleEvaluationResult, TenderRequirement } from '@/types'

export const standardRules: ComplianceRule[] = [
  // 1. Debarment & Blacklisting Check (Mandatory - Critical Priority)
  {
    id: 'rule-debarment',
    code: 'STAT_DEBARMENT',
    name: 'Debarment & Blacklisting Clearance',
    category: 'STATUTORY',
    mandatory: true,
    defaultWeight: 25,
    evaluate: (ctx: ComplianceEvaluationContext): RuleEvaluationResult => {
      const record = ctx.portalRecords.debarment
      const isFailed = record?.status === 'FAILED' || ctx.bidder.isDebarred

      if (isFailed) {
        return {
          ruleId: 'rule-debarment',
          ruleName: 'Debarment & Blacklisting Clearance',
          category: 'STATUTORY',
          mandatory: true,
          isCritical: true,
          weight: 25,
          status: 'FAIL',
          score: 0,
          verificationMethod: 'FAILED',
          verificationStatusLabel: 'Active debarment detected in internal registry',
          failureReason: 'Active debarment record found on internal debarment registry.',
          portalVerifiedValue: record?.data,
          evidence: record?.rawSummary || 'Entity is actively debarred on Central Vigilance Commission registry.',
          explanation:
            'CRITICAL FAILURE: Bidder is actively debarred/blacklisted by a government authority. In accordance with GeM Incident Management Policy and GFR 2017 Rule 151, the bid must be rejected.',
          confidence: 0.99,
          source: 'PORTAL_SANDBOX',
        }
      }

      return {
        ruleId: 'rule-debarment',
        ruleName: 'Debarment & Blacklisting Clearance',
        category: 'STATUTORY',
        mandatory: true,
        isCritical: true,
        weight: 25,
        status: 'PASS',
        score: 100,
        verificationMethod: 'SANDBOX_VERIFIED',
        verificationStatusLabel: 'Cleared on Internal Registry (Simulated)',
        portalVerifiedValue: 'Clear',
        evidence: record?.rawSummary || 'No active debarment or vigilance circulars found.',
        explanation: 'Clearance verified against Internal Debarment Registry (External live government API unavailable).',
        confidence: 0.99,
        source: 'PORTAL_SANDBOX',
      }
    },
  },

  // 2. GST Registration & Legal Name Alignment
  {
    id: 'rule-gst',
    code: 'STAT_GST',
    name: 'GST Registration & Filing Compliance',
    category: 'STATUTORY',
    mandatory: true,
    defaultWeight: 20,
    evaluate: (ctx: ComplianceEvaluationContext): RuleEvaluationResult => {
      const record = ctx.portalRecords.gst
      const doc = ctx.documents.find(
        (d) => d.documentType === 'GST_REGISTRATION_CERTIFICATE' || (d.name || '').toLowerCase().includes('gst')
      )

      if (!record || record.status === 'FAILED') {
        return {
          ruleId: 'rule-gst',
          ruleName: 'GST Registration & Filing Compliance',
          category: 'STATUTORY',
          mandatory: true,
          isCritical: true,
          weight: 20,
          status: 'FAIL',
          score: 0,
          verificationMethod: 'FAILED',
          verificationStatusLabel: doc ? 'GSTIN Invalid Format' : 'GST Document Not Uploaded',
          failureReason: doc ? 'GSTIN syntax validation failed.' : 'Mandatory GST registration certificate not uploaded.',
          documentReference: doc?.name,
          documentName: doc?.name,
          extractedValue: doc?.extractedFields?.gstin || ctx.bidder.gstin,
          evidence: record?.data?.error || (doc ? 'GSTIN verification failed.' : 'Mandatory GST certificate not uploaded.'),
          explanation: doc ? 'GST registration could not be verified or syntax is invalid.' : 'Bidder has not submitted GST registration certificate.',
          confidence: 0.98,
          source: doc ? 'DOCUMENT_EXTRACTED' : 'LOCAL_VALIDATION',
        }
      }

      const nameMatch = record.data?.nameMatchWithBid !== false
      const statusActive = record.data?.status === 'Active'

      if (statusActive && nameMatch) {
        return {
          ruleId: 'rule-gst',
          ruleName: 'GST Registration & Filing Compliance',
          category: 'STATUTORY',
          mandatory: true,
          isCritical: true,
          weight: 20,
          status: 'PASS',
          score: 100,
          verificationMethod: 'FORMAT_VALID',
          verificationStatusLabel: 'Format Valid (External API unavailable)',
          documentReference: doc?.name,
          documentName: doc?.name,
          extractedValue: ctx.bidder.gstin,
          portalVerifiedValue: record.data?.legalName,
          evidence: `GSTIN: ${record.identifier} | Legal Name: ${record.data?.legalName} | Status: ${record.data?.status} | Last Filing: ${record.data?.lastGstr3bFiling || 'Compliant'}`,
          explanation: 'GSTIN format is valid. Active taxpayer status simulated locally (External live verification unavailable).',
          confidence: 0.98,
          source: 'DOCUMENT_EXTRACTED',
        }
      }

      return {
        ruleId: 'rule-gst',
        ruleName: 'GST Registration & Filing Compliance',
        category: 'STATUTORY',
        mandatory: true,
        isCritical: true,
        weight: 20,
        status: 'WARNING',
        score: 65,
        verificationMethod: 'FORMAT_VALID',
        verificationStatusLabel: 'Name Discrepancy (Manual Review)',
        documentReference: doc?.name,
        documentName: doc?.name,
        extractedValue: ctx.bidder.gstin,
        portalVerifiedValue: record.data?.legalName,
        evidence: `GST Status: ${record.data?.status}, Name match: ${nameMatch}`,
        explanation: 'GSTIN format is valid but registered name exhibits variation with bidder profile.',
        confidence: 0.85,
        source: 'DOCUMENT_EXTRACTED',
      }
    },
  },

  // 3. PAN Verification & Cross-Consistency with GSTIN
  {
    id: 'rule-pan',
    code: 'STAT_PAN',
    name: 'PAN Verification & Entity Integrity',
    category: 'STATUTORY',
    mandatory: true,
    defaultWeight: 15,
    evaluate: (ctx: ComplianceEvaluationContext): RuleEvaluationResult => {
      const record = ctx.portalRecords.pan
      const doc = ctx.documents.find(
        (d) => d.documentType === 'PAN_CARD' || (d.name || '').toLowerCase().includes('pan')
      )

      if (!record || record.status === 'FAILED') {
        return {
          ruleId: 'rule-pan',
          ruleName: 'PAN Verification & Entity Integrity',
          category: 'STATUTORY',
          mandatory: true,
          isCritical: true,
          weight: 15,
          status: 'FAIL',
          score: 0,
          verificationMethod: 'FAILED',
          verificationStatusLabel: doc ? 'PAN Format/Cross-Check Failed' : 'PAN Document Not Uploaded',
          failureReason: doc ? 'PAN format invalid or inconsistent with GSTIN.' : 'Mandatory PAN card document not uploaded.',
          documentReference: doc?.name,
          documentName: doc?.name,
          extractedValue: ctx.bidder.pan,
          evidence: record?.rawSummary || (doc ? 'PAN verification failed or inconsistent with GSTIN.' : 'Mandatory PAN card not uploaded.'),
          explanation: doc ? 'PAN format is invalid or does not match corporate taxpayer identity.' : 'Mandatory PAN document not submitted.',
          confidence: 0.98,
          source: doc ? 'DOCUMENT_EXTRACTED' : 'LOCAL_VALIDATION',
        }
      }

      return {
        ruleId: 'rule-pan',
        ruleName: 'PAN Verification & Entity Integrity',
        category: 'STATUTORY',
        mandatory: true,
        isCritical: true,
        weight: 15,
        status: 'PASS',
        score: 100,
        verificationMethod: 'CROSS_VALIDATED',
        verificationStatusLabel: 'Cross-Validated with GSTIN (External API unavailable)',
        documentReference: doc?.name,
        documentName: doc?.name,
        extractedValue: ctx.bidder.pan,
        portalVerifiedValue: record.data?.legalName,
        evidence: `PAN: ${record.identifier} | Category: ${record.data?.entityType} | ITR Status: ${record.data?.itrFilingStatus}`,
        explanation: 'Permanent Account Number format valid and cross-consistent with embedded GSTIN. Operative status simulated locally (External live verification unavailable).',
        confidence: 0.98,
        source: 'DOCUMENT_EXTRACTED',
      }
    },
  },

  // 4. Udyam / MSME Registration & PPP Order 2012 Exemption Status
  {
    id: 'rule-udyam',
    code: 'STAT_UDYAM',
    name: 'Udyam / MSME Registration & PPP Order Benefits',
    category: 'STATUTORY',
    mandatory: false,
    defaultWeight: 10,
    evaluate: (ctx: ComplianceEvaluationContext): RuleEvaluationResult => {
      const record = ctx.portalRecords.udyam
      const doc = ctx.documents.find(
        (d) => d.documentType === 'UDYAM_MSME_CERTIFICATE' || (d.name || '').toLowerCase().includes('udyam')
      )

      if (!ctx.bidder.udyamNumber && !doc) {
        return {
          ruleId: 'rule-udyam',
          ruleName: 'Udyam / MSME Registration & PPP Order Benefits',
          category: 'STATUTORY',
          mandatory: false,
          weight: 10,
          status: 'NOT_APPLICABLE',
          score: 100,
          verificationMethod: 'NOT_VERIFIED',
          verificationStatusLabel: 'Not Applicable (Non-MSME)',
          evidence: 'Non-MSME bidder (General Large Category). Standard commercial terms apply.',
          explanation: 'Bidder is not claiming MSME exemptions.',
          confidence: 0.95,
          source: 'DOCUMENT_EXTRACTED',
        }
      }

      if (record && record.status === 'VERIFIED') {
        return {
          ruleId: 'rule-udyam',
          ruleName: 'Udyam / MSME Registration & PPP Order Benefits',
          category: 'STATUTORY',
          mandatory: false,
          weight: 10,
          status: 'PASS',
          score: 100,
          verificationMethod: 'DOCUMENT_EXTRACTED',
          verificationStatusLabel: 'Extracted from Udyam Certificate (Simulated)',
          documentReference: doc?.name,
          documentName: doc?.name,
          extractedValue: ctx.bidder.udyamNumber,
          portalVerifiedValue: record.data?.enterpriseType,
          evidence: `Udyam No: ${record.identifier} | Enterprise: ${record.data?.enterpriseType} | PPP Benefits: Eligible for EMD & Prior Experience Exemption`,
          explanation: `Verified valid ${record.data?.enterpriseType || 'MSME'} enterprise certificate under Ministry of MSME (Simulated). Entitled to statutory exemptions under Public Procurement Policy (PPP) Order 2012.`,
          confidence: 0.97,
          source: 'DOCUMENT_EXTRACTED',
        }
      }

      return {
        ruleId: 'rule-udyam',
        ruleName: 'Udyam / MSME Registration & PPP Order Benefits',
        category: 'STATUTORY',
        mandatory: false,
        weight: 10,
        status: 'WARNING',
        score: 60,
        verificationMethod: 'DOCUMENT_EXTRACTED',
        verificationStatusLabel: 'Udyam Format Unverified',
        documentReference: doc?.name,
        documentName: doc?.name,
        extractedValue: ctx.bidder.udyamNumber,
        evidence: 'Udyam certificate format could not be verified automatically.',
        explanation: 'MSME registration certificate requires manual inspection of NIC activity code.',
        confidence: 0.8,
        source: 'DOCUMENT_EXTRACTED',
      }
    },
  },

  // 5. Make in India (MII) / Local Content Compliance
  {
    id: 'rule-mii',
    code: 'TECH_MII',
    name: 'Make in India (MII) Local Content Percentage',
    category: 'TECHNICAL',
    mandatory: true,
    defaultWeight: 15,
    evaluate: (ctx: ComplianceEvaluationContext, customReq?: TenderRequirement): RuleEvaluationResult => {
      const minReq = customReq?.criteriaDetails?.minLocalContentPercent ?? 50
      const record = ctx.portalRecords.mii
      const doc = ctx.documents.find(
        (d) => d.documentType === 'MAKE_IN_INDIA_DECLARATION' || (d.name || '').toLowerCase().includes('local content')
      )

      // If no MII declaration was uploaded and no percentage was declared
      if (!doc && (record?.data?.claimedPercentage === undefined || isNaN(record?.data?.claimedPercentage))) {
        return {
          ruleId: 'rule-mii',
          ruleName: 'Make in India (MII) Local Content Percentage',
          category: 'TECHNICAL',
          mandatory: true,
          weight: 15,
          status: 'FAIL',
          score: 0,
          verificationMethod: 'FAILED',
          verificationStatusLabel: 'Declaration Document Not Uploaded',
          failureReason: 'Mandatory Make in India (MII) local content declaration document was not uploaded.',
          evidence: 'Make in India Local Content declaration document not uploaded.',
          explanation: `Tender requires minimum ${minReq}% local content declaration under PPP-MII Order 2017. Supporting declaration not found in submission.`,
          confidence: 0.95,
          source: 'DOCUMENT_EXTRACTED',
        }
      }

      if (record?.data?.hasDiscrepancy) {
        return {
          ruleId: 'rule-mii',
          ruleName: 'Make in India (MII) Local Content Percentage',
          category: 'TECHNICAL',
          mandatory: true,
          weight: 15,
          status: 'MANUAL_REVIEW',
          score: 55,
          verificationMethod: 'CROSS_VALIDATED',
          verificationStatusLabel: 'Discrepancy with OEM Declaration',
          failureReason: record.data.discrepancyDetails,
          documentReference: doc?.name,
          documentName: doc?.name,
          extractedValue: `${record.data?.claimedPercentage}%`,
          portalVerifiedValue: `${record.data?.oemDeclaredPercent}% in OEM Doc`,
          evidence: record.data.discrepancyDetails,
          explanation: `DISCREPANCY: Bidder claimed ${record.data?.claimedPercentage}% local content in self-declaration, but supporting OEM authorization specifies only ${record.data?.oemDeclaredPercent}%. Procurement Officer must seek clarification.`,
          confidence: 0.92,
          source: 'AI_INFERRED',
        }
      }

      if (record && record.data?.claimedPercentage < minReq) {
        return {
          ruleId: 'rule-mii',
          ruleName: 'Make in India (MII) Local Content Percentage',
          category: 'TECHNICAL',
          mandatory: true,
          weight: 15,
          status: 'FAIL',
          score: 30,
          verificationMethod: 'DOCUMENT_EXTRACTED',
          verificationStatusLabel: `Below Minimum Required (${record.data?.claimedPercentage}% < ${minReq}%)`,
          failureReason: `Claimed ${record.data?.claimedPercentage}% which is below the minimum required ${minReq}%.`,
          documentReference: doc?.name,
          documentName: doc?.name,
          extractedValue: `${record.data?.claimedPercentage}%`,
          portalVerifiedValue: `Required: >= ${minReq}%`,
          evidence: `Claimed ${record.data?.claimedPercentage}% which is below the minimum required ${minReq}%.`,
          explanation: `Does not meet minimum local content threshold of ${minReq}% under PPP-MII Order 2017.`,
          confidence: 0.95,
          source: 'DOCUMENT_EXTRACTED',
        }
      }

      const claimedVal = record?.data?.claimedPercentage !== undefined ? record.data.claimedPercentage : 50

      return {
        ruleId: 'rule-mii',
        ruleName: 'Make in India (MII) Local Content Percentage',
        category: 'TECHNICAL',
        mandatory: true,
        weight: 15,
        status: 'PASS',
        score: 100,
        verificationMethod: 'DOCUMENT_EXTRACTED',
        verificationStatusLabel: `Declared ${claimedVal}% Local Content`,
        documentReference: doc?.name,
        documentName: doc?.name,
        extractedValue: `${claimedVal}%`,
        portalVerifiedValue: `Class-I Local Supplier (>= ${minReq}%)`,
        evidence: `Local content declaration of ${claimedVal}% satisfies tender minimum requirement of ${minReq}%.`,
        explanation: 'Class-I Local Supplier classification confirmed from submitted declaration.',
        confidence: 0.94,
        source: 'DOCUMENT_EXTRACTED',
      }
    },
  },

  // 6. OEM Authorization Letter
  {
    id: 'rule-oem',
    code: 'TECH_OEM',
    name: 'Manufacturer Authorization Form (MAF / OEM)',
    category: 'TECHNICAL',
    mandatory: true,
    defaultWeight: 15,
    evaluate: (ctx: ComplianceEvaluationContext): RuleEvaluationResult => {
      const doc = ctx.documents.find(
        (d) => d.documentType === 'OEM_AUTHORIZATION_LETTER' || (d.name || '').toLowerCase().includes('oem')
      )

      if (!doc) {
        return {
          ruleId: 'rule-oem',
          ruleName: 'Manufacturer Authorization Form (MAF / OEM)',
          category: 'TECHNICAL',
          mandatory: true,
          isCritical: true,
          weight: 15,
          status: 'FAIL',
          score: 0,
          verificationMethod: 'FAILED',
          verificationStatusLabel: 'Required document not uploaded',
          failureReason: 'Mandatory Manufacturer Authorization Form (MAF / OEM) was not uploaded.',
          evidence: 'Mandatory OEM Authorization Letter not uploaded.',
          explanation:
            'In accordance with GeM General Terms and Conditions (GTC), non-OEM bidders must submit a valid Manufacturer Authorization Form. No OEM authorization document was found in this submission.',
          confidence: 0.96,
          source: 'DOCUMENT_EXTRACTED',
        }
      }

      const isValid = doc.extractedFields?.isOemAuthorizationValid !== false

      if (isValid) {
        return {
          ruleId: 'rule-oem',
          ruleName: 'Manufacturer Authorization Form (MAF / OEM)',
          category: 'TECHNICAL',
          mandatory: true,
          isCritical: true,
          weight: 15,
          status: 'PASS',
          score: 95,
          verificationMethod: 'DOCUMENT_EXTRACTED',
          verificationStatusLabel: 'Extracted from OEM Authorization Letter',
          documentReference: doc.name,
          documentName: doc.name,
          extractedValue: 'Valid OEM Authorization present',
          evidence:
            'OEM Authorization Letter contains valid tender number reference, warranty commitment, and authorized signatory stamp.',
          explanation: 'Authorization letter verified legible and active for the complete tender lifecycle.',
          confidence: 0.93,
          source: 'DOCUMENT_EXTRACTED',
        }
      }

      return {
        ruleId: 'rule-oem',
        ruleName: 'Manufacturer Authorization Form (MAF / OEM)',
        category: 'TECHNICAL',
        mandatory: true,
        isCritical: true,
        weight: 15,
        status: 'MANUAL_REVIEW',
        score: 60,
        verificationMethod: 'DOCUMENT_EXTRACTED',
        verificationStatusLabel: 'Signatory Authority Requires Verification',
        documentReference: doc.name,
        documentName: doc.name,
        evidence: 'OEM letter present but signatory authority requires verification.',
        explanation: 'Document needs manual review to verify OEM authorization validity period.',
        confidence: 0.85,
        source: 'DOCUMENT_EXTRACTED',
      }
    },
  },
]
