import mongoose from 'mongoose'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'

// Load environment variables from .env if present
const envPath = path.join(process.cwd(), '.env')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [key, ...vals] = trimmed.split('=')
      const val = vals.join('=').replace(/^["']|["']$/g, '')
      if (!process.env[key]) {
        process.env[key] = val
      }
    }
  }
}

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/gem_compliance'

function calculateHash(prevHash, action, timestamp, actor, details) {
  const payload = `${prevHash}|${action}|${timestamp}|${actor}|${details}`
  return crypto.createHash('sha256').update(payload).digest('hex')
}

async function main() {
  console.log('Connecting to MongoDB via Mongoose...')
  console.log(`URI: ${MONGODB_URI.replace(/:([^:@]+)@/, ':****@')}`)

  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 4000,
    })
  } catch (err) {
    console.warn('\n⚠️  Could not reach MongoDB Atlas cluster:', err.message)
    console.log('💡 Reminder: Set your live MongoDB Atlas connection string in .env:')
    console.log('   MONGODB_URI="mongodb+srv://<username>:<password>@<cluster>.mongodb.net/gem_compliance?retryWrites=true&w=majority"')
    console.log('✓ Baseline demo dataset is active in Backend/db/store.ts for seamless local inspection.\n')
    process.exit(0)
  }

  const db = mongoose.connection.db

  console.log('Clearing existing collections for idempotent seed...')
  const collections = await db.listCollections().toArray()
  const collectionNames = collections.map((c) => c.name)

  for (const colName of [
    'users',
    'tenders',
    'tenderrequirements',
    'bidders',
    'bids',
    'documents',
    'verifications',
    'complianceresults',
    'clarifications',
    'auditlogs',
  ]) {
    if (collectionNames.includes(colName)) {
      await db.collection(colName).deleteMany({})
    }
  }

  console.log('Seeding demo users...')
  const defaultHash = crypto.createHash('sha256').update('password123').digest('hex')

  const usersCol = db.collection('users')
  const user1 = await usersCol.insertOne({
    name: 'Riya Kapoor',
    email: 'riya.kapoor@cpcl.gov.in',
    passwordHash: defaultHash,
    role: 'PROCUREMENT_OFFICER',
    department: 'Materials & Contracts, CPCL',
    createdAt: new Date(),
    updatedAt: new Date(),
  })

  await usersCol.insertOne({
    name: 'Col. K. S. Ramanathan',
    email: 'ks.ramanathan@cpcl.gov.in',
    passwordHash: defaultHash,
    role: 'VIGILANCE_AUDITOR',
    department: 'Chief Vigilance Office, CPCL',
    createdAt: new Date(),
    updatedAt: new Date(),
  })

  await usersCol.insertOne({
    name: 'Admin Desk',
    email: 'admin@cpcl.gov.in',
    passwordHash: defaultHash,
    role: 'SYSTEM_ADMIN',
    department: 'IT Systems & Architecture, CPCL',
    createdAt: new Date(),
    updatedAt: new Date(),
  })

  console.log('Seeding tender GEM/2026/001...')
  const requirements = [
    {
      id: 'req-1',
      code: 'STAT_GST',
      name: 'Active GST Registration',
      description: 'Bidder must possess active Regular taxpayer GSTIN with consistent legal name.',
      category: 'STATUTORY',
      mandatory: true,
      weight: 20,
      expectedDocumentType: 'GST_REGISTRATION_CERTIFICATE',
    },
    {
      id: 'req-2',
      code: 'STAT_PAN',
      name: 'Permanent Account Number (PAN)',
      description: 'Valid PAN registered with Income Tax Department matching entity name.',
      category: 'STATUTORY',
      mandatory: true,
      weight: 15,
      expectedDocumentType: 'PAN_CARD',
    },
    {
      id: 'req-3',
      code: 'STAT_DEBARMENT',
      name: 'Zero Debarment / Blacklisting Clearance',
      description: 'Bidder must have no active sanctions or blacklisting on CVC, GeM, or MoPNG records.',
      category: 'STATUTORY',
      mandatory: true,
      weight: 25,
      expectedDocumentType: 'DECLARATION',
    },
    {
      id: 'req-4',
      code: 'STAT_UDYAM',
      name: 'Udyam / MSME Registration',
      description: 'Micro/Small enterprise certificate for statutory EMD/turnover exemptions under PPP Order 2012.',
      category: 'STATUTORY',
      mandatory: false,
      weight: 10,
      expectedDocumentType: 'UDYAM_MSME_CERTIFICATE',
    },
    {
      id: 'req-5',
      code: 'TECH_MII',
      name: 'Make in India Local Content (>= 50%)',
      description: 'Class-I Local Supplier declaration with minimum 50% domestic value addition.',
      category: 'TECHNICAL',
      mandatory: true,
      weight: 15,
      expectedDocumentType: 'MAKE_IN_INDIA_DECLARATION',
      criteriaDetails: { minLocalContentPercent: 50 },
    },
    {
      id: 'req-6',
      code: 'TECH_OEM',
      name: 'Manufacturer Authorization Form (OEM)',
      description: 'Valid authorization letter from primary manufacturer agreeing to warranty commitments.',
      category: 'TECHNICAL',
      mandatory: true,
      weight: 15,
      expectedDocumentType: 'OEM_AUTHORIZATION_LETTER',
    },
  ]

  const tendersCol = db.collection('tenders')
  const tenderRes = await tendersCol.insertOne({
    tenderNumber: 'GEM/2026/001',
    tenderId: 'GEM/2026/001',
    title: 'Supply of Industrial Equipment',
    description:
      'Annual rate contract for certified personal protective equipment and industrial safety gear for CPCL Refinery.',
    department: 'CPCL',
    estimatedValueCr: 4.85,
    submissionDeadline: new Date('2026-09-30T18:00:00Z'),
    status: 'ACTIVE',
    requirements,
    createdAt: new Date('2026-08-01T10:00:00Z'),
    updatedAt: new Date('2026-08-01T10:00:00Z'),
  })
  const tenderId = tenderRes.insertedId.toString()

  // Seed TenderRequirements collection
  const reqsCol = db.collection('tenderrequirements')
  for (const r of requirements) {
    await reqsCol.insertOne({
      ...r,
      tenderId,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }

  console.log('Seeding 3 demo bidders...')
  const biddersCol = db.collection('bidders')

  const b1 = await biddersCol.insertOne({
    name: 'ABC Industries Pvt. Ltd.',
    legalName: 'ABC Industries Pvt. Ltd.',
    registrationNumber: 'REG-ABC-2018-0934',
    pan: 'ABCDE1234F',
    gstin: '09ABCDE1234F1Z5',
    udyamNumber: 'UDYAM-UP-01-0019284',
    address: 'Plot 42, Panki Industrial Area, Site-III, Kanpur, UP - 208022',
    category: 'MICRO',
    isDebarred: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  })
  const bidder1Id = b1.insertedId.toString()

  const b2 = await biddersCol.insertOne({
    name: 'XYZ Enterprises',
    legalName: 'XYZ Enterprises',
    registrationNumber: 'REG-XYZ-2019-4412',
    pan: 'AAACB1234P',
    gstin: '27AAACB1234P1Z8',
    udyamNumber: 'UDYAM-MH-12-0048192',
    address: 'Survey No 88, Bhosari MIDC, Pune, MH - 411026',
    category: 'SMALL',
    isDebarred: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  })
  const bidder2Id = b2.insertedId.toString()

  const b3 = await biddersCol.insertOne({
    name: 'PQR Technologies',
    legalName: 'PQR Technologies',
    registrationNumber: 'REG-PQR-2015-1120',
    pan: 'AAAAA0000A',
    gstin: '07AAAAA0000A1Z9',
    address: '14 Okhla Industrial Estate, Phase-II, New Delhi - 110020',
    category: 'MEDIUM',
    isDebarred: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  })
  const bidder3Id = b3.insertedId.toString()

  console.log('Seeding bids for ABC Industries, XYZ Enterprises, and PQR Technologies...')
  const bidsCol = db.collection('bids')
  const docsCol = db.collection('documents')
  const verifsCol = db.collection('verifications')
  const compCol = db.collection('complianceresults')
  const clarCol = db.collection('clarifications')

  // Bid 1: ABC Industries
  const bid1Docs = [
    {
      fileName: 'GST Certificate.pdf',
      fileType: 'application/pdf',
      fileSize: 1254820,
      sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      extractedFields: { gstin: '09ABCDE1234F1Z5', legalName: 'ABC Industries Pvt. Ltd.' },
      documentType: 'GST_REGISTRATION_CERTIFICATE',
    },
    {
      fileName: 'PAN Certificate.pdf',
      fileType: 'application/pdf',
      fileSize: 849310,
      sha256: 'a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e',
      extractedFields: { pan: 'ABCDE1234F', legalName: 'ABC Industries Pvt. Ltd.' },
      documentType: 'PAN_CARD',
    },
    {
      fileName: 'Udyam Certificate.pdf',
      fileType: 'application/pdf',
      fileSize: 1420500,
      sha256: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
      extractedFields: { udyamNumber: 'UDYAM-UP-01-0019284', enterpriseType: 'MICRO' },
      documentType: 'UDYAM_MSME_CERTIFICATE',
    },
    {
      fileName: 'OEM Authorization.pdf',
      fileType: 'application/pdf',
      fileSize: 1680120,
      sha256: '4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a',
      extractedFields: { isOemAuthorizationValid: true, oemLocalContentPercent: 65 },
      documentType: 'OEM_AUTHORIZATION_LETTER',
    },
    {
      fileName: 'Local Content Declaration.pdf',
      fileType: 'application/pdf',
      fileSize: 920400,
      sha256: 'ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d',
      extractedFields: { localContentPercent: 65 },
      documentType: 'MAKE_IN_INDIA_DECLARATION',
    },
  ]

  const bid1Verifs = [
    {
      ruleId: 'rule-gst',
      ruleName: 'GST Registration',
      status: 'PASS',
      source: 'PORTAL_SANDBOX',
      extractedValue: '09ABCDE1234F1Z5',
      verifiedValue: 'ABC Industries Pvt. Ltd.',
      evidence: 'GSTIN 09ABCDE1234F1Z5 is Active, Regular taxpayer (Sandbox Validation).',
      explanation: 'GST registration active in Sandbox Simulation.',
      score: 100,
    },
    {
      ruleId: 'rule-pan',
      ruleName: 'PAN Verification',
      status: 'PASS',
      source: 'PORTAL_SANDBOX',
      extractedValue: 'ABCDE1234F',
      verifiedValue: 'Operative',
      evidence: 'PAN ABCDE1234F is Operative and matches embedded GSTIN.',
      explanation: 'PAN verified operative (Sandbox Simulation).',
      score: 100,
    },
    {
      ruleId: 'rule-udyam',
      ruleName: 'Udyam Registration',
      status: 'PASS',
      source: 'PORTAL_SANDBOX',
      extractedValue: 'UDYAM-UP-01-0019284',
      verifiedValue: 'MICRO Enterprise',
      evidence: 'Valid Micro Enterprise. Eligible for EMD & prior experience exemption.',
      explanation: 'Udyam verified in Sandbox Simulation.',
      score: 100,
    },
    {
      ruleId: 'rule-mii',
      ruleName: 'Local Content (Make in India)',
      status: 'PASS',
      source: 'PORTAL_SANDBOX',
      extractedValue: '65%',
      verifiedValue: 'Class-I Local Supplier (>= 50%)',
      evidence: 'Local content of 65% meets required minimum of 50%.',
      explanation: 'Class-I Local Supplier classification confirmed.',
      score: 100,
    },
    {
      ruleId: 'rule-oem',
      ruleName: 'OEM Authorization',
      status: 'PASS',
      source: 'DOCUMENT_EXTRACTED',
      extractedValue: 'Valid OEM Authorization present',
      verifiedValue: 'Verified Legible',
      evidence: 'OEM letter verified with warranty commitments and valid tender reference.',
      explanation: 'Authorization verified active.',
      score: 95,
    },
    {
      ruleId: 'rule-debarment',
      ruleName: 'Debarment Check',
      status: 'PASS',
      source: 'PORTAL_SANDBOX',
      extractedValue: 'ABC Industries Pvt. Ltd.',
      verifiedValue: 'Clear',
      evidence: 'No active debarment orders found across CVC, MoPNG, or GeM registries.',
      explanation: 'Clearance verified against official debarment databases.',
      score: 100,
    },
  ]

  const bid1Eval = {
    overallScore: 94,
    riskLevel: 'LOW',
    riskFactors: [],
    recommendation: 'COMPLIANT',
    aiSummary: 'All statutory, financial, and technical credentials satisfy tender requirements.',
    ruleResults: bid1Verifs,
    aiFindings: [],
    portalVerifications: [],
    evaluatedAt: new Date('2026-08-18T10:42:00Z'),
  }

  const bid1OfficerDecision = {
    decision: 'APPROVE',
    justification:
      'All statutory, financial, and technical credentials satisfy tender requirements. Active GST and PAN verified.',
    officerName: 'Riya Kapoor',
    officerRole: 'PROCUREMENT_OFFICER',
    timestamp: new Date('2026-08-18T11:00:00Z'),
  }

  const b1Res = await bidsCol.insertOne({
    tenderId,
    tenderNumber: 'GEM/2026/001',
    bidderId: bidder1Id,
    bidderName: 'ABC Industries Pvt. Ltd.',
    status: 'QUALIFIED',
    complianceScore: 94,
    riskLevel: 'LOW',
    recommendation: 'COMPLIANT',
    decision: 'APPROVE',
    decisionReason: bid1OfficerDecision.justification,
    officerName: 'Riya Kapoor (Procurement Officer)',
    decisionTime: new Date('2026-08-18T11:00:00Z'),
    submittedAt: new Date('2026-08-18T10:15:00Z'),
    officerDecision: bid1OfficerDecision,
    evaluation: bid1Eval,
    documents: bid1Docs,
    verifications: bid1Verifs,
    clarifications: [],
    createdAt: new Date('2026-08-18T10:15:00Z'),
    updatedAt: new Date('2026-08-18T11:00:00Z'),
  })
  const bid1Id = b1Res.insertedId.toString()

  for (const d of bid1Docs) await docsCol.insertOne({ ...d, bidId: bid1Id, createdAt: new Date() })
  for (const v of bid1Verifs) await verifsCol.insertOne({ ...v, bidId: bid1Id, createdAt: new Date() })
  await compCol.insertOne({
    bidId: bid1Id,
    score: 94,
    riskLevel: 'LOW',
    status: 'COMPLIANT',
    summary:
      'Bidder satisfies all statutory registration criteria and meets Class-I Local Supplier qualifications. Zero debarment found.',
    evaluatedAt: new Date('2026-08-18T10:42:00Z'),
  })

  // Bid 2: XYZ Enterprises
  const bid2Docs = [
    {
      fileName: 'GST Certificate.pdf',
      fileType: 'application/pdf',
      fileSize: 1140000,
      sha256: 'b3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b811',
      extractedFields: { gstin: '27AAACB1234P1Z8', legalName: 'XYZ Enterprises' },
      documentType: 'GST_REGISTRATION_CERTIFICATE',
    },
    {
      fileName: 'PAN Certificate.pdf',
      fileType: 'application/pdf',
      fileSize: 780000,
      sha256: 'c591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f1422',
      extractedFields: { pan: 'AAACB1234P', legalName: 'XYZ Enterprises' },
      documentType: 'PAN_CARD',
    },
    {
      fileName: 'OEM Authorization.pdf',
      fileType: 'application/pdf',
      fileSize: 1540000,
      sha256: 'd591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f1433',
      extractedFields: { isOemAuthorizationValid: true, oemLocalContentPercent: 42 },
      documentType: 'OEM_AUTHORIZATION_LETTER',
    },
    {
      fileName: 'Local Content Declaration (65% Claimed).pdf',
      fileType: 'application/pdf',
      fileSize: 890000,
      sha256: 'e591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f1444',
      extractedFields: { localContentPercent: 65 },
      documentType: 'MAKE_IN_INDIA_DECLARATION',
    },
  ]

  const bid2Verifs = [
    {
      ruleId: 'rule-gst',
      ruleName: 'GST Registration',
      status: 'PASS',
      source: 'PORTAL_SANDBOX',
      extractedValue: '27AAACB1234P1Z8',
      verifiedValue: 'XYZ Enterprises',
      evidence: 'Active Regular Taxpayer in Maharashtra.',
      explanation: 'GST registration active in Sandbox Simulation.',
      score: 100,
    },
    {
      ruleId: 'rule-pan',
      ruleName: 'PAN Verification',
      status: 'PASS',
      source: 'PORTAL_SANDBOX',
      extractedValue: 'AAACB1234P',
      verifiedValue: 'Operative',
      evidence: 'PAN Operative and valid.',
      explanation: 'PAN verified operative in Sandbox Simulation.',
      score: 100,
    },
    {
      ruleId: 'rule-udyam',
      ruleName: 'Udyam Registration',
      status: 'PASS',
      source: 'PORTAL_SANDBOX',
      extractedValue: 'UDYAM-MH-12-0048192',
      verifiedValue: 'SMALL Enterprise',
      evidence: 'Registered Small Enterprise.',
      explanation: 'Udyam verified in Sandbox Simulation.',
      score: 100,
    },
    {
      ruleId: 'rule-oem',
      ruleName: 'OEM Authorization',
      status: 'PASS',
      source: 'DOCUMENT_EXTRACTED',
      extractedValue: 'OEM letter present',
      verifiedValue: 'Warranty commitment confirmed',
      evidence: 'Valid OEM letter with warranty commitment.',
      explanation: 'OEM authorization verified.',
      score: 95,
    },
    {
      ruleId: 'rule-mii',
      ruleName: 'Local Content (Make in India)',
      status: 'MANUAL_REVIEW',
      source: 'PORTAL_SANDBOX',
      extractedValue: '65% (Self-claimed)',
      verifiedValue: '42% in OEM Breakdown',
      evidence:
        'Self-declaration claims 65%, but OEM breakdown document specifies only 42% (below 50% minimum).',
      explanation: 'The submitted document indicates 42% local content, while the tender requires at least 50%.',
      score: 40,
    },
    {
      ruleId: 'rule-debarment',
      ruleName: 'Debarment Check',
      status: 'PASS',
      source: 'PORTAL_SANDBOX',
      extractedValue: 'XYZ Enterprises',
      verifiedValue: 'Clear',
      evidence: 'No sanctions found on CVC or MoPNG registries.',
      explanation: 'Clearance verified against official debarment databases.',
      score: 100,
    },
  ]

  const bid2Eval = {
    overallScore: 68,
    riskLevel: 'HIGH',
    riskFactors: ['Local content discrepancy: 42% in OEM breakdown vs 50% required'],
    recommendation: 'REQUIRES_MANUAL_REVIEW',
    aiSummary:
      'Material discrepancy detected: Bidder claims 65% local content in self-declaration, but OEM document specifies only 42%. Officer clarification required.',
    ruleResults: bid2Verifs,
    aiFindings: [],
    portalVerifications: [],
    evaluatedAt: new Date('2026-08-16T15:30:00Z'),
  }

  const bid2OfficerDecision = {
    decision: 'REQUEST_CLARIFICATION',
    justification:
      'Discrepancy detected: The submitted local-content document indicates 42%, while the tender requires at least 50%.',
    officerName: 'Riya Kapoor',
    officerRole: 'PROCUREMENT_OFFICER',
    timestamp: new Date('2026-08-16T16:00:00Z'),
  }

  const b2Res = await bidsCol.insertOne({
    tenderId,
    tenderNumber: 'GEM/2026/001',
    bidderId: bidder2Id,
    bidderName: 'XYZ Enterprises',
    status: 'CLARIFICATION_REQUESTED',
    complianceScore: 68,
    riskLevel: 'HIGH',
    recommendation: 'REQUIRES_MANUAL_REVIEW',
    decision: 'REQUEST_CLARIFICATION',
    decisionReason: bid2OfficerDecision.justification,
    officerName: 'Riya Kapoor (Procurement Officer)',
    decisionTime: new Date('2026-08-16T16:00:00Z'),
    submittedAt: new Date('2026-08-16T14:30:00Z'),
    officerDecision: bid2OfficerDecision,
    evaluation: bid2Eval,
    documents: bid2Docs,
    verifications: bid2Verifs,
    clarifications: [
      {
        clauseRef: 'PPP-MII Clause 3.4',
        clauseReference: 'PPP-MII Clause 3.4',
        issue: 'Local content percentage discrepancy',
        message:
          'Discrepancy detected: The submitted local-content document indicates 42%, while the tender requires at least 50%. Please provide certified CA verification.',
        queryText:
          'Discrepancy detected: The submitted local-content document indicates 42%, while the tender requires at least 50%. Please provide certified CA verification.',
        deadline: new Date('2026-08-25T17:00:00Z'),
        status: 'PENDING_RESPONSE',
        issuedBy: 'Riya Kapoor (Procurement Officer)',
      },
    ],
    createdAt: new Date('2026-08-16T14:30:00Z'),
    updatedAt: new Date('2026-08-16T16:00:00Z'),
  })
  const bid2Id = b2Res.insertedId.toString()

  for (const d of bid2Docs) await docsCol.insertOne({ ...d, bidId: bid2Id, createdAt: new Date() })
  for (const v of bid2Verifs) await verifsCol.insertOne({ ...v, bidId: bid2Id, createdAt: new Date() })
  await compCol.insertOne({
    bidId: bid2Id,
    score: 68,
    riskLevel: 'HIGH',
    status: 'REQUIRES_MANUAL_REVIEW',
    summary:
      'The submitted local-content document indicates 42%, while the tender requires at least 50%. Clarification recommended.',
    evaluatedAt: new Date('2026-08-16T15:30:00Z'),
  })
  await clarCol.insertOne({
    bidId: bid2Id,
    clauseRef: 'PPP-MII Clause 3.4',
    clauseReference: 'PPP-MII Clause 3.4',
    issue: 'Local content percentage discrepancy',
    message:
      'Discrepancy detected: The submitted local-content document indicates 42%, while the tender requires at least 50%. Please provide certified CA verification.',
    queryText:
      'Discrepancy detected: The submitted local-content document indicates 42%, while the tender requires at least 50%. Please provide certified CA verification.',
    deadline: new Date('2026-08-25T17:00:00Z'),
    status: 'PENDING_RESPONSE',
    issuedBy: 'Riya Kapoor (Procurement Officer)',
    issuedAt: new Date('2026-08-16T16:00:00Z'),
    createdAt: new Date('2026-08-16T16:00:00Z'),
    updatedAt: new Date('2026-08-16T16:00:00Z'),
  })

  // Bid 3: PQR Technologies
  const bid3Docs = [
    {
      fileName: 'GST Certificate.pdf',
      fileType: 'application/pdf',
      fileSize: 1050000,
      sha256: 'f3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b899',
      extractedFields: { gstin: '07AAAAA0000A1Z9', legalName: 'PQR Technologies' },
      documentType: 'GST_REGISTRATION_CERTIFICATE',
    },
    {
      fileName: 'PAN Certificate.pdf',
      fileType: 'application/pdf',
      fileSize: 690000,
      sha256: 'g591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f1488',
      extractedFields: { pan: 'AAAAA0000A', legalName: 'PQR Technologies' },
      documentType: 'PAN_CARD',
    },
    {
      fileName: 'OEM Authorization.pdf',
      fileType: 'application/pdf',
      fileSize: 1300000,
      sha256: 'h4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf77',
      extractedFields: { isOemAuthorizationValid: true },
      documentType: 'OEM_AUTHORIZATION_LETTER',
    },
  ]

  const bid3Verifs = [
    {
      ruleId: 'rule-debarment',
      ruleName: 'Debarment Check',
      status: 'FAIL',
      source: 'PORTAL_SANDBOX',
      extractedValue: 'PQR Technologies',
      verifiedValue: 'Active Debarment Found',
      evidence: 'Active debarment order on CVC and MoPNG blacklist.',
      explanation: 'Active debarment detected: Entity is debarred from government procurement.',
      score: 0,
    },
    {
      ruleId: 'rule-gst',
      ruleName: 'GST Registration',
      status: 'PASS',
      source: 'PORTAL_SANDBOX',
      extractedValue: '07AAAAA0000A1Z9',
      verifiedValue: 'PQR Technologies',
      evidence: 'GST registration active.',
      explanation: 'GST registration active in Sandbox Simulation.',
      score: 100,
    },
    {
      ruleId: 'rule-pan',
      ruleName: 'PAN Verification',
      status: 'PASS',
      source: 'PORTAL_SANDBOX',
      extractedValue: 'AAAAA0000A',
      verifiedValue: 'Operative',
      evidence: 'PAN Operative.',
      explanation: 'PAN verified operative in Sandbox Simulation.',
      score: 100,
    },
    {
      ruleId: 'rule-oem',
      ruleName: 'OEM Authorization',
      status: 'PASS',
      source: 'DOCUMENT_EXTRACTED',
      extractedValue: 'OEM letter present',
      verifiedValue: 'Confirmed',
      evidence: 'OEM letter verified.',
      explanation: 'Authorization verified.',
      score: 90,
    },
  ]

  const bid3Eval = {
    overallScore: 38,
    riskLevel: 'CRITICAL',
    riskFactors: ['Active debarment on CVC/MoPNG registry'],
    recommendation: 'NON-COMPLIANT',
    aiSummary:
      'Critical disqualification flags detected. Bidder is debarred on official registries.',
    ruleResults: bid3Verifs,
    aiFindings: [],
    portalVerifications: [],
    evaluatedAt: new Date('2026-08-12T11:00:00Z'),
  }

  const bid3OfficerDecision = {
    decision: 'REJECT',
    justification: 'Active debarment detected on Ministry of Petroleum & Natural Gas / CVC blacklist.',
    officerName: 'Riya Kapoor',
    officerRole: 'PROCUREMENT_OFFICER',
    timestamp: new Date('2026-08-12T11:30:00Z'),
  }

  const b3Res = await bidsCol.insertOne({
    tenderId,
    tenderNumber: 'GEM/2026/001',
    bidderId: bidder3Id,
    bidderName: 'PQR Technologies',
    status: 'DISQUALIFIED',
    complianceScore: 38,
    riskLevel: 'CRITICAL',
    recommendation: 'NON-COMPLIANT',
    decision: 'REJECT',
    decisionReason: bid3OfficerDecision.justification,
    officerName: 'Riya Kapoor (Procurement Officer)',
    decisionTime: new Date('2026-08-12T11:30:00Z'),
    submittedAt: new Date('2026-08-12T09:00:00Z'),
    officerDecision: bid3OfficerDecision,
    evaluation: bid3Eval,
    documents: bid3Docs,
    verifications: bid3Verifs,
    clarifications: [],
    createdAt: new Date('2026-08-12T09:00:00Z'),
    updatedAt: new Date('2026-08-12T11:30:00Z'),
  })
  const bid3Id = b3Res.insertedId.toString()

  for (const d of bid3Docs) await docsCol.insertOne({ ...d, bidId: bid3Id, createdAt: new Date() })
  for (const v of bid3Verifs) await verifsCol.insertOne({ ...v, bidId: bid3Id, createdAt: new Date() })
  await compCol.insertOne({
    bidId: bid3Id,
    score: 38,
    riskLevel: 'CRITICAL',
    status: 'NON-COMPLIANT',
    summary:
      'Active debarment detected on Ministry of Petroleum & Natural Gas / CVC blacklist. Mandatory rejection required.',
    evaluatedAt: new Date('2026-08-12T11:00:00Z'),
  })

  console.log('Seeding tamper-evident audit logs with SHA-256 block chain...')
  const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000'
  const auditLogsCol = db.collection('auditlogs')

  const t1 = '2026-08-01T10:00:00.000Z'
  const h1 = calculateHash(
    GENESIS_HASH,
    'TENDER_PUBLISHED',
    t1,
    'Riya Kapoor',
    `Tender GEM/2026/001 published with 6 mandatory/technical compliance rules.`
  )
  await auditLogsCol.insertOne({
    userId: user1.insertedId.toString(),
    actor: 'Riya Kapoor',
    role: 'PROCUREMENT_OFFICER',
    action: 'TENDER_PUBLISHED',
    tenderId: 'GEM/2026/001',
    details: `Tender GEM/2026/001 published with 6 mandatory/technical compliance rules.`,
    timestamp: new Date(t1),
    previousHash: GENESIS_HASH,
    hash: h1,
    currentHash: h1,
    createdAt: new Date(t1),
  })

  const t2 = '2026-08-18T10:20:00.000Z'
  const h2 = calculateHash(
    h1,
    'BID_DOCUMENTS_INGESTED',
    t2,
    'Riya Kapoor',
    `Bid submitted by ABC Industries Pvt. Ltd. with 5 PDF verification documents (SHA-256 verified).`
  )
  await auditLogsCol.insertOne({
    userId: user1.insertedId.toString(),
    actor: 'Riya Kapoor',
    role: 'PROCUREMENT_OFFICER',
    action: 'BID_DOCUMENTS_INGESTED',
    tenderId: 'GEM/2026/001',
    bidId: bid1Id,
    details: `Bid submitted by ABC Industries Pvt. Ltd. with 5 PDF verification documents (SHA-256 verified).`,
    timestamp: new Date(t2),
    previousHash: h1,
    hash: h2,
    currentHash: h2,
    createdAt: new Date(t2),
  })

  const t3 = '2026-08-18T10:42:00.000Z'
  const h3 = calculateHash(
    h2,
    'COMPLIANCE_EVALUATION_COMPLETED',
    t3,
    'Automated Compliance Pipeline',
    `Automated compliance score generated: 94/100 (Risk: LOW). Recommendation: COMPLIANT.`
  )
  await auditLogsCol.insertOne({
    actor: 'Automated Compliance Pipeline',
    role: 'PROCUREMENT_OFFICER',
    action: 'COMPLIANCE_EVALUATION_COMPLETED',
    tenderId: 'GEM/2026/001',
    bidId: bid1Id,
    details: `Automated compliance score generated: 94/100 (Risk: LOW). Recommendation: COMPLIANT.`,
    timestamp: new Date(t3),
    previousHash: h2,
    hash: h3,
    currentHash: h3,
    createdAt: new Date(t3),
  })

  const t4 = '2026-08-18T11:00:00.000Z'
  const h4 = calculateHash(
    h3,
    'OFFICER_DECISION_APPROVE',
    t4,
    'Riya Kapoor',
    `Procurement Officer approved bid for ABC Industries Pvt. Ltd.. Justification: All credentials satisfied.`
  )
  await auditLogsCol.insertOne({
    userId: user1.insertedId.toString(),
    actor: 'Riya Kapoor',
    role: 'PROCUREMENT_OFFICER',
    action: 'OFFICER_DECISION_APPROVE',
    tenderId: 'GEM/2026/001',
    bidId: bid1Id,
    details: `Procurement Officer approved bid for ABC Industries Pvt. Ltd.. Justification: All credentials satisfied.`,
    timestamp: new Date(t4),
    previousHash: h3,
    hash: h4,
    currentHash: h4,
    createdAt: new Date(t4),
  })

  console.log('MongoDB successfully seeded with demo scenarios, users, and audit records!')
}

main()
  .catch((err) => {
    console.error('Seed error:', err)
    process.exit(1)
  })
  .finally(async () => {
    await mongoose.disconnect()
  })
