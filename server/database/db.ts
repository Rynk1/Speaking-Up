import Database from 'better-sqlite3';
import path from 'path';
import { config } from '../config';

const dbPath = config.databasePath;
const db = new Database(dbPath);

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

  // SpeakUp Social Distribution Engine (SSDE) Tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS social_share_packages (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL,
      response_id TEXT,
      platform TEXT NOT NULL,
      creator_context TEXT NOT NULL DEFAULT 'general',
      package_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS social_share_events (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL,
      response_id TEXT,
      user_id TEXT,
      creator_id TEXT,
      platform TEXT NOT NULL,
      content_type TEXT NOT NULL DEFAULT 'SHARE_ASSIST',
      share_method TEXT DEFAULT 'NATIVE_SHARE',
      referral_code TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS social_click_events (
      id TEXT PRIMARY KEY,
      referral_code TEXT NOT NULL,
      post_id TEXT NOT NULL,
      response_id TEXT,
      creator_id TEXT,
      platform TEXT NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS creator_profiles (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL,
      creator_name TEXT NOT NULL,
      handle TEXT NOT NULL,
      primary_platform TEXT NOT NULL DEFAULT 'YOUTUBE',
      platform_links_json TEXT DEFAULT '{}',
      is_verified_creator INTEGER NOT NULL DEFAULT 1,
      total_shares INTEGER NOT NULL DEFAULT 0,
      total_clicks INTEGER NOT NULL DEFAULT 0,
      total_conversions INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS creator_referrals (
      code TEXT PRIMARY KEY,
      creator_id TEXT,
      post_id TEXT NOT NULL,
      response_id TEXT,
      platform TEXT NOT NULL,
      campaign TEXT DEFAULT 'creator-share',
      created_at TEXT NOT NULL,
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
    );
  `);

  // Create Institutions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS institutions (
      id TEXT PRIMARY KEY,
      official_name TEXT NOT NULL,
      legal_name TEXT,
      short_name TEXT NOT NULL,
      acronym TEXT NOT NULL,
      mandate TEXT NOT NULL,
      category TEXT NOT NULL,
      jurisdiction TEXT NOT NULL DEFAULT 'NATIONAL',
      scope TEXT NOT NULL DEFAULT 'NATIONAL',
      parent_ministry_id TEXT,
      logo TEXT,
      official_website TEXT,
      official_contacts_json TEXT,
      social_accounts_json TEXT,
      email_channels_json TEXT,
      whatsapp_channels_json TEXT,
      alert_method TEXT NOT NULL DEFAULT 'OFFICIAL_EMAIL',
      partnership_status TEXT NOT NULL DEFAULT 'IDENTIFIED',
      operating_agreement_json TEXT,
      sla_policy_json TEXT,
      escalation_policy_json TEXT,
      api_credentials_json TEXT,
      webhook_config_json TEXT,
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

  // Create Institution Users & RBAC Roles table
  db.exec(`
    CREATE TABLE IF NOT EXISTS institution_users (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      institution_id TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'DUTY_OFFICER', -- ADMIN, DUTY_OFFICER, CASE_OFFICER, COMMUNICATIONS_OFFICER, REGIONAL_OFFICER, EXECUTIVE_OBSERVER
      department TEXT,
      regional_scope TEXT,
      district_scope TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
      UNIQUE(user_id, institution_id)
    );
  `);

  // Attributed User Amplifications table
  db.exec(`
    CREATE TABLE IF NOT EXISTS amplifications (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      ip_hash TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
      UNIQUE(post_id, user_id)
    );
  `);

  // Moderation Events Log (Phase 16 & 28)
  db.exec(`
    CREATE TABLE IF NOT EXISTS moderation_events (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL,
      moderator_id TEXT NOT NULL,
      classification TEXT NOT NULL, -- SAFE, NEEDS_REVIEW, RESTRICTED, REMOVED, LEGAL_REVIEW, EMERGENCY_RISK
      action TEXT NOT NULL, -- APPROVE, HOLD, REMOVE, ESCALATE, RESTRICT
      reason TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
    );
  `);

  // Institution Internal Assignments (Phase 12 & 32)
  db.exec(`
    CREATE TABLE IF NOT EXISTS institution_assignments (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL,
      institution_id TEXT NOT NULL,
      assigned_to_user_id TEXT NOT NULL,
      assigned_by_user_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'ASSIGNED',
      notes TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
      FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE
    );
  `);

  // Institution Clarification Requests (Phase 12 & 32)
  db.exec(`
    CREATE TABLE IF NOT EXISTS clarification_requests (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL,
      institution_id TEXT NOT NULL,
      official_user_id TEXT NOT NULL,
      question TEXT NOT NULL,
      public_response TEXT,
      status TEXT NOT NULL DEFAULT 'PENDING',
      created_at TEXT NOT NULL,
      responded_at TEXT,
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
      FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE
    );
  `);

  // Post Signal & Institutional Priority Scores Cache
  db.exec(`
    CREATE TABLE IF NOT EXISTS post_signal_scores (
      post_id TEXT PRIMARY KEY,
      severity_score REAL NOT NULL DEFAULT 0.0,
      confidence_score REAL NOT NULL DEFAULT 0.0,
      confirmation_count INTEGER NOT NULL DEFAULT 0,
      amplification_count INTEGER NOT NULL DEFAULT 0,
      evidence_count INTEGER NOT NULL DEFAULT 0,
      ips_score REAL NOT NULL DEFAULT 0.0,
      formula_version TEXT NOT NULL DEFAULT 'v1.0',
      updated_at TEXT NOT NULL,
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
    );
  `);

  // Institution Alert Deliveries Log
  db.exec(`
    CREATE TABLE IF NOT EXISTS institution_deliveries (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL,
      institution_id TEXT NOT NULL,
      channel_type TEXT NOT NULL,
      status TEXT NOT NULL,
      gateway_response TEXT,
      idempotency_key TEXT,
      dispatched_at TEXT NOT NULL,
      delivered_at TEXT,
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
      FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE
    );
  `);

  // Institution Resolution Actions
  db.exec(`
    CREATE TABLE IF NOT EXISTS institution_actions (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL,
      institution_id TEXT NOT NULL,
      action_title TEXT NOT NULL,
      description TEXT NOT NULL,
      evidence_urls_json TEXT DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'IN_PROGRESS',
      actor_name TEXT NOT NULL,
      actor_title TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
      FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE
    );
  `);

  // Community Outcome Confirmations
  db.exec(`
    CREATE TABLE IF NOT EXISTS outcome_confirmations (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      vote TEXT NOT NULL,
      comment TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
      UNIQUE(post_id, user_id)
    );
  `);

  // Create Institution Channels table (Data-driven alert routing & Channel Health)
  db.exec(`
    CREATE TABLE IF NOT EXISTS institution_channels (
      id TEXT PRIMARY KEY,
      institution_id TEXT NOT NULL,
      channel_type TEXT NOT NULL, -- 'EMAIL', 'WEBHOOK', 'SMS', 'WHATSAPP', 'PUSH'
      endpoint TEXT NOT NULL,
      priority INTEGER NOT NULL DEFAULT 1,
      enabled INTEGER NOT NULL DEFAULT 1,
      verified INTEGER NOT NULL DEFAULT 1,
      health_status TEXT NOT NULL DEFAULT 'OPERATIONAL', -- 'OPERATIONAL', 'DEGRADED', 'DOWN'
      failure_count INTEGER NOT NULL DEFAULT 0,
      last_health_check TEXT,
      region TEXT,
      district TEXT,
      department TEXT,
      secret_key TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE
    );
  `);

  // Create Core Alerts Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL,
      cluster_id TEXT,
      institution_id TEXT NOT NULL,
      priority_tier TEXT NOT NULL DEFAULT 'TIER_1', -- TIER_0_DASHBOARD, TIER_1_IMMEDIATE, TIER_2_HIGH, TIER_3_CRITICAL, TIER_4_ESCALATION, TIER_5_EXCEPTIONAL
      urgency TEXT NOT NULL DEFAULT 'NORMAL',
      awareness_status TEXT NOT NULL DEFAULT 'UNOPENED', -- UNOPENED, VIEWED, ACKNOWLEDGED
      transport_status TEXT NOT NULL DEFAULT 'QUEUED', -- QUEUED, SENDING, SENT, DELIVERED, FAILED, EXPIRED, SUPPRESSED
      acknowledged_by_user_id TEXT,
      acknowledged_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
      FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE
    );
  `);

  // Create Alert Escalations Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS alert_escalations (
      id TEXT PRIMARY KEY,
      alert_id TEXT NOT NULL,
      post_id TEXT NOT NULL,
      institution_id TEXT NOT NULL,
      escalation_level INTEGER NOT NULL DEFAULT 1,
      escalated_to_role TEXT NOT NULL,
      escalated_to_user_id TEXT,
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING, RESOLVED, EXPIRED
      created_at TEXT NOT NULL,
      resolved_at TEXT,
      FOREIGN KEY (alert_id) REFERENCES alerts(id) ON DELETE CASCADE,
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
      FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE
    );
  `);

  // Create Channel Health Logs Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS channel_health_logs (
      id TEXT PRIMARY KEY,
      channel_id TEXT NOT NULL,
      institution_id TEXT NOT NULL,
      channel_type TEXT NOT NULL,
      status TEXT NOT NULL, -- OPERATIONAL, DEGRADED, DOWN
      response_time_ms INTEGER,
      error_message TEXT,
      checked_at TEXT NOT NULL,
      FOREIGN KEY (channel_id) REFERENCES institution_channels(id) ON DELETE CASCADE,
      FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE
    );
  `);

  // Create Dead Letter Queue Alerts Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS dead_letter_alerts (
      id TEXT PRIMARY KEY,
      alert_id TEXT NOT NULL,
      post_id TEXT NOT NULL,
      institution_id TEXT NOT NULL,
      channel_type TEXT NOT NULL,
      last_error TEXT NOT NULL,
      retry_attempts INTEGER NOT NULL DEFAULT 3,
      created_at TEXT NOT NULL,
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
      FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE
    );
  `);

  // Create Institution Verifications & Staff Membership table
  db.exec(`
    CREATE TABLE IF NOT EXISTS institution_verifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      institution_id TEXT NOT NULL,
      department TEXT,
      regional_scope TEXT,
      verification_status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING, VERIFIED, SUSPENDED, REVOKED
      verified_by TEXT,
      verified_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE
    );
  `);

  // Create Posts table with explicit report lifecycle state & accountability status
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
      report_lifecycle_status TEXT NOT NULL DEFAULT 'PUBLISHED', -- DRAFT, SUBMITTED, PROCESSING, PRIVACY_REVIEW, MODERATION_REVIEW, PUBLISHED, HELD, RESTRICTED, REMOVED
      accountability_status TEXT NOT NULL DEFAULT 'NOT_ROUTED', -- NOT_ROUTED, ROUTED, ALERT_QUEUED, ALERT_SENT, ALERT_DELIVERED, ACKNOWLEDGED, UNDER_REVIEW, ACTION_PLANNED, ACTION_IN_PROGRESS, RESPONDED, RESOLVED
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

  // Create Canonical ReportEvent Timeline table
  db.exec(`
    CREATE TABLE IF NOT EXISTS report_events (
      id TEXT PRIMARY KEY,
      report_id TEXT NOT NULL,
      event_type TEXT NOT NULL, -- REPORT_CREATED, PRIVACY_STARTED, PRIVACY_COMPLETED, MODERATION_APPROVED, REPORT_PUBLISHED, INSTITUTION_IDENTIFIED, ALERT_QUEUED, ALERT_SENT, ALERT_DELIVERED, ALERT_FAILED, INSTITUTION_ACKNOWLEDGED, INSTITUTION_RESPONSE_CREATED, CITIZEN_UPDATE_ADDED, REPORT_RESOLVED
      actor_type TEXT NOT NULL, -- CITIZEN, INSTITUTION, MODERATOR, SYSTEM
      actor_id TEXT,
      institution_id TEXT,
      visibility TEXT NOT NULL DEFAULT 'public',
      metadata_json TEXT DEFAULT '{}',
      created_at TEXT NOT NULL,
      FOREIGN KEY (report_id) REFERENCES posts(id) ON DELETE CASCADE
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

  // Create Alert Attempts & Idempotency table
  db.exec(`
    CREATE TABLE IF NOT EXISTS alert_attempts (
      id TEXT PRIMARY KEY,
      idempotency_key TEXT UNIQUE NOT NULL,
      post_id TEXT NOT NULL,
      institution_id TEXT NOT NULL,
      channel_id TEXT,
      channel_type TEXT NOT NULL,
      recipient TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'ATTEMPTING', -- QUEUED, ATTEMPTING, SENT, DELIVERED, ACKNOWLEDGED, FAILED, EXPIRED
      attempt_number INTEGER NOT NULL DEFAULT 1,
      response_payload TEXT,
      error_message TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
      FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE
    );
  `);

  // Create Durable Jobs Table (Job Queue Engine)
  db.exec(`
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL, -- 'PROCESS_PRIVACY', 'AI_CLASSIFICATION', 'DISPATCH_ALERT', 'GENERATE_MEDIA_DERIVATIVES', 'PROCESS_NOTIFICATION'
      payload_json TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'QUEUED', -- QUEUED, PROCESSING, COMPLETED, FAILED, RETRYING, DEAD_LETTER
      priority INTEGER NOT NULL DEFAULT 1,
      attempts INTEGER NOT NULL DEFAULT 0,
      max_attempts INTEGER NOT NULL DEFAULT 5,
      available_at TEXT NOT NULL,
      started_at TEXT,
      completed_at TEXT,
      failed_at TEXT,
      last_error TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // Create Job Attempts Audit Log
  db.exec(`
    CREATE TABLE IF NOT EXISTS job_attempts (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL,
      attempt_number INTEGER NOT NULL,
      error_message TEXT,
      duration_ms INTEGER,
      created_at TEXT NOT NULL,
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
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

  // Create Issue Followers table
  db.exec(`
    CREATE TABLE IF NOT EXISTS issue_followers (
      user_id TEXT NOT NULL,
      post_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, post_id),
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
    );
  `);

  // Create Confirmations table
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
      user_avatar TEXT,
      is_verified INTEGER DEFAULT 1,
      text TEXT NOT NULL,
      status_update TEXT DEFAULT 'still_ongoing',
      media_json TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
    );
  `);

  try {
    db.exec(`ALTER TABLE community_evidence ADD COLUMN media_json TEXT;`);
  } catch {}
  try {
    db.exec(`ALTER TABLE community_evidence ADD COLUMN user_avatar TEXT;`);
  } catch {}
  try {
    db.exec(`ALTER TABLE community_evidence ADD COLUMN is_verified INTEGER DEFAULT 1;`);
  } catch {}

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

  // Safe ALTER migrations for institutions table
  const instCols = [
    { name: 'legal_name', type: 'TEXT' },
    { name: 'scope', type: "TEXT NOT NULL DEFAULT 'NATIONAL'" },
    { name: 'parent_ministry_id', type: 'TEXT' },
    { name: 'partnership_status', type: "TEXT NOT NULL DEFAULT 'IDENTIFIED'" },
    { name: 'operating_agreement_json', type: 'TEXT' },
    { name: 'sla_policy_json', type: 'TEXT' },
    { name: 'escalation_policy_json', type: 'TEXT' },
    { name: 'api_credentials_json', type: 'TEXT' },
    { name: 'webhook_config_json', type: 'TEXT' }
  ];
  for (const col of instCols) {
    try {
      db.exec(`ALTER TABLE institutions ADD COLUMN ${col.name} ${col.type}`);
    } catch (e) {
      // Column exists
    }
  }

  // Safe ALTER migrations for institution_channels
  const chanCols = [
    { name: 'health_status', type: "TEXT NOT NULL DEFAULT 'OPERATIONAL'" },
    { name: 'failure_count', type: 'INTEGER NOT NULL DEFAULT 0' },
    { name: 'last_health_check', type: 'TEXT' }
  ];
  for (const col of chanCols) {
    try {
      db.exec(`ALTER TABLE institution_channels ADD COLUMN ${col.name} ${col.type}`);
    } catch (e) {
      // Column exists
    }
  }

  // Safe ALTER migrations for alert_attempts
  const attemptCols = [
    { name: 'provider_message_id', type: 'TEXT' },
    { name: 'request_id', type: 'TEXT' },
    { name: 'retry_count', type: 'INTEGER DEFAULT 0' },
    { name: 'failure_reason', type: 'TEXT' }
  ];
  for (const col of attemptCols) {
    try {
      db.exec(`ALTER TABLE alert_attempts ADD COLUMN ${col.name} ${col.type}`);
    } catch (e) {
      // Column exists
    }
  }

  // Safe ALTER migrations
  const postCols = [
    { name: 'report_lifecycle_status', type: "TEXT NOT NULL DEFAULT 'PUBLISHED'" },
    { name: 'accountability_status', type: "TEXT NOT NULL DEFAULT 'NOT_ROUTED'" }
  ];
  for (const col of postCols) {
    try {
      db.exec(`ALTER TABLE posts ADD COLUMN ${col.name} ${col.type}`);
    } catch (e) {
      // Already exists
    }
  }

  // User columns for Google and Mobile phone auth
  const userCols = [
    { name: 'phone', type: "TEXT" },
    { name: 'auth_provider', type: "TEXT NOT NULL DEFAULT 'email'" },
    { name: 'google_id', type: "TEXT" }
  ];
  for (const col of userCols) {
    try {
      db.exec(`ALTER TABLE users ADD COLUMN ${col.name} ${col.type}`);
    } catch (e) {
      // Already exists
    }
  }

  try {
    db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone ON users(phone) WHERE phone IS NOT NULL AND phone != '';`);
    db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id) WHERE google_id IS NOT NULL AND google_id != '';`);
  } catch (e) {
    // Indexes exist
  }

  // Phone OTP verifications table
  db.exec(`
    CREATE TABLE IF NOT EXISTS phone_verifications (
      phone TEXT PRIMARY KEY,
      otp_code TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  // Response Comments table
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

  // Response Votes table
  db.exec(`
    CREATE TABLE IF NOT EXISTS response_votes (
      user_id TEXT NOT NULL,
      response_id TEXT NOT NULL,
      vote_type TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (user_id, response_id),
      FOREIGN KEY (response_id) REFERENCES institution_responses(id) ON DELETE CASCADE
    );
  `);

  // Issue Clusters table
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

  // Notifications table
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

  // Abuse Reports table
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

  // Audit Logs table
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

  // Drafts table
  db.exec(`
    CREATE TABLE IF NOT EXISTS drafts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      draft_data_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // P³RE Tables
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

  db.exec(`
    CREATE TABLE IF NOT EXISTS submission_sources (
      id TEXT PRIMARY KEY,
      submission_id TEXT NOT NULL,
      source_type TEXT NOT NULL,
      storage_object_id TEXT NOT NULL,
      mime_type TEXT,
      size INTEGER,
      sha256 TEXT,
      content_text TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE
    );
  `);

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

  // Default Privacy Policies
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

  // Indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_posts_region ON posts(region);
    CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category);
    CREATE INDEX IF NOT EXISTS idx_posts_urgency ON posts(urgency);
    CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at);
    CREATE INDEX IF NOT EXISTS idx_inst_tags_post ON post_institution_tags(post_id);
    CREATE INDEX IF NOT EXISTS idx_inst_tags_inst ON post_institution_tags(institution_id);
    CREATE INDEX IF NOT EXISTS idx_responses_post ON institution_responses(post_id);
    CREATE INDEX IF NOT EXISTS idx_confirmations_post ON confirmations(post_id);
    CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status, available_at);
    CREATE INDEX IF NOT EXISTS idx_report_events_report ON report_events(report_id);
    CREATE INDEX IF NOT EXISTS idx_alert_attempts_key ON alert_attempts(idempotency_key);
    CREATE INDEX IF NOT EXISTS idx_social_shares_post ON social_share_events(post_id);
    CREATE INDEX IF NOT EXISTS idx_social_clicks_ref ON social_click_events(referral_code);
    CREATE INDEX IF NOT EXISTS idx_creator_refs_code ON creator_referrals(code);
    CREATE INDEX IF NOT EXISTS idx_amplifications_post ON amplifications(post_id);
    CREATE INDEX IF NOT EXISTS idx_amplifications_user ON amplifications(user_id);
    CREATE INDEX IF NOT EXISTS idx_signal_scores_ips ON post_signal_scores(ips_score);
    CREATE INDEX IF NOT EXISTS idx_inst_deliveries_post ON institution_deliveries(post_id);
    CREATE INDEX IF NOT EXISTS idx_inst_deliveries_inst ON institution_deliveries(institution_id);
    CREATE INDEX IF NOT EXISTS idx_outcome_confirmations_post ON outcome_confirmations(post_id);
    CREATE INDEX IF NOT EXISTS idx_moderation_events_post ON moderation_events(post_id);
    CREATE INDEX IF NOT EXISTS idx_inst_assignments_inst ON institution_assignments(institution_id);
    CREATE INDEX IF NOT EXISTS idx_clarification_requests_post ON clarification_requests(post_id);
  `);

  console.log('Database tables and indexes verified successfully.');
}

// Keep export compatibility for root server/db.ts
export { db };
