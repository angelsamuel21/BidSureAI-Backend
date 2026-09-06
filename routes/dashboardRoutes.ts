import { Router } from 'express';
import { connectToDatabase } from '../db/mongodb';
import { Bid } from '../models/Bid';

const router = Router();

router.get('/stats', async (req, res) => {
  try {
    let totalBids = 0;
    let verifiedBids = 0;
    let pendingBids = 0;
    let highRiskBids = 0;
    let criticalBids = 0;
    
    await connectToDatabase();
    const bids = await Bid.find().lean();
    
    if (bids && bids.length > 0) {
      totalBids = bids.length;
      bids.forEach((b: any) => {
        if (b.status === 'QUALIFIED' || b.status === 'DISQUALIFIED' || b.evaluation) {
          verifiedBids++;
        }
        if (b.status === 'PENDING') {
          pendingBids++;
        }
        if (b.evaluation?.riskLevel === 'HIGH') {
          highRiskBids++;
        }
        if (b.evaluation?.riskLevel === 'CRITICAL') {
          criticalBids++;
        }
      });
    }

    return res.json({
      success: true,
      stats: {
        totalBids,
        verifiedBids,
        pendingBids,
        highRiskBids,
        criticalBids
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
