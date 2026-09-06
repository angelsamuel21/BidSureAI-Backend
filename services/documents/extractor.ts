import { ExtractedEntities } from './types'

export class EntityExtractor {
  extractFromText(text: string, fileName: string = ''): { entities: ExtractedEntities; classifiedType: string } {
    const clean = text || ''
    const entities: ExtractedEntities = {
      addresses: [],
      unrecognizedFields: {},
    }

    // 1. GSTIN Regex
    const gstinMatch = clean.match(/\b([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1})\b/i)
    if (gstinMatch) {
      entities.gstin = gstinMatch[1].toUpperCase()
      // Derive PAN from GSTIN if not found separately
      if (!entities.pan) {
        entities.pan = entities.gstin.substring(2, 12)
      }
    }

    // 2. PAN Regex
    const panMatch = clean.match(/\b([A-Z]{5}[0-9]{4}[A-Z]{1})\b/i)
    if (panMatch && !entities.pan) {
      entities.pan = panMatch[1].toUpperCase()
    }

    // 3. Udyam Regex
    const udyamMatch = clean.match(/\b(UDYAM-[A-Z]{2}-\d{2}-\d{7})\b/i)
    if (udyamMatch) {
      entities.udyamNumber = udyamMatch[1].toUpperCase()
    }

    // 4. CIN Regex
    const cinMatch = clean.match(/\b([LU]{1}[0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6})\b/i)
    if (cinMatch) {
      entities.cin = cinMatch[1].toUpperCase()
    }

    // 5. Local Content Percentage
    const localContentMatch = clean.match(
      /(?:local\s+content|local\s+value\s+addition|indigenous\s+content)[\s:]*([0-9]{1,3}(?:\.[0-9]+)?)\s*%/i
    )
    if (localContentMatch) {
      entities.localContentPercent = parseFloat(localContentMatch[1])
    }

    // 6. Annual Turnover
    const turnoverMatch = clean.match(
      /(?:annual\s+turnover|average\s+turnover|turnover)[\s:]*(?:INR|Rs\.?|₹)?\s*([0-9]+(?:\.[0-9]+)?)\s*(?:cr|crore|crores)?/i
    )
    if (turnoverMatch) {
      entities.turnoverCr = parseFloat(turnoverMatch[1])
    }

    // 7. Dates (Issue / Expiry)
    const dateMatch = clean.match(/\b(\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}|\d{4}[-/.]\d{1,2}[-/.]\d{1,2})\b/)
    if (dateMatch) {
      entities.dateOfIssue = dateMatch[1]
    }

    // 8. Company / Legal Entity Name heuristic
    const nameMatch = clean.match(
      /(?:M\/s\.?|Name\s+of\s+Enterprise|Legal\s+Name|Company\s+Name)[\s:]+([A-Z0-9\s.,&-]{3,50})(?:\r?\n|$)/i
    )
    if (nameMatch) {
      entities.legalName = nameMatch[1].trim()
    }

    // 9. Document Classification
    let classifiedType = 'GENERAL_TENDER_DOCUMENT'
    const lower = (clean + ' ' + fileName).toLowerCase()
    if (lower.includes('gst') || lower.includes('gstin') || lower.includes('registration certificate')) {
      classifiedType = 'GST_REGISTRATION_CERTIFICATE'
    } else if (lower.includes('udyam') || lower.includes('msme') || lower.includes('micro, small')) {
      classifiedType = 'UDYAM_MSME_CERTIFICATE'
    } else if (
      lower.includes('permanent account number') ||
      lower.includes('pan card') ||
      lower.includes('income tax department')
    ) {
      classifiedType = 'PAN_CARD'
    } else if (lower.includes('oem') || lower.includes('authorization') || lower.includes('manufacture')) {
      classifiedType = 'OEM_AUTHORIZATION_LETTER'
      entities.isOemAuthorizationValid =
        lower.includes('valid') || lower.includes('authorized') || !lower.includes('expired')
    } else if (
      lower.includes('local content') ||
      lower.includes('make in india') ||
      lower.includes('class-i') ||
      lower.includes('class-ii')
    ) {
      classifiedType = 'MAKE_IN_INDIA_DECLARATION'
    } else if (lower.includes('income tax') || lower.includes('itr') || lower.includes('form 26as')) {
      classifiedType = 'INCOME_TAX_COMPLIANCE'
    }

    return { entities, classifiedType }
  }
}

export const entityExtractor = new EntityExtractor()
export default entityExtractor
