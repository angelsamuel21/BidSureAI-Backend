import { Router } from 'express';
import multer from 'multer';
import { parseDocumentBuffer } from '../services/documents/parser';
import { UploadedDocument } from '../types';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
});

router.post('/', upload.array('files'), async (req, res) => {
  try {
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, error: 'No files provided.' });
    }

    const uploadedDocs: UploadedDocument[] = [];

    const allowedMimes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'text/plain'];

    for (const file of files) {
      if (!allowedMimes.includes(file.mimetype) && !file.originalname.endsWith('.pdf')) {
        return res.status(400).json({
          success: false,
          error: `Unsupported file type for "${file.originalname}". Allowed formats: PDF, JPG, PNG.`,
        });
      }

      // Parse document, extract SHA-256 and statutory entities
      const parsed = await parseDocumentBuffer(file.buffer, file.originalname, file.mimetype);

      const doc: UploadedDocument = {
        id: `doc-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        name: file.originalname,
        sizeBytes: file.size,
        mimeType: file.mimetype || 'application/pdf',
        sha256Hash: parsed.sha256Hash,
        documentType: parsed.documentType,
        uploadedAt: new Date().toISOString(),
        extractedText: parsed.rawText.substring(0, 3000), // First 3000 chars snippet
        extractedFields: parsed.extractedEntities,
      };

      uploadedDocs.push(doc);
    }

    return res.json({
      success: true,
      documents: uploadedDocs,
      message: `Successfully processed ${uploadedDocs.length} documents. SHA-256 integrity calculated.`,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
