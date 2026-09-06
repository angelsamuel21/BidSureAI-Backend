import { Router } from 'express';
import { connectToDatabase } from '../db/mongodb';
import { Tender } from '../models/Tender';
import { Bid } from '../models/Bid';
import { auditService } from '../services/audit';
import { requireAuth } from '../middleware/auth';

const router = Router();

// GET /api/tenders/dashboard — Dashboard stats calculated from MongoDB
router.get('/dashboard', async (req, res) => {
  try {
    await connectToDatabase();

    const [tenderCount, bids] = await Promise.all([
      Tender.countDocuments(),
      Bid.find().lean(),
    ]);

    let totalBids = 0;
    let verifiedBids = 0;
    let pendingBids = 0;
    let highRiskBids = 0;
    let criticalBids = 0;

    if (bids && bids.length > 0) {
      totalBids = bids.length;
      bids.forEach((b: any) => {
        if (b.status === 'QUALIFIED' || b.status === 'DISQUALIFIED' || b.evaluation) {
          verifiedBids++;
        }
        if (b.status === 'PENDING') {
          pendingBids++;
        }
        const risk = b.evaluation?.riskLevel || b.riskLevel;
        if (risk === 'HIGH') {
          highRiskBids++;
        }
        if (risk === 'CRITICAL') {
          criticalBids++;
        }
      });
    }

    return res.json({
      success: true,
      data: {
        totalTenders: tenderCount,
        totalBids,
        verifiedBids,
        pendingBids,
        highRiskBids,
        criticalBids,
      },
      // Legacy alias for backward compatibility
      stats: {
        totalTenders: tenderCount,
        totalBids,
        verifiedBids,
        pendingBids,
        highRiskBids,
        criticalBids,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message, error: 'DASHBOARD_FAILED' });
  }
});

// GET /api/tenders — List all tenders
router.get('/', async (req, res) => {
  try {
    await connectToDatabase();
    const tenderDocs = await Tender.find().lean();
    const tenders: any[] = [];

    if (tenderDocs && tenderDocs.length > 0) {
      tenders.push(...tenderDocs.map((t: any) => ({
        id: t._id ? t._id.toString() : t.id,
        tenderId: t.tenderNumber || t.tenderId,
        title: t.title,
        description: t.description || '',
        department: t.department || 'Chennai Petroleum Corporation Limited (CPCL)',
        estimatedValueCr: t.estimatedValueCr || 1.0,
        submissionDeadline:
          t.submissionDeadline instanceof Date ? t.submissionDeadline.toISOString() : t.submissionDeadline,
        status: t.status || 'ACTIVE',
        createdAt: t.createdAt instanceof Date ? t.createdAt.toISOString() : t.createdAt,
        requirements: (t.requirements || []).map((r: any) => ({
          id: r.id || (r._id ? r._id.toString() : `req-${Date.now()}`),
          code: r.code,
          name: r.name,
          description: r.description,
          category: r.category || 'STATUTORY',
          mandatory: r.mandatory ?? true,
          weight: r.weight || 10,
          expectedDocumentType: r.expectedDocumentType,
          criteriaDetails: r.criteriaDetails,
        })),
      })));
    }
    return res.json({ success: true, tenders, data: tenders });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message, error: 'FETCH_FAILED' });
  }
});

// GET /api/tenders/:id — Get single tender by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await connectToDatabase();
    const orClauses: any[] = [
      { tenderNumber: id },
      { tenderId: id }
    ];
    if (/^[0-9a-fA-F]{24}$/.test(id)) {
      orClauses.push({ _id: id });
    }

    const t = await Tender.findOne({
      $or: orClauses,
    }).lean() as any;

    if (!t) {
      return res.status(404).json({ success: false, message: 'Tender not found', error: 'NOT_FOUND' });
    }

    const tender = {
      id: t._id ? t._id.toString() : t.id,
      tenderId: t.tenderNumber || t.tenderId,
      title: t.title,
      description: t.description || '',
      department: t.department || 'Chennai Petroleum Corporation Limited (CPCL)',
      estimatedValueCr: t.estimatedValueCr || 1.0,
      submissionDeadline:
        t.submissionDeadline instanceof Date ? t.submissionDeadline.toISOString() : t.submissionDeadline,
      status: t.status || 'ACTIVE',
      createdAt: t.createdAt instanceof Date ? t.createdAt.toISOString() : t.createdAt,
      requirements: (t.requirements || []).map((r: any) => ({
        id: r.id || (r._id ? r._id.toString() : `req-${Date.now()}`),
        code: r.code,
        name: r.name,
        description: r.description,
        category: r.category || 'STATUTORY',
        mandatory: r.mandatory ?? true,
        weight: r.weight || 10,
        expectedDocumentType: r.expectedDocumentType,
        criteriaDetails: r.criteriaDetails,
      })),
    };

    return res.json({ success: true, data: tender, tender });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message, error: 'FETCH_FAILED' });
  }
});

// POST /api/tenders — Create a tender
router.post('/', requireAuth, async (req, res) => {
  try {
    const body = req.body;

    if (!body.tenderId && !body.tenderNumber && !body.title) {
      return res.status(400).json({ success: false, message: 'Tender ID and Title are required.', error: 'VALIDATION_ERROR' });
    }

    const tenderNumber = body.tenderId || body.tenderNumber || `GEM/${new Date().getFullYear()}/${Date.now().toString().slice(-3)}`;

    await connectToDatabase();
    const created = await Tender.create({
      tenderNumber,
      tenderId: tenderNumber,
      title: body.title,
      description: body.description || '',
      department: body.department || 'Chennai Petroleum Corporation Limited (CPCL)',
      estimatedValueCr: body.estimatedValueCr || 1.0,
      submissionDeadline: body.submissionDeadline ? new Date(body.submissionDeadline) : new Date(Date.now() + 14 * 86400000),
      status: 'ACTIVE',
      requirements: body.requirements || [],
    });

    const tender = {
      id: created._id.toString(),
      tenderId: tenderNumber,
      title: created.title,
      description: created.description || '',
      department: created.department,
      estimatedValueCr: created.estimatedValueCr,
      submissionDeadline: created.submissionDeadline instanceof Date ? created.submissionDeadline.toISOString() : created.submissionDeadline,
      status: created.status,
      createdAt: created.createdAt instanceof Date ? created.createdAt.toISOString() : new Date().toISOString(),
      requirements: created.requirements || [],
    };

    await auditService.log({
      actor: req.user?.name || body.createdByName || 'System',
      role: req.user?.role || 'PROCUREMENT_OFFICER',
      action: 'TENDER_CREATED',
      tenderId: tenderNumber,
      details: `New tender published: ${tenderNumber} - "${tender.title}" with ${(tender.requirements || []).length} eligibility rules.`,
    });

    return res.status(201).json({ success: true, data: tender, tender });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message, error: 'CREATE_FAILED' });
  }
});

export default router;
