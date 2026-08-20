import React, { useState } from 'react';
import { X, User, Lock, Mail, Shield, Building2, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../services/api';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: any, token: string) => void;
  initialMode?: 'login' | 'register';
  initialRole?: 'citizen' | 'institution_rep' | 'journalist' | 'moderator';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
  initialMode = 'login',
  initialRole = 'citizen'
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [role, setRole] = useState<'citizen' | 'institution_rep' | 'journalist' | 'moderator'>(initialRole);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [institutionId, setInstitutionId] = useState('ghana-police-service');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        const res = await api.login(email, password);
        onAuthSuccess(res.user, res.token);
        onClose();
      } else {
        const res = await api.register({
          email,
          password,
          name,
          role,
          phone: phone || undefined,
          institutionId: role === 'institution_rep' ? institutionId : undefined
        });
        onAuthSuccess(res.user, res.token);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your details and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
            <User className="w-4 h-4" />
          </div>
          <h2 className="text-xl font-bold text-white">
            {mode === 'login' ? 'Sign In to Speak Up' : 'Create Speak Up Account'}
          </h2>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-950/80 border border-red-800 text-red-200 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Kwame Mensah"
                className="w-full px-3 py-2 bg-slate-800 text-sm text-white rounded-xl border border-slate-700 focus:outline-none focus:border-emerald-500"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="e.g. kwame@example.com"
              className="w-full px-3 py-2 bg-slate-800 text-sm text-white rounded-xl border border-slate-700 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2 bg-slate-800 text-sm text-white rounded-xl border border-slate-700 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {mode === 'register' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Select Persona / Role</label>
                <select
                  value={role}
                  onChange={e => setRole(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-800 text-sm text-white rounded-xl border border-slate-700 focus:outline-none focus:border-emerald-500"
                >
                  <option value="citizen">Citizen Reporter (0 Followers Needed)</option>
                  <option value="institution_rep">Verified Institution Responder</option>
                  <option value="journalist">Journalist / Newsroom Desk</option>
                  <option value="moderator">Platform Safety & Moderator</option>
                </select>
              </div>

              {role === 'institution_rep' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Assign Institution Desk</label>
                  <select
                    value={institutionId}
                    onChange={e => setInstitutionId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 text-sm text-white rounded-xl border border-slate-700 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="ghana-police-service">Ghana Police Service (GPS)</option>
                    <option value="nadmo">National Disaster Management Organisation (NADMO)</option>
                    <option value="ecg">Electricity Company of Ghana (ECG)</option>
                    <option value="gwcl">Ghana Water Company Limited (GWCL)</option>
                    <option value="purc">Public Utilities Regulatory Commission (PURC)</option>
                    <option value="cybersecurity-authority">Cyber Security Authority (CSA)</option>
                    <option value="chraj">CHRAJ</option>
                    <option value="ghana-highway-authority">Ghana Highway Authority (GHA)</option>
                    <option value="accra-metropolitan-assembly">Accra Metropolitan Assembly (AMA)</option>
                    <option value="environmental-protection-agency">EPA Ghana</option>
                  </select>
                </div>
              )}
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl shadow-lg transition-all disabled:opacity-50"
          >
            {loading ? 'Processing...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="mt-4 pt-4 border-t border-slate-800 text-center text-xs text-slate-400">
          {mode === 'login' ? (
            <p>
              Don't have an account?{' '}
              <button
                onClick={() => {
                  setError(null);
                  setMode('register');
                }}
                className="text-emerald-400 font-bold hover:underline"
              >
                Register now
              </button>
            </p>
          ) : (
            <p>
              Already have an account?{' '}
              <button
                onClick={() => {
                  setError(null);
                  setMode('login');
                }}
                className="text-emerald-400 font-bold hover:underline"
              >
                Sign in
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
