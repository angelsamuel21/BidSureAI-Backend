import { Router } from 'express'
import { connectToDatabase } from '../db/mongodb'
import { Bid } from '../models/Bid'
import { ComplianceResult } from '../models/ComplianceResult'
import { Recommendation } from '../models/Recommendation'
import { requireAuth } from '../middleware/auth'
import { auditService } from '../services/audit'

const router = Router()

/**
 * Deterministic recommendation generator.
 * Generates recommendations based on actual compliance findings — NOT an LLM.
 */
function generateDeterministicRecommendations(
  riskFactors: string[],
  riskLevel: string,
  recommendation: string,
  ruleResults: any[],
  aiFindings: any[]
): { finding: string; recommendation: string; severity: 'INFO' | 'WARNING' | 'HIGH' | 'CRITICAL'; clauseReference?: string }[] {
  const recs: { finding: string; recommendation: string; severity: 'INFO' | 'WARNING' | 'HIGH' | 'CRITICAL'; clauseReference?: string }[] = []

  // Generate from rule results
  for (const rule of ruleResults) {
    if (rule.status === 'FAIL') {
      if (rule.ruleId === 'rule-debarment') {
        recs.push({
          finding: `Bidder is actively debarred/blacklisted.`,
          recommendation: 'Mandatory disqualification required under GFR 2017 Rule 151. No ML or officer override permitted for confirmed statutory debarment.',
          severity: 'CRITICAL',
          clauseReference: 'GFR 2017 Rule 151, GeM GTC Clause 4(xii)',
        })
      } else if (rule.ruleId === 'rule-mii') {
        recs.push({
          finding: `Local content ${rule.extractedValue} does not meet tender minimum requirement of ${rule.portalVerifiedValue}.`,
          recommendation: 'Request clarification from bidder with CA/Cost Auditor certified local content breakdown before final evaluation.',
          severity: 'HIGH',
          clauseReference: 'PPP-MII Order 2017 (DPIIT)',
        })
      } else if (rule.ruleId === 'rule-oem') {
        recs.push({
          finding: 'Mandatory OEM Authorization Letter not uploaded.',
          recommendation: 'Mandatory technical requirement failed. Mandatory disqualification recommended unless valid Manufacturer Authorization Form is submitted.',
          severity: 'HIGH',
          clauseReference: 'GeM GTC Technical Specification Clause 4.1',
        })
      } else {
        recs.push({
          finding: `${rule.ruleName}: ${rule.explanation}`,
          recommendation: `Verify ${rule.ruleName} compliance. ${rule.evidence}`,
          severity: 'HIGH',
        })
      }
    } else if (rule.status === 'MANUAL_REVIEW') {
      recs.push({
        finding: `${rule.ruleName}: ${rule.explanation}`,
        recommendation: `Manual officer review required. ${rule.evidence}`,
        severity: 'WARNING',
        clauseReference: rule.documentReference,
      })
    } else if (rule.status === 'WARNING') {
      recs.push({
        finding: `${rule.ruleName}: ${rule.explanation}`,
        recommendation: `Minor discrepancy detected. Verify supporting documentation. ${rule.evidence}`,
        severity: 'WARNING',
      })
    }
  }

  // Generate from AI findings
  for (const finding of aiFindings) {
    if (finding.severity === 'CRITICAL' || finding.severity === 'HIGH') {
      recs.push({
        finding: `${finding.title}: ${finding.description}`,
        recommendation: finding.recommendedAction,
        severity: finding.severity,
        clauseReference: finding.clauseReference,
      })
    }
  }

  // If everything is clean
  if (recs.length === 0) {
    recs.push({
      finding: 'All statutory, financial, and technical credentials satisfy tender requirements.',
      recommendation: 'Bid appears compliant. Eligible for qualification pending officer review.',
      severity: 'INFO',
    })
  }

  return recs
}

// POST /api/recommendations/:bidId/generate — Generate recommendations
router.post('/:bidId/generate', requireAuth, async (req, res) => {
  try {
    const bidId = req.params.bidId as string

    await connectToDatabase()
    const bid = await Bid.findById(bidId).lean()
    if (!bid) {
      return res.status(404).json({ success: false, message: 'Bid not found', error: 'BID_NOT_FOUND' })
    }

    const compliance = await ComplianceResult.findOne({ bidId }).lean()
    const eval_ = (bid.evaluation as any) || compliance

    if (!eval_) {
      return res.status(400).json({
        success: false,
        message: 'Compliance evaluation must be run before generating recommendations',
        error: 'NO_EVALUATION',
      })
    }

    const recs = generateDeterministicRecommendations(
      eval_.riskFactors || [],
      eval_.riskLevel || 'MEDIUM',
      eval_.recommendation || eval_.status || 'REQUIRES_MANUAL_REVIEW',
      eval_.ruleResults || [],
      eval_.aiFindings || []
    )

    // Persist
    const existing = await Recommendation.findOne({ bidId })
    if (existing) {
      existing.recommendations = recs as any
      existing.generatedAt = new Date()
      existing.generatedBy = 'Deterministic Recommendation Engine'
      await existing.save()
    } else {
      await Recommendation.create({
        bidId,
        recommendations: recs,
        generatedAt: new Date(),
        generatedBy: 'Deterministic Recommendation Engine',
      })
    }

    await auditService.log({
      actor: req.user?.name || 'System',
      role: req.user?.role || 'PROCUREMENT_OFFICER',
      action: 'RECOMMENDATION_GENERATED',
      bidId,
      details: `Generated ${recs.length} recommendation(s) for bid ${bidId}. Engine: Deterministic Recommendation Engine.`,
    })

    return res.json({
      success: true,
      data: {
        bidId,
        recommendations: recs,
        generatedAt: new Date().toISOString(),
        generatedBy: 'Deterministic Recommendation Engine',
      },
    })
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message, error: 'GENERATION_FAILED' })
  }
})

// GET /api/recommendations/:bidId — Get recommendations for a bid
router.get('/:bidId', requireAuth, async (req, res) => {
  try {
    const { bidId } = req.params

    await connectToDatabase()
    const rec = await Recommendation.findOne({ bidId }).lean()

    if (!rec) {
      return res.status(404).json({ success: false, message: 'No recommendations found', error: 'NOT_FOUND' })
    }

    return res.json({
      success: true,
      data: {
        id: (rec as any)._id?.toString(),
        bidId: rec.bidId,
        recommendations: rec.recommendations,
        generatedAt: rec.generatedAt instanceof Date ? rec.generatedAt.toISOString() : rec.generatedAt,
        generatedBy: rec.generatedBy,
      },
    })
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message, error: 'FETCH_FAILED' })
  }
})

export default router
