import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

interface ProtectedRouteProps {
  userRole: 'citizen' | 'institution_rep' | 'journalist' | 'moderator' | 'admin';
  allowedRoles: Array<'citizen' | 'institution_rep' | 'journalist' | 'moderator' | 'admin'>;
  children: React.ReactElement;
  fallbackPath?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  userRole,
  allowedRoles,
  children,
  fallbackPath = '/'
}) => {
  const location = useLocation();

  if (!allowedRoles.includes(userRole)) {
    return <Navigate to={fallbackPath} state={{ from: location }} replace />;
  }

  return children;
};
