import { Router } from 'express';
import { auditService } from '../services/audit';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const logs = await auditService.getAllLogs();
    const chainIntegrity = await auditService.verifyChain();

    return res.json({
      success: true,
      logs: [...logs].reverse(), // Newest first
      chainIntegrity,
      totalEntries: logs.length,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});
router.delete('/', async (req, res) => {
  try {
    const deletedCount = await auditService.clearAllLogs();
    return res.json({
      success: true,
      message: `Successfully cleared all audit trail records (${deletedCount} records removed).`,
      deletedCount,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/clear', async (req, res) => {
  try {
    const deletedCount = await auditService.clearAllLogs();
    return res.json({
      success: true,
      message: `Successfully cleared all audit trail records (${deletedCount} records removed).`,
      deletedCount,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
