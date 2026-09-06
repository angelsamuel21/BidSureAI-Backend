import { Router } from 'express';
import { connectToDatabase } from '../db/mongodb';
import { Bid } from '../models/Bid';
import { DocumentModel } from '../models/Document';
import { requireAuth } from '../middleware/auth';
import { auditService } from '../services/audit';

const router = Router();

// POST /api/bids — Create/submit a new bid
router.post('/', requireAuth, async (req, res) => {
  try {
    const { tenderId, tenderNumber, bidderName, bidderId, documents } = req.body;

    if (!tenderId && !tenderNumber) {
      return res.status(400).json({ success: false, message: 'Tender ID is required', error: 'VALIDATION_ERROR' });
    }
    if (!bidderName) {
      return res.status(400).json({ success: false, message: 'Bidder name is required', error: 'VALIDATION_ERROR' });
    }

    await connectToDatabase();
    const created = await Bid.create({
      tenderId: tenderId || tenderNumber,
      tenderNumber: tenderNumber || tenderId,
      bidderId: bidderId || `bidder-${Date.now()}`,
      bidderName,
      status: 'PENDING',
      submittedAt: new Date(),
      documents: documents || [],
      verifications: [],
      clarifications: [],
    });

    const bid = {
      id: created._id.toString(),
      tenderId: created.tenderId,
      tenderNumber: created.tenderNumber,
      bidderId: created.bidderId,
      bidderName: created.bidderName,
      status: created.status,
      submittedAt: created.submittedAt instanceof Date ? created.submittedAt.toISOString() : created.submittedAt,
      documents: [],
      clarifications: [],
    };

    await auditService.log({
      actor: req.user?.name || 'System',
      role: req.user?.role || 'PROCUREMENT_OFFICER',
      action: 'BID_SUBMITTED',
      bidId: bid.id,
      tenderId: bid.tenderId,
      details: `New bid submitted by "${bidderName}" for tender ${bid.tenderId}.`,
    });

    return res.status(201).json({ success: true, data: bid, bid });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message, error: 'CREATE_FAILED' });
  }
});

