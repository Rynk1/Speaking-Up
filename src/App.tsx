/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import {
  CivicPost,
  Institution,
  InstitutionResponse,
  IssueCluster,
  NationalAnalytics,
  NotificationItem
} from './types';
import { api } from './services/api';

import { EmergencyBanner } from './components/EmergencyBanner';
import { Navbar } from './components/Navbar';
import { MobileBottomNav } from './components/MobileBottomNav';
import { ProtectedRoute } from './components/ProtectedRoute';

import { HomeFeedView } from './components/HomeFeedView';
import { PostDetailView } from './components/PostDetailView';
import { SingleClusterView } from './components/SingleClusterView';
import { InstitutionDetailView } from './components/InstitutionDetailView';

import { SpeakUpComposer } from './components/SpeakUpComposer';
import { SharePreviewModal } from './components/SharePreviewModal';
import { AddEvidenceModal } from './components/AddEvidenceModal';
import { InstitutionResponseModal } from './components/InstitutionResponseModal';
import { ReportAbuseModal } from './components/ReportAbuseModal';
import { CommunityIssueClusterModal } from './components/CommunityIssueClusterModal';
import { OfficialStatementModal } from './components/OfficialStatementModal';

import { NationalMapView } from './components/NationalMapView';
import { InstitutionDirectoryView } from './components/InstitutionDirectoryView';
import { InstitutionDashboardView } from './components/InstitutionDashboardView';
import { JournalistDeskView } from './components/JournalistDeskView';
import { NationalAnalyticsView } from './components/NationalAnalyticsView';
import { PrivacyReviewPortal } from './components/PrivacyReviewPortal';
import { AdminDashboardView } from './components/AdminDashboardView';
import { AuthModal } from './components/AuthModal';
import { useAuth } from './context/AuthContext';

