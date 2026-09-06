import { Router } from 'express'
import { connectToDatabase } from '../db/mongodb'
import { Bid } from '../models/Bid'
import { requireAuth, requireRole } from '../middleware/auth'
import { auditService } from '../services/audit'

const router = Router()

// POST /api/decisions/:bidId — Record officer decision
router.post('/:bidId', requireAuth, requireRole('PROCUREMENT_OFFICER', 'SYSTEM_ADMIN'), async (req, res) => {
  try {
    const bidId = req.params.bidId as string
    const { decision, reason, justification } = req.body

    // Validate decision
    const validDecisions = ['QUALIFIED', 'DISQUALIFIED', 'CLARIFICATION_REQUIRED']
    if (!decision || !validDecisions.includes(decision)) {
      return res.status(400).json({
        success: false,
        message: `Invalid decision. Must be one of: ${validDecisions.join(', ')}`,
        error: 'INVALID_DECISION',
      })
    }

    await connectToDatabase()
    const bid = await Bid.findById(bidId)
    if (!bid) {
      return res.status(404).json({ success: false, message: 'Bid not found', error: 'BID_NOT_FOUND' })
    }

    const officerName = req.user!.name
    const officerRole = req.user!.role
    const decisionReason = reason || justification || `${officerName} recorded ${decision}`

    // Map canonical decision to internal action types
    let actionType: 'APPROVE' | 'REJECT' | 'REQUEST_CLARIFICATION'
    let bidStatus: 'QUALIFIED' | 'DISQUALIFIED' | 'CLARIFICATION_REQUESTED'

    if (decision === 'QUALIFIED') {
      actionType = 'APPROVE'
      bidStatus = 'QUALIFIED'
    } else if (decision === 'DISQUALIFIED') {
      actionType = 'REJECT'
      bidStatus = 'DISQUALIFIED'
    } else {
      actionType = 'REQUEST_CLARIFICATION'
      bidStatus = 'CLARIFICATION_REQUESTED'
    }

    bid.officerDecision = {
      decision: actionType,
      justification: decisionReason,
      officerName,
      officerRole,
      timestamp: new Date(),
    }
    bid.status = bidStatus
    bid.decision = actionType
    bid.decisionReason = decisionReason
    bid.officerName = officerName
    bid.officerRole = officerRole
    bid.decisionTime = new Date()

    await bid.save()

    await auditService.log({
      actor: officerName,
      role: officerRole,
      action: 'DECISION_RECORDED',
      bidId,
      details: `Officer decision: ${decision} for bid ${bidId}. Reason: ${decisionReason}. Officer: ${officerName} (${officerRole}).`,
    })

    return res.json({
      success: true,
      data: {
        bidId,
        decision,
        officer: officerName,
        role: officerRole,
        reason: decisionReason,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message, error: 'DECISION_FAILED' })
  }
})

export default router