// GET /api/bids — List all bids (with optional filters)
router.get('/', async (req, res) => {
  try {
    const search = ((req.query.search as string) || '').toLowerCase().trim();
    const status = req.query.status as string;
    const tenderId = req.query.tenderId as string;

    let bids: any[] = [];

    await connectToDatabase();
    const query: Record<string, any> = {};
    if (tenderId && tenderId !== 'all') {
      query.$or = [{ tenderId }, { tenderNumber: tenderId }];
    }

    const bidDocs = await Bid.find(query).lean();
    if (bidDocs && bidDocs.length > 0) {
      bids = bidDocs.map((b: any) => ({
        id: b._id ? b._id.toString() : b.id,
        tenderId: b.tenderId,
        tenderNumber: b.tenderNumber || 'GEM/2026/001',
        bidderId: b.bidderId,
        bidderName: b.bidderName,
        status: b.status,
        submittedAt: b.submittedAt instanceof Date ? b.submittedAt.toISOString() : b.submittedAt,
        officerDecision: b.officerDecision
          ? {
              ...b.officerDecision,
              timestamp:
                b.officerDecision.timestamp instanceof Date
                  ? b.officerDecision.timestamp.toISOString()
                  : b.officerDecision.timestamp,
            }
          : undefined,
        evaluation: b.evaluation
          ? {
              ...b.evaluation,
              evaluatedAt:
                b.evaluation.evaluatedAt instanceof Date
                  ? b.evaluation.evaluatedAt.toISOString()
                  : b.evaluation.evaluatedAt,
            }
          : undefined,
        documents: (b.documents || []).map((d: any) => ({
          id: d._id ? d._id.toString() : d.id || `doc-${Date.now()}`,
          name: d.name || d.fileName,
          fileName: d.fileName || d.name,
          sizeBytes: d.sizeBytes || d.fileSize || 0,
          mimeType: d.mimeType || d.fileType || 'application/pdf',
          sha256Hash: d.sha256Hash || d.sha256 || '',
          documentType: d.documentType,
          processingStatus: d.processingStatus || 'PROCESSED',
          extractionMethod: d.extractionMethod || 'TEXT',
          uploadedAt: d.createdAt instanceof Date ? d.createdAt.toISOString() : d.uploadedAt || new Date().toISOString(),
          extractedText: d.extractedText || '',
          extractedFields: d.extractedFields || {},
        })),
        clarifications: (b.clarifications || []).map((c: any) => ({
          id: c.id || (c._id ? c._id.toString() : `clar-${Date.now()}`),
          bidId: b._id ? b._id.toString() : b.id,
          tenderId: b.tenderNumber || b.tenderId,
          clauseReference: c.clauseReference || c.clauseRef || 'General Terms',
          queryText: c.queryText || c.message,
          deadline: c.deadline instanceof Date ? c.deadline.toISOString() : c.deadline,
          issuedAt: c.issuedAt instanceof Date ? c.issuedAt.toISOString() : c.issuedAt || new Date().toISOString(),
          issuedBy: c.issuedBy,
          status: c.status,
        })),
      }));
    }

    if (status && status !== 'all') {
      bids = bids.filter((b) => {
        if (status === 'Compliant') return b.evaluation?.recommendation === 'COMPLIANT';
        if (status === 'Review Required') return b.evaluation?.recommendation === 'REQUIRES_MANUAL_REVIEW';
        if (status === 'Non-Compliant') return b.evaluation?.recommendation === 'NON-COMPLIANT';
        return b.status === status;
      });
    }

    if (search) {
      bids = bids.filter(
        (b) =>
          b.bidderName.toLowerCase().includes(search) ||
          b.tenderNumber.toLowerCase().includes(search) ||
          (b.evaluation?.riskLevel || '').toLowerCase().includes(search)
      );
    }

    return res.json({ success: true, bids, data: bids });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message, error: 'FETCH_FAILED' });
  }
});

// GET /api/bids/:id — Get single bid by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await connectToDatabase();
    const b = await Bid.findById(id).lean() as any;
    if (!b) {
      return res.status(404).json({ success: false, message: 'Bid not found', error: 'BID_NOT_FOUND' });
    }

    // Query standalone DocumentModel collection as primary source of truth for documents
    const docRecords = await DocumentModel.find({ bidId: id }).lean();
    const sourceDocs = (docRecords && docRecords.length > 0) ? docRecords : (b.documents || []);

    const documents = sourceDocs.map((d: any) => ({
      id: d._id ? d._id.toString() : d.id || `doc-${Date.now()}`,
      bidId: id,
      name: d.name || d.fileName,
      fileName: d.fileName || d.name,
      sizeBytes: d.sizeBytes || d.fileSize || 0,
      mimeType: d.mimeType || d.fileType || 'application/pdf',
      sha256Hash: d.sha256Hash || d.sha256 || '',
      documentType: d.documentType,
      processingStatus: d.processingStatus || 'PROCESSED',
      extractionMethod: d.extractionMethod || 'TEXT',
      uploadedAt: d.createdAt instanceof Date ? d.createdAt.toISOString() : d.uploadedAt || new Date().toISOString(),
      extractedText: d.extractedText || '',
      extractedFields: d.extractedFields || {},
    }));

    const bid = {
      id: b._id.toString(),
      tenderId: b.tenderId,
      tenderNumber: b.tenderNumber,
      bidderId: b.bidderId,
      bidderName: b.bidderName,
      status: b.status,
      submittedAt: b.submittedAt instanceof Date ? b.submittedAt.toISOString() : b.submittedAt,
      officerDecision: b.officerDecision
        ? {
            ...b.officerDecision,
            timestamp:
              b.officerDecision.timestamp instanceof Date
                ? b.officerDecision.timestamp.toISOString()
                : b.officerDecision.timestamp,
          }
        : undefined,
      evaluation: b.evaluation
        ? {
            ...b.evaluation,
            evaluatedAt:
              b.evaluation.evaluatedAt instanceof Date
                ? b.evaluation.evaluatedAt.toISOString()
                : b.evaluation.evaluatedAt,
          }
        : undefined,
      documents,
      clarifications: (b.clarifications || []).map((c: any) => ({
        id: c.id || (c._id ? c._id.toString() : `clar-${Date.now()}`),
        bidId: b._id.toString(),
        tenderId: b.tenderNumber || b.tenderId,
        clauseReference: c.clauseReference || c.clauseRef || 'General Terms',
        queryText: c.queryText || c.message,
        deadline: c.deadline instanceof Date ? c.deadline.toISOString() : c.deadline,
        issuedAt: c.issuedAt instanceof Date ? c.issuedAt.toISOString() : c.issuedAt || new Date().toISOString(),
        issuedBy: c.issuedBy,
        status: c.status,
      })),
    };

    return res.json({ success: true, data: bid, bid });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message, error: 'FETCH_FAILED' });
  }
});

