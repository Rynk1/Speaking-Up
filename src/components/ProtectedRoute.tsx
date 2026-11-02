import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

interface ProtectedRouteProps {
  userRole: 'citizen' | 'institution_rep' | 'journalist' | 'moderator' | 'admin';
  allowedRoles: Array<'citizen' | 'institution_rep' | 'journalist' | 'moderator' | 'admin'>;
  children: React.ReactElement;
  fallbackPath?: string;
  /** While true the stored session is still being validated; hold the route instead of redirecting. */
  isAuthLoading?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  userRole,
  allowedRoles,
  children,
  fallbackPath = '/',
  isAuthLoading = false
}) => {
  const location = useLocation();

  if (isAuthLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <div className="h-8 w-8 rounded-full border-2 border-slate-700 border-t-amber-500 animate-spin" />
          <span className="text-xs uppercase tracking-widest">Verifying access…</span>
        </div>
      </div>
    );
  }

  if (!allowedRoles.includes(userRole)) {
    return <Navigate to={fallbackPath} state={{ from: location }} replace />;
  }

  return children;
};
