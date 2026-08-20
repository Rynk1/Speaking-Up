import { db } from './db';
import bcrypt from 'bcryptjs';
import {
  INITIAL_INSTITUTIONS,
  INITIAL_POSTS,
  INITIAL_CLUSTERS,
  INITIAL_NOTIFICATIONS
} from './seedData';

export async function seedDatabaseIfEmpty() {
  const userCount = (db.prepare('SELECT COUNT(*) as count FROM users').get() as any).count;
  if (userCount > 0) {
    console.log('Database already contains seed data.');
    return;
  }

  console.log('Seeding database with initial Ghana institutions, posts, users, and clusters...');

  const hashedPassword = await bcrypt.hash('Password123!', 10);
  const now = new Date().toISOString();

  // Default Users including all initial authors
  const defaultUsers = [
    {
      id: 'user-current',
      email: 'citizen@speakup.gh',
      password_hash: hashedPassword,
      name: 'Kofi Mensah',
      handle: 'kofi_speakup',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
      role: 'CITIZEN',
      is_verified: 1,
      followers_count: 0
    },
    {
      id: 'user-kofi-mensah',
      email: 'kofi.mensah@speakup.gh',
      password_hash: hashedPassword,
      name: 'Kofi Mensah',
      handle: 'kofi_m_accra',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
      role: 'CITIZEN',
      is_verified: 1,
      followers_count: 0
    },
    {
      id: 'user-yaw-boateng',
      email: 'yaw.b@speakup.gh',
      password_hash: hashedPassword,
      name: 'Yaw Boateng',
      handle: 'yaw_kumasi',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
      role: 'CITIZEN',
      is_verified: 1,
      followers_count: 0
    },
    {
      id: 'user-dr-owusu',
      email: 'dr.owusu@speakup.gh',
      password_hash: hashedPassword,
      name: 'Dr. Evelyn Owusu',
      handle: 'drevelyn_health',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&auto=format&fit=crop&q=80',
      role: 'CITIZEN',
      is_verified: 1,
      followers_count: 0
    },
    {
      id: 'user-fatima-tamale',
      email: 'fatima@speakup.gh',
      password_hash: hashedPassword,
      name: 'Fatima Al-Hassan',
      handle: 'fatima_tamale',
      avatar: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=120&auto=format&fit=crop&q=80',
      role: 'CITIZEN',
      is_verified: 1,
      followers_count: 0
    },
    {
      id: 'user-selorm-it',
      email: 'selorm@speakup.gh',
      password_hash: hashedPassword,
      name: 'Selorm Kpodo',
      handle: 'selorm_tech',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80',
      role: 'CITIZEN',
      is_verified: 1,
      followers_count: 0
    },
    {
      id: 'user-mensah-cc',
      email: 'mensah.cc@speakup.gh',
      password_hash: hashedPassword,
      name: 'Grace Mensah',
      handle: 'grace_capecoast',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&auto=format&fit=crop&q=80',
      role: 'CITIZEN',
      is_verified: 1,
      followers_count: 0
    },
    {
      id: 'user-inst-police',
      email: 'police.desk@police.gov.gh',
      password_hash: hashedPassword,
      name: 'Ghana Police Service Desk',
      handle: 'ghana_police_desk',
      avatar: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=120&auto=format&fit=crop&q=80',
      role: 'INSTITUTION_REP',
      is_verified: 1,
      followers_count: 5200
    },
    {
      id: 'user-mod',
      email: 'mod@speakup.gh',
      password_hash: hashedPassword,
      name: 'Civic Moderator',
      handle: 'civic_mod',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
      role: 'MODERATOR',
      is_verified: 1,
      followers_count: 100
    }
  ];

  const insertUser = db.prepare(`
    INSERT INTO users (id, email, password_hash, name, handle, avatar, role, is_verified, followers_count, created_at, updated_at)
    VALUES (@id, @email, @password_hash, @name, @handle, @avatar, @role, @is_verified, @followers_count, @created_at, @updated_at)
  `);

  for (const u of defaultUsers) {
    insertUser.run({ ...u, created_at: now, updated_at: now });
  }

  // Institutions
  const insertInstitution = db.prepare(`
    INSERT INTO institutions (
      id, official_name, short_name, acronym, mandate, category, jurisdiction, logo, official_website,
      official_contacts_json, social_accounts_json, email_channels_json, whatsapp_channels_json,
      alert_method, active_mentions_count, unanswered_mentions_count, official_responses_count,
      avg_response_hours, verification_status, source_documents_json, verification_date, verified_by,
      next_review_date, created_at
    ) VALUES (
      @id, @official_name, @short_name, @acronym, @mandate, @category, @jurisdiction, @logo, @official_website,
      @official_contacts_json, @social_accounts_json, @email_channels_json, @whatsapp_channels_json,
      @alert_method, @active_mentions_count, @unanswered_mentions_count, @official_responses_count,
      @avg_response_hours, @verification_status, @source_documents_json, @verification_date, @verified_by,
      @next_review_date, @created_at
    )
  `);

  for (const inst of INITIAL_INSTITUTIONS) {
    insertInstitution.run({
      id: inst.id,
      official_name: inst.officialName,
      short_name: inst.shortName,
      acronym: inst.acronym,
      mandate: inst.mandate,
      category: inst.categories[0] || 'Infrastructure & Roads',
      jurisdiction: inst.jurisdiction || 'NATIONAL',
      logo: inst.logo || null,
      official_website: inst.officialWebsite || null,
      official_contacts_json: JSON.stringify(inst.officialContacts || []),
      social_accounts_json: JSON.stringify(inst.officialSocialAccounts || []),
      email_channels_json: JSON.stringify(inst.emailChannels || []),
      whatsapp_channels_json: JSON.stringify(inst.whatsappChannels || []),
      alert_method: inst.alertMethod || 'OFFICIAL_EMAIL',
      active_mentions_count: inst.activeMentionsCount || 0,
      unanswered_mentions_count: inst.unansweredMentionsCount || 0,
      official_responses_count: inst.officialResponsesCount || 0,
      avg_response_hours: inst.avgResponseTimeHours || 4.0,
      verification_status: inst.verificationStatus || 'VERIFIED',
      source_documents_json: JSON.stringify(inst.sourceDocuments || []),
      verification_date: inst.verificationDate || '2024-01-01',
      verified_by: inst.verifiedBy || 'Civic Verification Desk',
      next_review_date: inst.nextReviewDate || '2025-12-31',
      created_at: now
    });
  }

  // Posts
  const insertPost = db.prepare(`
    INSERT INTO posts (
      id, title, content, original_language, translated_text, author_id, author_name, author_handle,
      author_avatar, author_visibility, is_verified_citizen, category, subcategory, urgency, severity,
      region, district, landmark, latitude, longitude, location_accuracy, location_visibility,
      hashtags_json, visibility, moderation_status, issue_cluster_id, views_count, reposts_count,
      shares_count, confirmations_count, comments_count, created_at, updated_at
    ) VALUES (
      @id, @title, @content, @original_language, @translated_text, @author_id, @author_name, @author_handle,
      @author_avatar, @author_visibility, @is_verified_citizen, @category, @subcategory, @urgency, @severity,
      @region, @district, @landmark, @latitude, @longitude, @location_accuracy, @location_visibility,
      @hashtags_json, @visibility, @moderation_status, @issue_cluster_id, @views_count, @reposts_count,
      @shares_count, @confirmations_count, @comments_count, @created_at, @updated_at
    )
  `);

  const insertTag = db.prepare(`
    INSERT INTO post_institution_tags (
      id, post_id, institution_id, institution_name, short_name, acronym, alert_requested, alert_status, alert_method_used, delivery_timestamp, created_at
    ) VALUES (@id, @post_id, @institution_id, @institution_name, @short_name, @acronym, @alert_requested, @alert_status, @alert_method_used, @delivery_timestamp, @created_at)
  `);

  const insertMedia = db.prepare(`
    INSERT INTO media (id, post_id, type, url, thumbnail_url, caption, mime_type, uploaded_at)
    VALUES (@id, @post_id, @type, @url, @thumbnail_url, @caption, @mime_type, @uploaded_at)
  `);

  const insertResponse = db.prepare(`
    INSERT INTO institution_responses (
      id, post_id, institution_id, institution_name, institution_logo, response_type, message,
      official, verified, responder_name, responder_title, redirected_to_institution_id,
      redirected_to_institution_name, created_at
    ) VALUES (
      @id, @post_id, @institution_id, @institution_name, @institution_logo, @response_type, @message,
      @official, @verified, @responder_name, @responder_title, @redirected_to_institution_id,
      @redirected_to_institution_name, @created_at
    )
  `);

  for (const p of INITIAL_POSTS) {
    insertPost.run({
      id: p.id,
      title: p.title,
      content: p.content,
      original_language: p.originalLanguage || 'English',
      translated_text: p.translatedText || null,
      author_id: p.authorId || 'user-kofi-mensah',
      author_name: p.authorName,
      author_handle: p.authorHandle,
      author_avatar: p.authorAvatar || null,
      author_visibility: p.authorVisibility || 'public',
      is_verified_citizen: p.isVerifiedCitizen ? 1 : 0,
      category: p.category,
      subcategory: p.subcategory || null,
      urgency: p.urgency,
      severity: p.severity,
      region: p.location.region,
      district: p.location.district,
      landmark: p.location.landmark || null,
      latitude: p.location.latitude || null,
      longitude: p.location.longitude || null,
      location_accuracy: p.location.accuracy || 'exact',
      location_visibility: p.location.visibility || 'exact',
      hashtags_json: JSON.stringify(p.hashtags || []),
      visibility: p.visibility || 'public',
      moderation_status: p.moderationStatus || 'approved',
      issue_cluster_id: p.issueClusterId || null,
      views_count: p.engagement.views || 10,
      reposts_count: p.engagement.reposts || 0,
      shares_count: p.engagement.shares || 0,
      confirmations_count: p.engagement.confirmations || 1,
      comments_count: p.engagement.comments || 0,
      created_at: p.createdAt || now,
      updated_at: p.updatedAt || now
    });

    for (const tag of p.institutionTags || []) {
      insertTag.run({
        id: `tag-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        post_id: p.id,
        institution_id: tag.institutionId,
        institution_name: tag.institutionName,
        short_name: tag.shortName || null,
        acronym: tag.acronym || null,
        alert_requested: tag.alertRequested ? 1 : 0,
        alert_status: tag.alertStatus || 'SENT',
        alert_method_used: tag.alertMethodUsed || 'Official Channel',
        delivery_timestamp: tag.deliveryTimestamp || now,
        created_at: now
      });
    }

    for (const m of p.media || []) {
      insertMedia.run({
        id: m.id,
        post_id: p.id,
        type: m.type,
        url: m.url,
        thumbnail_url: m.thumbnailUrl || null,
        caption: m.caption || null,
        mime_type: m.mimeType || 'image/jpeg',
        uploaded_at: now
      });
    }

    for (const r of p.officialResponses || []) {
      insertResponse.run({
        id: r.id,
        post_id: p.id,
        institution_id: r.institutionId,
        institution_name: r.institutionName,
        institution_logo: r.institutionLogo || null,
        response_type: r.responseType,
        message: r.message,
        official: r.official ? 1 : 0,
        verified: r.verified ? 1 : 0,
        responder_name: r.responderName,
        responder_title: r.responderTitle,
        redirected_to_institution_id: r.redirectedToInstitutionId || null,
        redirected_to_institution_name: r.redirectedToInstitutionName || null,
        created_at: r.createdAt || now
      });
    }
  }

  // Clusters
  const insertCluster = db.prepare(`
    INSERT INTO issue_clusters (
      id, title, category, region, district, summary, total_confirmations, trend_score, status, primary_institutions_json, created_at, updated_at
    ) VALUES (
      @id, @title, @category, @region, @district, @summary, @total_confirmations, @trend_score, @status, @primary_institutions_json, @created_at, @updated_at
    )
  `);

  for (const c of INITIAL_CLUSTERS) {
    insertCluster.run({
      id: c.id,
      title: c.title,
      category: c.category,
      region: c.region,
      district: c.district,
      summary: c.summary,
      total_confirmations: c.totalConfirmations || c.confirmationCount || 1,
      trend_score: c.trendScore || 50,
      status: c.status || 'TRENDING',
      primary_institutions_json: JSON.stringify(c.primaryInstitutions || []),
      created_at: now,
      updated_at: now
    });
  }

  // Notifications
  const insertNotif = db.prepare(`
    INSERT INTO notifications (id, user_id, type, title, message, post_id, institution_name, read, created_at)
    VALUES (@id, @user_id, @type, @title, @message, @post_id, @institution_name, @read, @created_at)
  `);

  for (const n of INITIAL_NOTIFICATIONS) {
    insertNotif.run({
      id: n.id,
      user_id: n.userId || 'user-current',
      type: n.type,
      title: n.title,
      message: n.message,
      post_id: n.postId || null,
      institution_name: n.institutionName || null,
      read: n.read ? 1 : 0,
      created_at: n.createdAt || now
    });
  }

  console.log('Database successfully seeded with persistent initial data!');
}