// PATCH /api/bids/:id — Update bid (officer decision via legacy path)
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { actionType, justification, clarification, officerName, officerRole } = req.body;

    // Auth & RBAC validation
    const token = req.cookies?.gem_auth_token || req.headers.authorization?.replace('Bearer ', '');
    let role = officerRole || 'PROCUREMENT_OFFICER';
    let actor = officerName || 'System';

    if (token) {
      const { verifySessionToken } = require('../services/auth');
      const user = verifySessionToken(token);
      if (user) {
        role = user.role;
        actor = user.name;
      }
    }

    if (role === 'VIGILANCE_AUDITOR') {
      return res.status(403).json({ success: false, message: 'Vigilance Auditors are not authorized to record decisions.', error: 'FORBIDDEN' });
    }

    await connectToDatabase();
    const bid = await Bid.findOne({ _id: id });
    if (!bid) {
      return res.status(404).json({ success: false, message: 'Bid not found', error: 'BID_NOT_FOUND' });
    }

    if (actionType === 'APPROVE' || actionType === 'REJECT' || actionType === 'REQUEST_CLARIFICATION') {
      bid.officerDecision = {
        decision: actionType,
        justification: justification || '',
        officerName: actor,
        officerRole: role,
        timestamp: new Date()
      };

      if (actionType === 'APPROVE') {
        bid.status = 'QUALIFIED';
      } else if (actionType === 'REJECT') {
        bid.status = 'DISQUALIFIED';
      } else if (actionType === 'REQUEST_CLARIFICATION') {
        bid.status = 'CLARIFICATION_REQUESTED';
        if (clarification) {
           bid.clarifications = bid.clarifications || [];
           bid.clarifications.push({
             id: `clar-${Date.now()}`,
             clauseReference: clarification.clauseReference,
             queryText: clarification.queryText,
             deadline: new Date(clarification.deadline),
             issuedAt: new Date(),
             issuedBy: actor,
             status: 'PENDING_RESPONSE'
           } as any);
        }
      }

      await bid.save();

      await auditService.log({
        actor,
        role,
        action: `DECISION_${actionType}`,
        bidId: id,
        details: `Recorded decision: ${actionType} for bid ${id}. Justification: ${justification}`,
      });

      // Convert for frontend
      const b = bid.toObject();
      const mappedBid = {
        ...b,
        id: b._id?.toString(),
      };

      return res.json({ success: true, bid: mappedBid, data: mappedBid });
    }

    return res.status(400).json({ success: false, message: 'Invalid action type', error: 'INVALID_ACTION' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message, error: 'UPDATE_FAILED' });
  }
});

export default router;
