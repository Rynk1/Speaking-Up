import React, { useState } from 'react';
import { Camera, X, Check, Loader2, AlertCircle, Image as ImageIcon, Mic, Film, Trash2 } from 'lucide-react';
import { CivicPost, PostMedia } from '../types';
import { api } from '../services/api';

interface AddEvidenceModalProps {
  post: CivicPost | null;
  isOpen: boolean;
  onClose: () => void;
  onEvidenceAdded: () => void;
}

export const AddEvidenceModal: React.FC<AddEvidenceModalProps> = ({
  post,
  isOpen,
  onClose,
  onEvidenceAdded
}) => {
  const [text, setText] = useState('');
  const [statusUpdate, setStatusUpdate] = useState<'still_ongoing' | 'worsened' | 'improving' | 'resolved'>('still_ongoing');
  const [userName, setUserName] = useState('Community Member');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mediaList, setMediaList] = useState<PostMedia[]>([]);

  if (!isOpen || !post) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    setIsSubmitting(true);
    try {
      await api.addEvidence(post.id, {
        text: text.trim(),
        statusUpdate,
        userName,
        userHandle: 'field_observer_gh',
        media: mediaList
      });
      setIsSubmitting(false);
      onEvidenceAdded();
      onClose();
    } catch (err) {
      console.error('Failed to add evidence:', err);
      setIsSubmitting(false);
    }
  };

  const handleAttachPhoto = () => {
    const samplePhotos = [
      'https://images.unsplash.com/photo-1547683905-f686c993aae5?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1584463699026-6819b1689255?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=800&auto=format&fit=crop&q=80'
    ];
    const chosen = samplePhotos[Math.floor(Math.random() * samplePhotos.length)];
    setMediaList(prev => [
      ...prev,
      {
        id: `evid-img-${Date.now()}`,
        type: 'image',
        url: chosen,
        caption: 'Field photo evidence',
        uploadedAt: new Date().toISOString()
      }
    ]);
  };

  const handleAttachAudio = () => {
    setMediaList(prev => [
      ...prev,
      {
        id: `evid-aud-${Date.now()}`,
        type: 'audio',
        url: 'https://cdn.freesound.org/previews/518/518882_11501906-lq.mp3',
        caption: 'Field Voice Note / Ambient Sound Recording',
        duration: 32,
        uploadedAt: new Date().toISOString()
      }
    ]);
  };

  const handleAttachVideo = () => {
    setMediaList(prev => [
      ...prev,
      {
        id: `evid-vid-${Date.now()}`,
        type: 'video',
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        thumbnailUrl: 'https://images.unsplash.com/photo-1547683905-f686c993aae5?w=400&auto=format&fit=crop&q=80',
        caption: 'On-scene field video clip',
        duration: 15,
        uploadedAt: new Date().toISOString()
      }
    ]);
  };

  const handleRemoveMedia = (index: number) => {
    setMediaList(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-sm overflow-y-auto animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg text-slate-100 shadow-2xl overflow-hidden my-4">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/30">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm sm:text-base text-white">Add Field Evidence & Update</h2>
              <p className="text-[11px] text-slate-400">Help the community & authorities know the current situation</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          <div className="p-2.5 bg-slate-800/60 rounded-xl text-xs border border-slate-700">
            <span className="text-slate-400">Replying to observation: </span>
            <strong className="text-slate-200">"{post.title}"</strong>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Current Field Status:
            </label>
            <select
              value={statusUpdate}
              onChange={e => setStatusUpdate(e.target.value as any)}
              className="w-full p-2 bg-slate-800 text-xs text-slate-100 rounded-lg border border-slate-700"
            >
              <option value="still_ongoing">Problem is still ongoing / unchanged</option>
              <option value="worsened">Condition has worsened</option>
              <option value="improving">Workmen on site / Improving</option>
              <option value="resolved">Issue appears fully addressed</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              What did you observe right now?
            </label>
            <textarea
              rows={3}
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="e.g. I just passed by at 3pm. The drainage team is on site unblocking the culvert..."
              className="w-full p-2.5 bg-slate-800 text-xs text-slate-100 placeholder-slate-500 rounded-xl border border-slate-700 focus:outline-none focus:border-emerald-500 resize-none"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300">
              Attach Citizen Evidence (Photo, Audio Note, Video):
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleAttachPhoto}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-300 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ImageIcon className="w-3.5 h-3.5 text-sky-400" /> Photo
              </button>
              <button
                type="button"
                onClick={handleAttachAudio}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-300 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Mic className="w-3.5 h-3.5 text-amber-400" /> Voice Note / Audio
              </button>
              <button
                type="button"
                onClick={handleAttachVideo}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-300 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Film className="w-3.5 h-3.5 text-rose-400" /> Video Clip
              </button>
            </div>

            {mediaList.length > 0 && (
              <div className="space-y-1.5 pt-2">
                {mediaList.map((m, idx) => (
                  <div
                    key={m.id || idx}
                    className="flex items-center justify-between p-2 bg-slate-800/80 rounded-lg border border-slate-700 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {m.type === 'image' && <ImageIcon className="w-4 h-4 text-sky-400 shrink-0" />}
                      {m.type === 'audio' && <Mic className="w-4 h-4 text-amber-400 shrink-0" />}
                      {m.type === 'video' && <Film className="w-4 h-4 text-rose-400 shrink-0" />}
                      <span className="text-slate-200 font-medium truncate">{m.caption || `${m.type} evidence`}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveMedia(idx)}
                      className="text-slate-400 hover:text-red-400 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !text.trim()}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg flex items-center gap-1.5"
            >
              {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Submit Evidence Update
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
