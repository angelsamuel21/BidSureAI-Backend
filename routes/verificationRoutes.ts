import { Router } from 'express';
import { connectToDatabase } from '../db/mongodb';
import { Bid } from '../models/Bid';
import { verificationService } from '../services/verification';

const router = Router();

// POST /api/verify — Legacy endpoint (used by frontend NewVerificationView)
// Also POST /api/verifications — same handler
router.post('/', async (req, res) => {
  try {
    const body = req.body;
    const { bidId, tenderId, bidderData, documents } = body;

    if (!bidId && !tenderId) {
      return res.status(400).json({ success: false, error: 'Bid ID or Tender ID is required' });
    }

    const result = await verificationService.runVerification({
      bidId,
      tenderId: tenderId || 'GEM/2026/001',
      bidderData: bidderData || {},
      documents: documents || [],
    });

    return res.json({
      success: true,
      bid: result.bid,
      evaluation: result.evaluation,
      data: result,
    });
  } catch (error: any) {
    console.error('Verification error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Verification could not be completed. Please try again.'
    });
  }
});

// POST /api/verifications/:bidId/run — Run verification on an existing bid
router.post('/:bidId/run', async (req, res) => {
  try {
    const { bidId } = req.params;

    const result = await verificationService.runVerificationForBid(bidId);

    return res.json({
      success: true,
      bid: result.bid,
      evaluation: result.evaluation,
      data: result,
    });
  } catch (error: any) {
    console.error('Verification error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Verification could not be completed.'
    });
  }
});

// GET /api/verifications/:bidId — Get verification result for a bid
router.get('/:bidId', async (req, res) => {
  try {
    const { bidId } = req.params;

    await connectToDatabase();
    const bid = await Bid.findById(bidId).lean();
    if (!bid) {
      return res.status(404).json({ success: false, error: 'Bid not found' });
    }

    if (!bid.evaluation) {
      return res.status(404).json({ success: false, error: 'No verification result found for this bid' });
    }

    return res.json({
      success: true,
      data: bid.evaluation,
      bid: {
        id: (bid as any)._id?.toString(),
        bidderName: bid.bidderName,
        tenderId: bid.tenderId,
        tenderNumber: bid.tenderNumber,
        status: bid.status,
        evaluation: bid.evaluation,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
