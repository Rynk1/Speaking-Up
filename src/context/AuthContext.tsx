import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { api } from '../services/api';
import { CivicPost, InstitutionResponse } from '../types';

export type PendingAction =
  | { type: 'seen_too'; postId: string }
  | { type: 'add_evidence'; postId: string; initialData?: { text?: string; statusUpdate?: string } }
  | { type: 'amplify'; postId: string }
  | { type: 'comment'; postId: string; content: string; parentCommentId?: string }
  | { type: 'reply'; postId: string; parentCommentId: string; initialText?: string }
  | { type: 'like_comment'; postId: string; commentId: string }
  | { type: 'like_response_comment'; responseId: string; commentId: string }
  | { type: 'vote_response'; responseId: string; voteType: 'helpful' | 'unhelpful' }
  | { type: 'create_post'; draftData?: any }
  | { type: 'follow_issue'; postId: string }
  | { type: 'bookmark'; postId: string };

export interface AuthPromptInfo {
  title?: string;
  description?: string;
  badge?: string;
  mode?: 'signin' | 'signup';
}

interface AuthContextType {
  currentUser: any | null;
  userRole: 'citizen' | 'institution_rep' | 'journalist' | 'moderator' | 'admin';
  setUserRole: (role: 'citizen' | 'institution_rep' | 'journalist' | 'moderator' | 'admin') => void;
  isAuthenticated: boolean;
  isAuthOpen: boolean;
  authMode: 'signin' | 'signup';
  authPromptInfo: AuthPromptInfo | null;
  pendingAction: PendingAction | null;
  openAuthModal: (mode?: 'signin' | 'signup', promptInfo?: AuthPromptInfo, pendingAction?: PendingAction) => void;
  closeAuthModal: () => void;
  requireAuth: (action: () => void, pendingActionData?: PendingAction, promptInfo?: AuthPromptInfo) => boolean;
  logout: () => void;
  handleAuthSuccess: (user: any, token?: string) => void;
  // Draft persistence for Post Creation
  savedPostDraft: any | null;
  savePostDraft: (draft: any) => void;
  clearPostDraft: () => void;
  // Action listener for App.tsx to execute resumed modals/actions
  resumedAction: PendingAction | null;
  clearResumedAction: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PENDING_ACTION_KEY = 'speakup_pending_action';
const POST_DRAFT_KEY = 'speakup_post_draft';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [userRole, setUserRole] = useState<'citizen' | 'institution_rep' | 'journalist' | 'moderator' | 'admin'>('citizen');
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [authPromptInfo, setAuthPromptInfo] = useState<AuthPromptInfo | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [resumedAction, setResumedAction] = useState<PendingAction | null>(null);

  const [savedPostDraft, setSavedPostDraftState] = useState<any | null>(() => {
    try {
      const saved = localStorage.getItem(POST_DRAFT_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Restore existing token & user on startup
  useEffect(() => {
    const token = api.getToken();
    if (token) {
      api.getCurrentUser()
        .then(user => {
          if (user) {
            setCurrentUser(user);
            if (user.role) {
              const roleLower = user.role.toLowerCase();
              if (['citizen', 'institution_rep', 'journalist', 'moderator', 'admin'].includes(roleLower)) {
                setUserRole(roleLower as any);
              }
            }
          }
        })
        .catch(() => {
          // Stale or expired token
          api.clearToken();
          setCurrentUser(null);
        });
    }

    // Check if there was a pending action in sessionStorage
    try {
      const savedAction = sessionStorage.getItem(PENDING_ACTION_KEY);
      if (savedAction) {
        setPendingAction(JSON.parse(savedAction));
      }
    } catch {
      // Ignore parse error
    }
  }, []);

  const savePostDraft = useCallback((draft: any) => {
    setSavedPostDraftState(draft);
    try {
      if (draft) {
        localStorage.setItem(POST_DRAFT_KEY, JSON.stringify(draft));
      } else {
        localStorage.removeItem(POST_DRAFT_KEY);
      }
    } catch (e) {
      console.error('Error saving post draft:', e);
    }
  }, []);

  const clearPostDraft = useCallback(() => {
    setSavedPostDraftState(null);
    try {
      localStorage.removeItem(POST_DRAFT_KEY);
    } catch {}
  }, []);

  const openAuthModal = useCallback((
    mode: 'signin' | 'signup' = 'signin',
    promptInfo?: AuthPromptInfo,
    pendingAct?: PendingAction
  ) => {
    setAuthMode(mode);
    setAuthPromptInfo(promptInfo || null);
    if (pendingAct) {
      setPendingAction(pendingAct);
      try {
        sessionStorage.setItem(PENDING_ACTION_KEY, JSON.stringify(pendingAct));
      } catch {}
    }
    setIsAuthOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsAuthOpen(false);
    setAuthPromptInfo(null);
  }, []);

  const requireAuth = useCallback((
    action: () => void,
    pendingActionData?: PendingAction,
    promptInfo?: AuthPromptInfo
  ): boolean => {
    if (currentUser) {
      action();
      return true;
    }

    // Guest user trying to interact: open auth modal and remember context
    openAuthModal(promptInfo?.mode || 'signin', promptInfo, pendingActionData);
    return false;
  }, [currentUser, openAuthModal]);

  const handleAuthSuccess = useCallback((user: any, token?: string) => {
    if (token) {
      api.setToken(token);
    }
    setCurrentUser(user);
    if (user.role) {
      const roleLower = user.role.toLowerCase();
      if (['citizen', 'institution_rep', 'journalist', 'moderator', 'admin'].includes(roleLower)) {
        setUserRole(roleLower as any);
      }
    }

    // Check if there is a pending action to resume
    let actionToResume = pendingAction;
    if (!actionToResume) {
      try {
        const saved = sessionStorage.getItem(PENDING_ACTION_KEY);
        if (saved) {
          actionToResume = JSON.parse(saved);
        }
      } catch {}
    }

    if (actionToResume) {
      setResumedAction(actionToResume);
      setPendingAction(null);
      try {
        sessionStorage.removeItem(PENDING_ACTION_KEY);
      } catch {}
    }

    setIsAuthOpen(false);
    setAuthPromptInfo(null);
  }, [pendingAction]);

  const logout = useCallback(() => {
    api.logout();
    setCurrentUser(null);
    setUserRole('citizen');
    setPendingAction(null);
    setResumedAction(null);
    try {
      sessionStorage.removeItem(PENDING_ACTION_KEY);
    } catch {}
  }, []);

  const clearResumedAction = useCallback(() => {
    setResumedAction(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userRole,
        setUserRole,
        isAuthenticated: !!currentUser,
        isAuthOpen,
        authMode,
        authPromptInfo,
        pendingAction,
        openAuthModal,
        closeAuthModal,
        requireAuth,
        logout,
        handleAuthSuccess,
        savedPostDraft,
        savePostDraft,
        clearPostDraft,
        resumedAction,
        clearResumedAction
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
