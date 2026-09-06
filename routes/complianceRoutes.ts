import { Router } from 'express'
import { connectToDatabase } from '../db/mongodb'
import { Bid } from '../models/Bid'
import { ComplianceResult } from '../models/ComplianceResult'
import { requireAuth } from '../middleware/auth'
import { verificationPipelineService } from '../services/verification/pipeline'

const router = Router()

// POST /api/compliance/:bidId/evaluate — Evaluate compliance for a bid
router.post('/:bidId/evaluate', requireAuth, async (req, res) => {
  try {
    const bidId = req.params.bidId as string
    const result = await verificationPipelineService.executePipeline(bidId)
    const evaluation = result.evaluation

    return res.json({
      success: true,
      data: {
        bidId,
        score: evaluation.overallScore,
        riskLevel: evaluation.riskLevel,
        recommendation: evaluation.recommendation,
        riskFactors: evaluation.riskFactors,
        ruleResults: evaluation.ruleResults,
        aiSummary: evaluation.aiSummary,
        aiFindings: evaluation.aiFindings,
        portalVerifications: evaluation.portalVerifications,
        evaluatedAt: evaluation.evaluatedAt,
      },
    })
  } catch (error: any) {
    console.error('Compliance evaluation error:', error)
    return res.status(500).json({ success: false, message: error.message, error: 'EVALUATION_FAILED' })
  }
})

// GET /api/compliance/:bidId — Get compliance result for a bid
router.get('/:bidId', requireAuth, async (req, res) => {
  try {
    const { bidId } = req.params

    await connectToDatabase()
    const result = await ComplianceResult.findOne({ bidId }).lean()

    if (!result) {
      // Fallback: check bid's embedded evaluation
      const bid = await Bid.findById(bidId).lean()
      if (bid?.evaluation) {
        return res.json({ success: true, data: bid.evaluation })
      }
      return res.status(404).json({ success: false, message: 'No compliance result found', error: 'NOT_FOUND' })
    }

    return res.json({
      success: true,
      data: {
        id: (result as any)._id?.toString(),
        bidId: result.bidId,
        score: result.score,
        overallScore: result.overallScore || result.score,
        riskLevel: result.riskLevel,
        status: result.status,
        recommendation: result.recommendation || result.status,
        summary: result.summary || result.aiSummary,
        aiSummary: result.summary || result.aiSummary,
        riskFactors: result.riskFactors,
        ruleResults: (result as any).ruleResults || (await Bid.findById(bidId).lean())?.evaluation?.ruleResults || [],
        portalVerifications: result.portalVerifications,
        aiFindings: result.aiFindings,
        evaluatedAt: result.evaluatedAt instanceof Date ? result.evaluatedAt.toISOString() : result.evaluatedAt,
      },
    })
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message, error: 'FETCH_FAILED' })
  }
})

export default router