export default function App() {
  const navigate = useNavigate();
  const {
    currentUser,
    userRole,
    setUserRole,
    isAuthOpen,
    authMode,
    authPromptInfo,
    openAuthModal,
    closeAuthModal,
    handleAuthSuccess,
    logout,
    requireAuth,
    resumedAction,
    clearResumedAction
  } = useAuth();

  // Institution State
  const [selectedInstitutionId, setSelectedInstitutionId] = useState<string>('ghana-police-service');

  // Search
  const [searchQuery, setSearchQuery] = useState('');

  // Core Data State
  const [posts, setPosts] = useState<CivicPost[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [clusters, setClusters] = useState<IssueCluster[]>([]);
  const [analytics, setAnalytics] = useState<NationalAnalytics | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);

  // Global Modals State
  const [isSpeakUpOpen, setIsSpeakUpOpen] = useState(false);
  const [shareTarget, setShareTarget] = useState<{ post: CivicPost; response?: InstitutionResponse } | null>(null);
  const [evidencePost, setEvidencePost] = useState<CivicPost | null>(null);
  const [responsePost, setResponsePost] = useState<CivicPost | null>(null);
  const [editingResponse, setEditingResponse] = useState<InstitutionResponse | null>(null);
  const [abusePostId, setAbusePostId] = useState<string | null>(null);
  const [selectedClusterId, setSelectedClusterId] = useState<string | null>(null);
  const [selectedStatement, setSelectedStatement] = useState<{ post: CivicPost; response: InstitutionResponse } | null>(null);

  // Fetch all initial data with defensive handling
  const loadAllData = useCallback(async () => {
    try {
      setLoadingPosts(true);
      const [postsRes, instsRes, clustersRes, analyticsRes, notifsRes] = await Promise.allSettled([
        api.getPosts(),
        api.getInstitutions(),
        api.getClusters(),
        api.getAnalytics(),
        api.getNotifications()
      ]);

      if (postsRes.status === 'fulfilled' && Array.isArray(postsRes.value)) {
        setPosts(postsRes.value);
      }
      if (instsRes.status === 'fulfilled' && Array.isArray(instsRes.value)) {
        setInstitutions(instsRes.value);
      }
      if (clustersRes.status === 'fulfilled' && Array.isArray(clustersRes.value)) {
        setClusters(clustersRes.value);
      }
      if (analyticsRes.status === 'fulfilled' && analyticsRes.value) {
        setAnalytics(analyticsRes.value);
      }
      if (notifsRes.status === 'fulfilled' && Array.isArray(notifsRes.value)) {
        setNotifications(notifsRes.value);
      }
    } catch (err) {
      console.warn('Notice: Background synchronization error in loadAllData:', err);
    } finally {
      setLoadingPosts(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Refresh posts specifically
  const refreshPosts = async () => {
    try {
      const updated = await api.getPosts();
      if (Array.isArray(updated) && updated.length > 0) {
        setPosts(updated);
      }
      const [analyticsRes, clustersRes] = await Promise.allSettled([
        api.getAnalytics(),
        api.getClusters()
      ]);
      if (analyticsRes.status === 'fulfilled') setAnalytics(analyticsRes.value);
      if (clustersRes.status === 'fulfilled') setClusters(clustersRes.value);
    } catch (err) {
      console.warn('Notice: Refresh posts completed with fallback:', err);
    }
  };

  const handleMarkNotificationRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (err) {
      console.error('Error marking notification read:', err);
    }
  };

  const handleViewResponseFeedPost = useCallback((post: CivicPost, response: InstitutionResponse) => {
    navigate('/', { state: { focusedResponseId: response.id, tab: 'official_responded' } });
  }, [navigate]);

  // Automatically process or resume actions after authentication
  useEffect(() => {
    if (resumedAction && currentUser) {
      if (resumedAction.type === 'create_post') {
        setIsSpeakUpOpen(true);
      } else if (resumedAction.type === 'add_evidence') {
        const found = posts.find(p => p.id === resumedAction.postId);
        if (found) setEvidencePost(found);
      } else if (resumedAction.type === 'seen_too') {
        api.toggleConfirmation(resumedAction.postId)
          .then(() => refreshPosts())
          .catch(console.error);
      } else if (resumedAction.type === 'amplify') {
        api.toggleRepost(resumedAction.postId)
          .then(() => refreshPosts())
          .catch(console.error);
      } else if (resumedAction.type === 'bookmark') {
        api.toggleBookmark(resumedAction.postId)
          .then(() => refreshPosts())
          .catch(console.error);
      } else if (resumedAction.type === 'follow_issue') {
        api.toggleFollowIssue(resumedAction.postId)
          .then(() => refreshPosts())
          .catch(console.error);
      }
      clearResumedAction();
    }
  }, [resumedAction, currentUser, posts, clearResumedAction]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950 pb-20 lg:pb-8">
      {/* Emergency Disclaimer Banner */}
      <EmergencyBanner />

      {/* Main Header & Navbar */}
      <Navbar
        onOpenSpeakUp={() => setIsSpeakUpOpen(true)}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        userRole={userRole}
        setUserRole={setUserRole}
        selectedInstitutionId={selectedInstitutionId}
        setSelectedInstitutionId={setSelectedInstitutionId}
        notifications={notifications}
        onMarkNotificationRead={handleMarkNotificationRead}
        currentUser={currentUser}
        onOpenAuth={(mode) => openAuthModal(mode || 'signin')}
        onLogout={logout}
      />

      {/* Main Multi-Page Route Outlet */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-1.5 sm:px-6 py-3 sm:py-6">
        <Routes>
          {/* Public Routes */}
          <Route
            path="/"
            element={
              <HomeFeedView
                posts={posts}
                institutions={institutions}
                clusters={clusters}
                analytics={analytics}
                loadingPosts={loadingPosts}
                refreshPosts={refreshPosts}
                searchQuery={searchQuery}
                userRole={userRole}
                currentUser={currentUser}
                setIsSpeakUpOpen={setIsSpeakUpOpen}
                setSelectedInstitutionId={setSelectedInstitutionId}
                setSharePost={(p, r) => setShareTarget(p ? { post: p, response: r } : null)}
                setEvidencePost={setEvidencePost}
                setResponsePost={setResponsePost}
                setAbusePostId={setAbusePostId}
                setSelectedStatement={setSelectedStatement}
              />
            }
          />

          <Route
            path="/post/:id"
            element={
              <PostDetailView
                userRole={userRole}
                currentUser={currentUser}
                selectedInstitutionId={selectedInstitutionId}
              />
            }
          />

          <Route
            path="/map"
            element={
              <NationalMapView
                posts={posts}
                onSelectPost={p => navigate(`/post/${p.id}`)}
                onOpenSpeakUp={() => setIsSpeakUpOpen(true)}
              />
            }
          />

          <Route
            path="/clusters"
            element={
              <div className="space-y-4 animate-in fade-in">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div>
                    <h2 className="font-extrabold text-lg sm:text-xl text-white tracking-tight">
                      Community Issue Clusters
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
                      Aggregated citizen observations forming community emergencies across Ghana.
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-amber-950 text-amber-300 border border-amber-800 rounded-lg text-xs font-bold">
                    {clusters.length} Monitored Clusters
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {clusters.map((cluster, idx) => (
                    <div
                      key={cluster.id ? `${cluster.id}-${idx}` : `cluster-card-${idx}`}
                      onClick={() => navigate(`/clusters/${cluster.id}`)}
                      className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 sm:p-5 cursor-pointer transition-all shadow-md flex flex-col justify-between space-y-3 group"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-amber-400">{cluster.category}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 uppercase">
                            {cluster.status.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <h3 className="font-bold text-base text-white group-hover:text-amber-300 transition-colors leading-snug">
                          {cluster.title}
                        </h3>
                        <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed">
                          {cluster.summary}
                        </p>
                      </div>
                      <div className="space-y-2 pt-2 border-t border-slate-800 text-xs text-slate-400">
                        <div className="flex items-center justify-between">
                          <span>{cluster.district} ({cluster.region})</span>
                          <span className="text-emerald-400 font-bold">{cluster.totalConfirmations} confirmed</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            }
          />

          <Route
            path="/clusters/:id"
            element={
              <SingleClusterView
                userRole={userRole}
                currentUser={currentUser}
                selectedInstitutionId={selectedInstitutionId}
              />
            }
          />

          <Route
            path="/institutions"
            element={
              <InstitutionDirectoryView
                institutions={institutions}
                posts={posts}
                onSelectInstitution={inst => {
                  setSelectedInstitutionId(inst.id);
                  navigate(`/institutions/${inst.id}`);
                }}
                onTagInstitutionInNewPost={inst => {
                  setSelectedInstitutionId(inst.id);
                  setIsSpeakUpOpen(true);
                }}
              />
            }
          />

          <Route
            path="/institutions/:id"
            element={
              <InstitutionDetailView
                userRole={userRole}
                currentUser={currentUser}
                selectedInstitutionId={selectedInstitutionId}
                setSelectedInstitutionId={setSelectedInstitutionId}
                onOpenSpeakUp={() => setIsSpeakUpOpen(true)}
              />
            }
          />

          <Route
            path="/radar"
            element={
              <NationalAnalyticsView
                analytics={analytics}
                institutions={institutions}
                posts={posts}
                clusters={clusters}
                onSelectPost={p => navigate(`/post/${p.id}`)}
                onSelectCluster={cId => navigate(`/clusters/${cId}`)}
                onSelectInstitution={instId => {
                  setSelectedInstitutionId(instId);
                  navigate(`/institutions/${instId}`);
                }}
                onOpenSpeakUp={() => setIsSpeakUpOpen(true)}
                onRefresh={refreshPosts}
              />
            }
          />

          {/* Role Protected Routes */}
          <Route
            path="/portal"
            element={
              <ProtectedRoute userRole={userRole} allowedRoles={['institution_rep', 'admin']}>
                <InstitutionDashboardView
                  institutions={institutions}
                  posts={posts}
                  selectedInstitutionId={selectedInstitutionId}
                  setSelectedInstitutionId={setSelectedInstitutionId}
                  onOpenResponseModal={(p, resp) => {
                    setResponsePost(p);
                    setEditingResponse(resp || null);
                  }}
                  onPostUpdated={refreshPosts}
                  onViewOfficialResponse={(p, r) => setSelectedStatement({ post: p, response: r })}
                  onViewResponseFeedPost={handleViewResponseFeedPost}
                  onOpenCluster={cId => navigate(`/clusters/${cId}`)}
                  onSelectPost={p => navigate(`/post/${p.id}`)}
                />
              </ProtectedRoute>
            }
          />

          <Route
            path="/journalist-desk"
            element={
              <ProtectedRoute userRole={userRole} allowedRoles={['journalist', 'admin']}>
                <JournalistDeskView
                  posts={posts}
                  clusters={clusters}
                  institutions={institutions}
                  onSelectPost={p => navigate(`/post/${p.id}`)}
                  onOpenCluster={cId => navigate(`/clusters/${cId}`)}
                />
              </ProtectedRoute>
            }
          />

          <Route
            path="/privacy-portal"
            element={
              <ProtectedRoute userRole={userRole} allowedRoles={['moderator', 'admin']}>
                <PrivacyReviewPortal />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <ProtectedRoute userRole={userRole} allowedRoles={['admin']}>
                <AdminDashboardView />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>

      {/* Mobile Bottom Bar */}
      <MobileBottomNav onOpenSpeakUp={() => setIsSpeakUpOpen(true)} />

      {/* Global Application Modals */}
      <AuthModal
        isOpen={isAuthOpen}
        initialMode={authMode}
        promptInfo={authPromptInfo}
        onClose={closeAuthModal}
        onAuthSuccess={(user, token) => {
          handleAuthSuccess(user, token);
          if (user.institutionId) setSelectedInstitutionId(user.institutionId);
        }}
      />

      <SpeakUpComposer
        isOpen={isSpeakUpOpen}
        onClose={() => {
          setIsSpeakUpOpen(false);
          refreshPosts();
        }}
        onPostCreated={() => {
          refreshPosts();
        }}
        onViewPost={(postId) => {
          setIsSpeakUpOpen(false);
          refreshPosts();
          navigate(`/post/${postId}`);
        }}
        institutionsList={institutions}
      />

      <SharePreviewModal
        post={shareTarget?.post || null}
        response={shareTarget?.response || null}
        isOpen={!!shareTarget}
        onClose={() => setShareTarget(null)}
      />

      <AddEvidenceModal
        post={evidencePost}
        isOpen={!!evidencePost}
        onClose={() => setEvidencePost(null)}
        onEvidenceAdded={refreshPosts}
      />

      <InstitutionResponseModal
        post={responsePost}
        existingResponse={editingResponse}
        isOpen={!!responsePost}
        onClose={() => {
          setResponsePost(null);
          setEditingResponse(null);
        }}
        onResponseSubmitted={refreshPosts}
        institutionsList={institutions}
        currentInstitutionId={selectedInstitutionId}
      />

      <ReportAbuseModal
        postId={abusePostId}
        isOpen={!!abusePostId}
        onClose={() => setAbusePostId(null)}
      />

      <CommunityIssueClusterModal
        clusterId={selectedClusterId}
        isOpen={!!selectedClusterId}
        onClose={() => setSelectedClusterId(null)}
        onSelectPost={p => navigate(`/post/${p.id}`)}
      />

      {selectedStatement && (
        <OfficialStatementModal
          post={selectedStatement.post}
          response={selectedStatement.response}
          currentUser={currentUser}
          onClose={() => setSelectedStatement(null)}
          onPostUpdated={refreshPosts}
          onOpenAnotherResponse={(newResp) => {
            setSelectedStatement({
              post: selectedStatement.post,
              response: newResp
            });
          }}
          onOpenShare={(p, r) => setShareTarget({ post: p, response: r })}
          onViewAsFeedPost={handleViewResponseFeedPost}
        />
      )}
    </div>
  );
}
