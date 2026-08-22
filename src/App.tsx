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

export default function App() {
  const navigate = useNavigate();

  // Role State
  const [userRole, setUserRole] = useState<'citizen' | 'institution_rep' | 'journalist' | 'moderator' | 'admin'>('citizen');
  const [selectedInstitutionId, setSelectedInstitutionId] = useState<string>('ghana-police-service');
  const [currentUser, setCurrentUser] = useState<any>(null);

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
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [sharePost, setSharePost] = useState<CivicPost | null>(null);
  const [evidencePost, setEvidencePost] = useState<CivicPost | null>(null);
  const [responsePost, setResponsePost] = useState<CivicPost | null>(null);
  const [abusePostId, setAbusePostId] = useState<string | null>(null);
  const [selectedClusterId, setSelectedClusterId] = useState<string | null>(null);
  const [selectedStatement, setSelectedStatement] = useState<{ post: CivicPost; response: InstitutionResponse } | null>(null);

  // Fetch all initial data
  const loadAllData = useCallback(async () => {
    try {
      setLoadingPosts(true);
      const [fetchedPosts, fetchedInsts, fetchedClusters, fetchedAnalytics, fetchedNotifs, user] =
        await Promise.all([
          api.getPosts(),
          api.getInstitutions(),
          api.getClusters(),
          api.getAnalytics(),
          api.getNotifications(),
          api.getCurrentUser().catch(() => null)
        ]);
      setPosts(fetchedPosts);
      setInstitutions(fetchedInsts);
      setClusters(fetchedClusters);
      setAnalytics(fetchedAnalytics);
      setNotifications(fetchedNotifs);
      if (user) {
        setCurrentUser(user);
        if (user.role) {
          const roleLower = user.role.toLowerCase();
          if (['citizen', 'institution_rep', 'journalist', 'moderator', 'admin'].includes(roleLower)) {
            setUserRole(roleLower as any);
          }
        }
      }
    } catch (err) {
      console.error('Error loading data:', err);
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
      setPosts(updated);
      const updatedAnalytics = await api.getAnalytics();
      setAnalytics(updatedAnalytics);
      const updatedClusters = await api.getClusters();
      setClusters(updatedClusters);
    } catch (err) {
      console.error('Error refreshing posts:', err);
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
    navigate(`/post/${post.id}`);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950 pb-20 lg:pb-8">
      {/* Emergency Disclaimer Banner */}
      <EmergencyBanner />

      {/* Main Header & Navbar */}
      <Navbar
        onOpenSpeakUp={() => {
          if (!currentUser) {
            setAuthMode('signin');
            setIsAuthOpen(true);
          } else {
            setIsSpeakUpOpen(true);
          }
        }}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        userRole={userRole}
        setUserRole={setUserRole}
        selectedInstitutionId={selectedInstitutionId}
        setSelectedInstitutionId={setSelectedInstitutionId}
        notifications={notifications}
        onMarkNotificationRead={handleMarkNotificationRead}
        currentUser={currentUser}
        onOpenAuth={(mode) => {
          setAuthMode(mode || 'signin');
          setIsAuthOpen(true);
        }}
        onLogout={() => {
          api.logout();
          setCurrentUser(null);
          setUserRole('citizen');
        }}
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
                setSharePost={setSharePost}
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
                onOpenSpeakUp={() => {
                  if (!currentUser) {
                    setAuthMode('signin');
                    setIsAuthOpen(true);
                  } else {
                    setIsSpeakUpOpen(true);
                  }
                }}
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
                  onOpenResponseModal={p => setResponsePost(p)}
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
        onClose={() => setIsAuthOpen(false)}
        onAuthSuccess={(user) => {
          setCurrentUser(user);
          if (user.role) {
            const roleLower = user.role.toLowerCase();
            if (['citizen', 'institution_rep', 'journalist', 'moderator', 'admin'].includes(roleLower)) {
              setUserRole(roleLower as any);
            }
          }
          if (user.institutionId) setSelectedInstitutionId(user.institutionId);
        }}
      />

      <SpeakUpComposer
        isOpen={isSpeakUpOpen}
        onClose={() => setIsSpeakUpOpen(false)}
        onPostCreated={() => {
          refreshPosts();
          navigate('/');
        }}
        institutionsList={institutions}
      />

      <SharePreviewModal
        post={sharePost}
        isOpen={!!sharePost}
        onClose={() => setSharePost(null)}
      />

      <AddEvidenceModal
        post={evidencePost}
        isOpen={!!evidencePost}
        onClose={() => setEvidencePost(null)}
        onEvidenceAdded={refreshPosts}
      />

      <InstitutionResponseModal
        post={responsePost}
        isOpen={!!responsePost}
        onClose={() => setResponsePost(null)}
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
          onViewAsFeedPost={handleViewResponseFeedPost}
        />
      )}
    </div>
  );
}
