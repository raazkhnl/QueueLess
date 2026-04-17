import { useState, useEffect } from 'react';
import { Star, MessageCircle, Send } from 'lucide-react';
import { feedbackAPI, orgAPI } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { formatDate } from '../../lib/utils';
import toast from 'react-hot-toast';

export default function Feedback() {
  const { user } = useAuthStore();
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [replyId, setReplyId] = useState('');
  const [replyText, setReplyText] = useState('');
  const [orgId, setOrgId] = useState('');

  useEffect(() => {
    const fetchOrg = async () => {
      if (user?.role === 'super_admin') {
        const { data } = await orgAPI.getAll({ limit: 1 });
        if (data.organizations.length) return data.organizations[0]._id;
      }
      return typeof user?.organization === 'object' ? (user?.organization as any)?._id : user?.organization;
    };
    fetchOrg().then(id => {
      if (id) {
        setOrgId(id);
        feedbackAPI.getByOrg(id, { limit: 50 }).then(r => {
          setFeedbacks(r.data.feedbacks);
          setStats(r.data.stats);
        }).catch(() => {});
      }
    }).finally(() => setLoading(false));
  }, [user]);

  const handleReply = async (id: string) => {
    try {
      await feedbackAPI.adminReply(id, { reply: replyText });
      toast.success('Reply sent');
      setReplyId(''); setReplyText('');
      feedbackAPI.getByOrg(orgId, { limit: 50 }).then(r => setFeedbacks(r.data.feedbacks));
    } catch { toast.error('Failed'); }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Feedback & Reviews</h1>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="card p-5 text-center">
            <p className="text-3xl font-bold text-amber-500">{(stats.avgRating || 0).toFixed(1)}</p>
            <div className="flex justify-center gap-0.5 my-1">{[1,2,3,4,5].map(s => <Star key={s} className={`w-4 h-4 ${s <= Math.round(stats.avgRating||0) ? 'text-amber-400 fill-amber-400' : 'text-slate-300'}`} />)}</div>
            <p className="text-xs text-slate-500">Avg Rating ({stats.totalReviews} reviews)</p>
          </div>
          <div className="card p-5 text-center"><p className="text-3xl font-bold text-emerald-600">{(stats.avgServiceRating||0).toFixed(1)}</p><p className="text-xs text-slate-500">Service</p></div>
          <div className="card p-5 text-center"><p className="text-3xl font-bold text-blue-600">{(stats.avgStaffRating||0).toFixed(1)}</p><p className="text-xs text-slate-500">Staff</p></div>
          <div className="card p-5 text-center"><p className="text-3xl font-bold text-purple-600">{(stats.avgWaitRating||0).toFixed(1)}</p><p className="text-xs text-slate-500">Wait Time</p></div>
        </div>
      )}

      <div className="space-y-3">
        {feedbacks.length === 0 ? <p className="text-slate-400 text-center py-10">No feedback yet</p> :
        feedbacks.map(fb => (
          <div key={fb._id} className="card p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex gap-0.5">{[1,2,3,4,5].map(s => <Star key={s} className={`w-4 h-4 ${s <= fb.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-300'}`} />)}</div>
                  <span className="text-sm font-medium">{fb.rating}/5</span>
                </div>
                <p className="font-medium text-slate-900 dark:text-white">{(fb.citizen as any)?.name || fb.guestEmail || 'Anonymous'}</p>
                <p className="text-xs text-slate-500">{formatDate(fb.createdAt)} · {(fb.branch as any)?.name}</p>
                {fb.comment && <p className="text-sm text-slate-700 mt-2">{fb.comment}</p>}
                {fb.adminReply && (
                  <div className="mt-3 pl-4 border-l-2 border-primary-200">
                    <p className="text-xs text-primary-600 font-medium">Admin Reply</p>
                    <p className="text-sm text-slate-600">{fb.adminReply}</p>
                  </div>
                )}
                {!fb.adminReply && replyId !== fb._id && (
                  <button onClick={() => setReplyId(fb._id)} className="btn-ghost btn-sm mt-2 text-primary-600"><MessageCircle className="w-3.5 h-3.5" />Reply</button>
                )}
                {replyId === fb._id && (
                  <div className="mt-3 flex gap-2">
                    <input value={replyText} onChange={e => setReplyText(e.target.value)} className="input-field text-sm flex-1" placeholder="Type your reply..." />
                    <button onClick={() => handleReply(fb._id)} className="btn-primary btn-sm"><Send className="w-4 h-4" /></button>
                    <button onClick={() => { setReplyId(''); setReplyText(''); }} className="btn-ghost btn-sm">Cancel</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
