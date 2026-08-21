import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'speakup.db');
const db = new Database(dbPath);

// Enable foreign keys & WAL mode for concurrency
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

export function initDatabase() {
  console.log(`Initializing SQLite database at: ${dbPath}`);

  // Create Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      handle TEXT UNIQUE NOT NULL,
      avatar TEXT,
      role TEXT NOT NULL DEFAULT 'CITIZEN',
      is_verified INTEGER NOT NULL DEFAULT 0,
      followers_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // Create Institutions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS institutions (
      id TEXT PRIMARY KEY,
      official_name TEXT NOT NULL,
      short_name TEXT NOT NULL,
      acronym TEXT NOT NULL,
      mandate TEXT NOT NULL,
      category TEXT NOT NULL,
      jurisdiction TEXT NOT NULL DEFAULT 'NATIONAL',
      logo TEXT,
      official_website TEXT,
      official_contacts_json TEXT,
      social_accounts_json TEXT,
      email_channels_json TEXT,
      whatsapp_channels_json TEXT,
      alert_method TEXT NOT NULL DEFAULT 'OFFICIAL_EMAIL',
      active_mentions_count INTEGER NOT NULL DEFAULT 0,
      unanswered_mentions_count INTEGER NOT NULL DEFAULT 0,
      official_responses_count INTEGER NOT NULL DEFAULT 0,
      avg_response_hours REAL NOT NULL DEFAULT 4.0,
      verification_status TEXT NOT NULL DEFAULT 'VERIFIED',
      source_documents_json TEXT,
      verification_date TEXT,
      verified_by TEXT,
      next_review_date TEXT,
      created_at TEXT NOT NULL
    );
  `);

  // Create Posts table
  db.exec(`
    CREATE TABLE IF NOT EXISTS posts (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      original_language TEXT NOT NULL DEFAULT 'English',
      translated_text TEXT,
      author_id TEXT NOT NULL,
      author_name TEXT NOT NULL,
      author_handle TEXT NOT NULL,
      author_avatar TEXT,
      author_visibility TEXT NOT NULL DEFAULT 'public',
      is_verified_citizen INTEGER NOT NULL DEFAULT 0,
      category TEXT NOT NULL,
      subcategory TEXT,
      urgency TEXT NOT NULL DEFAULT 'NORMAL',
      severity TEXT NOT NULL DEFAULT 'MODERATE',
      region TEXT NOT NULL,
      district TEXT NOT NULL,
      landmark TEXT,
      latitude REAL,
      longitude REAL,
      location_accuracy TEXT DEFAULT 'exact',
      location_visibility TEXT DEFAULT 'exact',
      hashtags_json TEXT,
      visibility TEXT NOT NULL DEFAULT 'public',
      moderation_status TEXT NOT NULL DEFAULT 'approved',
      issue_cluster_id TEXT,
      views_count INTEGER NOT NULL DEFAULT 1,
      reposts_count INTEGER NOT NULL DEFAULT 0,
      shares_count INTEGER NOT NULL DEFAULT 0,
      confirmations_count INTEGER NOT NULL DEFAULT 1,
      comments_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Create Institution Tags & Alert Tracking table
  db.exec(`
    CREATE TABLE IF NOT EXISTS post_institution_tags (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL,
      institution_id TEXT NOT NULL,
      institution_name TEXT NOT NULL,
      short_name TEXT,
      acronym TEXT,
      alert_requested INTEGER NOT NULL DEFAULT 1,
      alert_status TEXT NOT NULL DEFAULT 'PENDING',
      alert_method_used TEXT,
      delivery_timestamp TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
      FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE
    );
  `);

  // Create Media Pipeline Metadata table
  db.exec(`
    CREATE TABLE IF NOT EXISTS media (
      id TEXT PRIMARY KEY,
      post_id TEXT,
      type TEXT NOT NULL, -- 'image', 'audio', 'video'
      url TEXT NOT NULL,
      thumbnail_url TEXT,
      caption TEXT,
      mime_type TEXT,
      size_bytes INTEGER,
      duration_seconds REAL,
      uploaded_at TEXT NOT NULL,
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
    );
  `);

  // Create Issue Followers table (Issue Followershp - No User Followers Needed)
  db.exec(`
    CREATE TABLE IF NOT EXISTS issue_followers (
      user_id TEXT NOT NULL,
      post_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, post_id),
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
    )
  `);

  // Create Confirmations table ("I'm seeing this too")
  db.exec(`
    CREATE TABLE IF NOT EXISTS confirmations (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(post_id, user_id),
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
    );
  `);

  // Create Community Evidence Updates table
  db.exec(`
    CREATE TABLE IF NOT EXISTS community_evidence (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      user_handle TEXT NOT NULL,
      text TEXT NOT NULL,
      status_update TEXT DEFAULT 'still_ongoing',
      created_at TEXT NOT NULL,
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
    );
  `);

  // Create Comments table
  db.exec(`
    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL,
      parent_comment_id TEXT,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      user_handle TEXT NOT NULL,
      is_verified INTEGER DEFAULT 1,
      content TEXT NOT NULL,
      likes_count INTEGER DEFAULT 0,
      tags_json TEXT DEFAULT '[]',
      created_at TEXT NOT NULL,
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
    );
  `);

  // Create Comment Likes table
  db.exec(`
    CREATE TABLE IF NOT EXISTS comment_likes (
      user_id TEXT NOT NULL,
      comment_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (user_id, comment_id)
    );
  `);

  // Create Official Institution Responses table
  db.exec(`
    CREATE TABLE IF NOT EXISTS institution_responses (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL,
      institution_id TEXT NOT NULL,
      institution_name TEXT NOT NULL,
      institution_logo TEXT,
      response_type TEXT NOT NULL DEFAULT 'WE_ARE_AWARE',
      message TEXT NOT NULL,
      statement_title TEXT,
      full_statement TEXT,
      reference_number TEXT,
      action_timeline_json TEXT,
      resolution_status TEXT DEFAULT 'IN_PROGRESS',
      documents_json TEXT,
      hotlines_json TEXT,
      helpful_count INTEGER DEFAULT 0,
      unhelpful_count INTEGER DEFAULT 0,
      official INTEGER NOT NULL DEFAULT 1,
      verified INTEGER NOT NULL DEFAULT 1,
      responder_name TEXT NOT NULL,
      responder_title TEXT NOT NULL,
      redirected_to_institution_id TEXT,
      redirected_to_institution_name TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
      FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE
    );
  `);

  // Safe migrations for existing SQLite databases
  const responseColumns = [
    { name: 'statement_title', type: 'TEXT' },
    { name: 'full_statement', type: 'TEXT' },
    { name: 'reference_number', type: 'TEXT' },
    { name: 'action_timeline_json', type: 'TEXT' },
    { name: 'resolution_status', type: 'TEXT DEFAULT "IN_PROGRESS"' },
    { name: 'documents_json', type: 'TEXT' },
    { name: 'hotlines_json', type: 'TEXT' },
    { name: 'helpful_count', type: 'INTEGER DEFAULT 0' },
    { name: 'unhelpful_count', type: 'INTEGER DEFAULT 0' }
  ];

  for (const col of responseColumns) {
    try {
      db.exec(`ALTER TABLE institution_responses ADD COLUMN ${col.name} ${col.type}`);
    } catch (e) {
      // Column already exists
    }
  }

  // Create Response Comments table (Citizen comments & replies directly to state statements)
  db.exec(`
    CREATE TABLE IF NOT EXISTS response_comments (
      id TEXT PRIMARY KEY,
      response_id TEXT NOT NULL,
      post_id TEXT,
      parent_comment_id TEXT,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      user_handle TEXT NOT NULL,
      user_avatar TEXT,
      is_verified INTEGER DEFAULT 1,
      content TEXT NOT NULL,
      likes_count INTEGER DEFAULT 0,
      tags_json TEXT DEFAULT '[]',
      created_at TEXT NOT NULL,
      FOREIGN KEY (response_id) REFERENCES institution_responses(id) ON DELETE CASCADE
    );
  `);

  // Create Response Helpfulness Votes table
  db.exec(`
    CREATE TABLE IF NOT EXISTS response_votes (
      user_id TEXT NOT NULL,
      response_id TEXT NOT NULL,
      vote_type TEXT NOT NULL, -- 'helpful' | 'unhelpful'
      created_at TEXT NOT NULL,
      PRIMARY KEY (user_id, response_id),
      FOREIGN KEY (response_id) REFERENCES institution_responses(id) ON DELETE CASCADE
    );
  `);

  // Create Issue Clusters table
  db.exec(`
    CREATE TABLE IF NOT EXISTS issue_clusters (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      region TEXT NOT NULL,
      district TEXT NOT NULL,
      summary TEXT NOT NULL,
      total_confirmations INTEGER NOT NULL DEFAULT 1,
      trend_score INTEGER NOT NULL DEFAULT 50,
      status TEXT NOT NULL DEFAULT 'TRENDING',
      primary_institutions_json TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // Create Notifications table
  db.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      post_id TEXT,
      institution_name TEXT,
      read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
  `);

  // Create Abuse & Moderation Reports table
  db.exec(`
    CREATE TABLE IF NOT EXISTS abuse_reports (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL,
      user_id TEXT,
      reason TEXT NOT NULL,
      details TEXT,
      status TEXT NOT NULL DEFAULT 'PENDING',
      created_at TEXT NOT NULL,
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
    );
  `);

  // Create Audit Logs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      user_id TEXT,
      details_json TEXT,
      ip_address TEXT,
      created_at TEXT NOT NULL
    );
  `);

  // Create Drafts table for offline/low-bandwidth recovery
  db.exec(`
    CREATE TABLE IF NOT EXISTS drafts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      draft_data_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // ==========================================
  // P³RE (PRIVACY-PRESERVING PUBLIC REPRESENTATION ENGINE) TABLES
  // ==========================================

  // 1. Submissions (Canonical Citizen Submissions)
  db.exec(`
    CREATE TABLE IF NOT EXISTS submissions (
      id TEXT PRIMARY KEY,
      author_id TEXT NOT NULL,
      post_type TEXT NOT NULL DEFAULT 'CIVIC_REPORT',
      claim_type TEXT NOT NULL DEFAULT 'OBSERVATION',
      visibility TEXT NOT NULL DEFAULT 'public',
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      privacy_status TEXT NOT NULL DEFAULT 'PRIVACY_PROCESSING',
      moderation_status TEXT NOT NULL DEFAULT 'approved',
      verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // 2. Submission Sources (Immutable Original References)
  db.exec(`
    CREATE TABLE IF NOT EXISTS submission_sources (
      id TEXT PRIMARY KEY,
      submission_id TEXT NOT NULL,
      source_type TEXT NOT NULL, -- TEXT, IMAGE, VIDEO, AUDIO, DOCUMENT
      storage_object_id TEXT NOT NULL,
      mime_type TEXT,
      size INTEGER,
      sha256 TEXT,
      content_text TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE
    );
  `);

  // 3. Submission Public Projections (Sanitized Public Views Consumed by APIs)
  db.exec(`
    CREATE TABLE IF NOT EXISTS submission_public_projections (
      id TEXT PRIMARY KEY,
      submission_id TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      title TEXT NOT NULL,
      text TEXT NOT NULL,
      media_references_json TEXT DEFAULT '[]',
      caption TEXT,
      summary TEXT,
      generated_by TEXT NOT NULL DEFAULT 'P3RE_AUTOMATED',
      policy_version TEXT NOT NULL DEFAULT '1.0',
      redaction_version TEXT NOT NULL DEFAULT '1.0',
      status TEXT NOT NULL DEFAULT 'PRIVACY_READY',
      created_at TEXT NOT NULL,
      FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE
    );
  `);

  // 4. Submission Protected Evidence (Protected Evidence Packages)
  db.exec(`
    CREATE TABLE IF NOT EXISTS submission_protected_evidence (
      id TEXT PRIMARY KEY,
      submission_id TEXT NOT NULL,
      source_id TEXT NOT NULL,
      storage_object_id TEXT NOT NULL,
      access_policy TEXT NOT NULL DEFAULT 'INSTITUTION_ONLY',
      classification TEXT NOT NULL DEFAULT 'PROTECTED_CIVIC_EVIDENCE',
      retention_policy TEXT NOT NULL DEFAULT 'STANDARD_LEGAL',
      created_at TEXT NOT NULL,
      FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE,
      FOREIGN KEY (source_id) REFERENCES submission_sources(id) ON DELETE CASCADE
    );
  `);

  // 5. Privacy Findings (Detected PII, OCR, Face, Plate, and Context Findings)
  db.exec(`
    CREATE TABLE IF NOT EXISTS privacy_findings (
      id TEXT PRIMARY KEY,
      submission_id TEXT NOT NULL,
      source_id TEXT,
      type TEXT NOT NULL,
      confidence REAL NOT NULL DEFAULT 1.0,
      severity TEXT NOT NULL DEFAULT 'MODERATE',
      start_offset INTEGER,
      end_offset INTEGER,
      bounding_box_json TEXT,
      detector TEXT NOT NULL,
      detector_version TEXT NOT NULL DEFAULT '1.0',
      policy_action TEXT NOT NULL DEFAULT 'REDACT',
      created_at TEXT NOT NULL,
      FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE
    );
  `);

  // 6. Privacy Policies (Data-driven Policy Engine Rules)
  db.exec(`
    CREATE TABLE IF NOT EXISTS privacy_policies (
      id TEXT PRIMARY KEY,
      policy_name TEXT NOT NULL,
      version TEXT NOT NULL DEFAULT '1.0',
      jurisdiction TEXT NOT NULL DEFAULT 'GHANA',
      content_type TEXT NOT NULL,
      finding_type TEXT NOT NULL,
      audience TEXT NOT NULL,
      action TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1
    );
  `);

  // 7. Representation Versions (Auditable Derivative History)
  db.exec(`
    CREATE TABLE IF NOT EXISTS representation_versions (
      id TEXT PRIMARY KEY,
      submission_id TEXT NOT NULL,
      representation_type TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      source_hash TEXT NOT NULL,
      policy_version TEXT NOT NULL DEFAULT '1.0',
      detector_version TEXT NOT NULL DEFAULT '1.0',
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      created_at TEXT NOT NULL,
      FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE
    );
  `);

  // 8. Evidence Access Logs (Institutional Access Audit Log)
  db.exec(`
    CREATE TABLE IF NOT EXISTS evidence_access_logs (
      id TEXT PRIMARY KEY,
      submission_id TEXT NOT NULL,
      actor_id TEXT NOT NULL,
      institution_id TEXT,
      action TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      ip TEXT,
      reason TEXT,
      result TEXT NOT NULL DEFAULT 'ALLOWED',
      FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE
    );
  `);

  // Insert Default P³RE Privacy Policies if missing
  const policyCount = (db.prepare('SELECT COUNT(*) as count FROM privacy_policies').get() as any)?.count || 0;
  if (policyCount === 0) {
    const insertPolicy = db.prepare(`
      INSERT INTO privacy_policies (id, policy_name, version, jurisdiction, content_type, finding_type, audience, action, enabled)
      VALUES (?, ?, '1.0', 'GHANA', ?, ?, ?, ?, 1)
    `);

    const defaultPolicies = [
      { id: 'pol-1', name: 'Private Citizen Name Policy', type: 'TEXT', finding: 'PERSON_NAME', audience: 'PUBLIC', action: 'REDACT' },
      { id: 'pol-2', name: 'Phone Number Policy', type: 'TEXT', finding: 'PHONE_NUMBER', audience: 'PUBLIC', action: 'REDACT' },
      { id: 'pol-3', name: 'Email Address Policy', type: 'TEXT', finding: 'EMAIL', audience: 'PUBLIC', action: 'REDACT' },
      { id: 'pol-4', name: 'Ghana Card ID Policy', type: 'TEXT', finding: 'GOVERNMENT_ID', audience: 'PUBLIC', action: 'REDACT' },
      { id: 'pol-5', name: 'Vehicle License Plate Policy', type: 'IMAGE', finding: 'LICENSE_PLATE', audience: 'PUBLIC', action: 'REDACT' },
      { id: 'pol-6', name: 'Bystander Face Policy', type: 'IMAGE', finding: 'FACE', audience: 'PUBLIC', action: 'REDACT' },
      { id: 'pol-7', name: 'Public Official Name Policy', type: 'TEXT', finding: 'PERSON_NAME', audience: 'INSTITUTION', action: 'ALLOW' },
      { id: 'pol-8', name: 'Institution Evidence Full View', type: 'TEXT', finding: 'GOVERNMENT_ID', audience: 'INSTITUTION', action: 'ALLOW' }
    ];

    for (const p of defaultPolicies) {
      insertPolicy.run(p.id, p.name, p.type, p.finding, p.audience, p.action);
    }
  }

  // Indexes for high performance queries
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_posts_region ON posts(region);
    CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category);
    CREATE INDEX IF NOT EXISTS idx_posts_urgency ON posts(urgency);
    CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at);
    CREATE INDEX IF NOT EXISTS idx_inst_tags_post ON post_institution_tags(post_id);
    CREATE INDEX IF NOT EXISTS idx_inst_tags_inst ON post_institution_tags(institution_id);
    CREATE INDEX IF NOT EXISTS idx_responses_post ON institution_responses(post_id);
    CREATE INDEX IF NOT EXISTS idx_confirmations_post ON confirmations(post_id);
  `);

  console.log('Database tables and indexes verified successfully.');
}

export { db };
