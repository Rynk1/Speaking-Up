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
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      user_handle TEXT NOT NULL,
      is_verified INTEGER DEFAULT 1,
      content TEXT NOT NULL,
      likes_count INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
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
