import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Megaphone, MessageSquare, Star,
  Flame, CheckCircle2, Zap, Bell, Activity,
  ArrowRight
} from 'lucide-react';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { StatCard } from '@/components/analytics/StatCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import useActivityStore from '@/stores/activityStore';
import useAuthStore from '@/stores/authStore';
import { formatRelativeTime } from '@/utils/formatters';
import { toast } from '@/stores/uiStore';
import api from '@/services/api';

const ACTIVITY_ICONS = {
  hot_lead:         <Flame size={13} />,
  message_sent:     <MessageSquare size={13} />,
  message_received: <MessageSquare size={13} />,
  qualified:        <Star size={13} />,
  campaign_launched: <Megaphone size={13} />,
  appointment_booked: <CheckCircle2 size={13} />,
};

const ACTIVITY_COLORS = {
  hot_lead:          { bg: 'var(--danger-bg)',  color: 'var(--danger)' },
  message_sent:      { bg: 'var(--accent-light)', color: 'var(--accent)' },
  message_received:  { bg: 'var(--accent-light)', color: 'var(--accent)' },
  qualified:         { bg: 'var(--warning-bg)', color: 'var(--warning)' },
  campaign_launched: { bg: 'var(--success-bg)', color: 'var(--success)' },
  appointment_booked:{ bg: 'var(--success-bg)', color: 'var(--success)' },
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { activities } = useActivityStore();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [hotLeads, setHotLeads] = useState([]);
  const [activeCampaign, setActiveCampaign] = useState(null);

  const handleActivityClick = (act) => {
    useActivityStore.getState().markRead(act.id);
    if (act.leadId) {
      navigate('/conversations');
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [statsRes, leadsRes, campaignsRes, activitiesRes] = await Promise.all([
          api.get('/analytics/overview'),
          api.get('/leads?status=hot'),
          api.get('/campaigns'),
          api.get('/analytics/activity')
        ]);
        
        if (statsRes.data.success) setStats(statsRes.data.data);
        if (leadsRes.data.success) setHotLeads(leadsRes.data.data.leads || []);
        if (campaignsRes.data.success) {
          const campaigns = campaignsRes.data.data;
          setActiveCampaign(campaigns.find(c => c.status === 'active') || null);
        }
        if (activitiesRes.data.success) {
          useActivityStore.getState().setActivities(activitiesRes.data.data);
        }
      } catch (err) {
        console.error("Failed to fetch dashboard data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);



  return (
    <PageWrapper>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] font-medium">
            <span>Welcome back, {user?.name?.split(' ')[0] || 'User'}</span>
            <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--border-subtle)' }} />
            <span>{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
          </div>
          {loading ? (
            <div className="skeleton h-3 w-48 rounded mt-1.5" />
          ) : (
            <h2 className="text-md font-medium mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              Agents actively monitoring <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{stats?.activeLeads ?? 0}</strong> leads today
            </h2>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            variant="primary"
            size="sm"
            icon={<Megaphone size={13} />}
            onClick={() => navigate('/campaigns')}
            data-tour="new-campaign"
            style={{ borderRadius: '8px', padding: '6px 12px', fontSize: '12px' }}
          >
            New Campaign
          </Button>
        </div>
      </div>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 auto-rows-[minmax(180px,auto)] mb-6">
        
        {/* Col 1: Total Leads */}
        <div className="lg:col-span-1">
          <StatCard
            title="Total Leads"
            value={stats?.totalLeads ?? 0}
            icon={<Users size={15} />}
            trend={12}
            trendLabel="this week"
            loading={loading}
            color="accent"
            sparklineData={[140, 180, 220, 190, 240, 290, stats?.totalLeads ?? 312]}
          />
        </div>

        {/* Col 2: Messages Sent */}
        <div className="lg:col-span-1">
          <StatCard
            title="Messages Sent"
            value={stats?.messagesSent ?? 0}
            icon={<MessageSquare size={15} />}
            trend={8}
            trendLabel="vs last week"
            loading={loading}
            color="accent"
            sparklineData={[450, 520, 590, 680, 710, 840, stats?.messagesSent ?? 910]}
          />
        </div>

        {/* Col 3: Qualified Leads */}
        <div className="lg:col-span-1">
          <StatCard
            title="Qualified Leads"
            value={stats?.qualifiedLeads ?? 0}
            icon={<Star size={15} />}
            trend={25}
            trendLabel="this month"
            loading={loading}
            color="warning"
            sparklineData={[15, 28, 34, 45, 62, 78, stats?.qualifiedLeads ?? 84]}
          />
        </div>

        {/* Col 4: Agent Engine / AI Status with Pulse Heartbeat */}
        <div className="lg:col-span-1">
          {loading ? (
            <div className="card-no-hover h-full flex flex-col justify-center">
              <div className="skeleton h-3 w-24 mb-4 rounded" />
              <div className="skeleton h-7 w-32 mb-2 rounded" />
              <div className="skeleton h-3 w-40 rounded" />
            </div>
          ) : (
            <div
              data-tour="agent-engine"
              className="card-no-hover h-full flex flex-col justify-between relative overflow-hidden group"
              style={{
                background: 'var(--bg-glass-strong)',
                border: '1px solid var(--border-glass)',
                boxShadow: 'var(--shadow-card)',
              }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
                    Agent Engine
                  </p>
                  <p className="text-md font-semibold mt-1" style={{ color: 'var(--text-primary)' }}>
                    AI Agent Active
                  </p>
                </div>
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}
                >
                  <Zap size={14} className="animate-pulse" />
                </div>
              </div>

              {/* Heartbeat Wave Animation */}
              <div className="w-full h-10 mt-3 relative overflow-hidden">
                <svg width="100%" height="40" viewBox="0 0 200 40" preserveAspectRatio="none" className="overflow-visible">
                  <path
                    className="heartbeat-line"
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M0,20 L40,20 L50,20 L60,10 L70,30 L80,20 L90,20 L100,20 L130,20 L140,5 L150,35 L160,20 L170,20 L200,20"
                  />
                </svg>
              </div>

              <div className="flex items-center gap-1.5 mt-2">
                <span className="live-dot" />
                <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Monitoring {stats?.activeLeads || 0} active leads
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Col 1 & 2 (Row 2 & 3): Live Activity Feed */}
        <div className="lg:col-span-2 lg:row-span-2">
          <div className="card-no-hover h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-md font-medium" style={{ color: 'var(--text-primary)' }}>Live Activity</h2>
                  <span
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                    style={{ background: 'var(--success-bg)', color: 'var(--success)' }}
                  >
                    <span className="live-dot" style={{ width: 5, height: 5 }} />
                    AI Running
                  </span>
                </div>
                <button
                  className="text-xs font-medium"
                  style={{ color: 'var(--accent)' }}
                  onClick={() => useActivityStore.getState().markAllRead()}
                >
                  Mark all read
                </button>
              </div>

              <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                {loading ? (
                  Array.from({ length: 4 }).map((_, idx) => (
                    <div key={idx} className="flex items-start gap-3 py-2 px-3">
                      <div className="skeleton w-7 h-7 rounded-lg flex-shrink-0" />
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="skeleton h-3 w-40 rounded" />
                        <div className="skeleton h-2.5 w-72 rounded" />
                      </div>
                      <div className="skeleton h-2 w-12 rounded mt-1" />
                    </div>
                  ))
                ) : activities.length === 0 ? (
                  <p className="text-xs text-center py-4" style={{ color: 'var(--text-muted)' }}>
                    No recent activities
                  </p>
                ) : (
                  activities.slice(0, 6).map((act) => {
                    const actColor = ACTIVITY_COLORS[act.type] || ACTIVITY_COLORS.message_sent;
                    return (
                      <div
                        key={act.id}
                        className="flex items-start gap-3 py-2 px-3 rounded-xl transition-all cursor-pointer hover:bg-[var(--bg-surface)]"
                        style={{
                          background: act.read ? 'transparent' : 'var(--accent-light)',
                          borderLeft: act.read ? 'none' : `2px solid var(--accent)`,
                        }}
                        onClick={() => handleActivityClick(act)}
                      >
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                          style={{ background: actColor.bg, color: actColor.color }}
                        >
                          {ACTIVITY_ICONS[act.type] || <Activity size={13} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                            {act.title}
                          </p>
                          <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-secondary)' }}>
                            {act.description}
                          </p>
                        </div>
                        <span className="text-xs flex-shrink-0 mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          {formatRelativeTime(act.timestamp)}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Col 3 (Row 2 & 3): Outreach Funnel with Stacked segments */}
        <div className="lg:col-span-1 lg:row-span-2">
          <div className="card-no-hover h-full flex flex-col justify-between space-y-4">
            <div>
              <h2 className="text-md font-medium" style={{ color: 'var(--text-primary)' }}>Outreach Funnel</h2>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Lead yield visualizer</p>
            </div>
            
            {loading ? (
              <div className="space-y-4 flex-1 justify-center flex flex-col">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <div className="skeleton h-3 w-20 rounded" />
                    <div className="skeleton h-3 w-8 rounded" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex-1 flex flex-col justify-center gap-4 py-2">
                {[
                  { label: 'Reply Rate', value: `${stats?.avgReplyRate || 0}%`, color: 'var(--accent)' },
                  { label: 'Qual. Rate', value: `${stats?.avgQualRate || 0}%`, color: 'var(--success)' },
                  { label: 'Today Messages', value: stats?.todayMessages || 0, color: 'var(--text-primary)' },
                  { label: 'Converted', value: stats?.convertedLeads || 0, color: 'var(--success)' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
                    <span className="text-sm font-semibold stat-value" style={{ color: item.color }}>
                      {item.value}
                    </span>
                  </div>
                ))}

                {/* Stacked Funnel segments */}
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between text-[10px] font-semibold text-muted tracking-wider uppercase">
                    <span>Funnel Yield</span>
                    <span style={{ color: 'var(--accent)' }}>{stats?.avgQualRate || 0}% Qual</span>
                  </div>
                  
                  {/* Stacked segment progress bar */}
                  <div className="w-full h-2 rounded-full bg-[var(--border-subtle)] overflow-hidden flex">
                    <div 
                      className="h-full bg-[var(--accent)]" 
                      style={{ width: `${stats?.avgReplyRate || 45}%`, opacity: 0.85 }} 
                      title="Replies"
                    />
                    <div 
                      className="h-full bg-[var(--success)]" 
                      style={{ width: `${stats?.avgQualRate || 20}%` }} 
                      title="Qualified"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-[var(--accent)]" /> Replies
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-[var(--success)]" /> Qualified
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Col 4 (Row 2): Hot Leads Alert */}
        <div className="lg:col-span-1">
          {loading ? (
            <div className="card-no-hover space-y-3 h-full flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-2">
                <div className="skeleton w-6 h-6 rounded-lg" />
                <div className="skeleton h-4 w-24 rounded" />
              </div>
              <div className="flex items-center gap-3 py-1">
                <div className="skeleton w-8 h-8 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="skeleton h-3 w-28 rounded" />
                  <div className="skeleton h-2.5 w-44 rounded" />
                </div>
              </div>
            </div>
          ) : hotLeads.length > 0 ? (
            <div
              className="card-no-hover h-full flex flex-col justify-between"
              style={{ borderLeft: '3px solid var(--danger)' }}
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-6 h-6 rounded-lg flex items-center justify-center"
                  style={{ background: 'var(--danger-bg)' }}
                >
                  <Flame size={13} style={{ color: 'var(--danger)' }} />
                </div>
                <h2 className="text-sm font-semibold" style={{ color: 'var(--danger)' }}>
                  {hotLeads.length} Hot Lead{hotLeads.length > 1 ? 's' : ''}
                </h2>
              </div>

              <div className="space-y-2 max-h-[100px] overflow-y-auto pr-1">
                {hotLeads.slice(0, 2).map((lead) => (
                  <div
                    key={lead.id}
                    className="flex items-start gap-3 py-1.5 cursor-pointer group"
                    onClick={() => navigate('/conversations')}
                  >
                    <div className="avatar avatar-sm hot-badge flex-shrink-0">
                      {lead.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold group-hover:underline truncate" style={{ color: 'var(--text-primary)' }}>
                        {lead.name}
                      </p>
                      <p className="text-[10px] truncate" style={{ color: 'var(--text-secondary)' }}>
                        {lead.lastMessage}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <Button
                variant="danger"
                size="sm"
                className="w-full mt-2 text-xs py-1"
                onClick={() => navigate('/conversations')}
              >
                Take Over
              </Button>
            </div>
          ) : (
            <div className="card-no-hover h-full flex flex-col justify-center items-center text-center p-4">
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[var(--success-bg)] text-[var(--success)] mb-2">
                <CheckCircle2 size={14} />
              </div>
              <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>All caught up</p>
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>No handoffs pending</p>
            </div>
          )}
        </div>

        {/* Col 4 (Row 3): Active Campaign mini Card */}
        <div className="lg:col-span-1">
          {loading ? (
            <div className="card-no-hover space-y-3 h-full flex flex-col justify-center">
              <div className="flex justify-between items-center mb-2">
                <div className="skeleton h-4 w-32 rounded" />
                <div className="skeleton h-4 w-16 rounded" />
              </div>
              <div className="skeleton h-14 w-full rounded-xl" />
            </div>
          ) : activeCampaign ? (
            <div className="card-no-hover h-full flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Active Outreach</h2>
                <Badge variant="active" dot={false} className="text-[9px] py-0.5">Active</Badge>
              </div>
              <div
                className="p-3 rounded-xl flex-1 flex flex-col justify-center"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
              >
                <p className="text-xs font-medium truncate mb-2" style={{ color: 'var(--text-primary)' }}>
                  {activeCampaign.name}
                </p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  {[
                    { label: 'Leads', val: activeCampaign.totalLeads },
                    { label: 'Replies', val: `${activeCampaign.replyRate}%` },
                    { label: 'Qual', val: activeCampaign.qualified },
                  ].map((m) => (
                    <div key={m.label}>
                      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{m.label}</p>
                      <p className="text-xs font-bold mt-0.5" style={{ color: 'var(--text-primary)' }}>{m.val}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="card-no-hover h-full flex flex-col justify-center items-center text-center p-4">
              <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>No active campaigns</p>
              <Button
                variant="primary"
                size="sm"
                className="text-xs py-1"
                onClick={() => navigate('/campaigns')}
              >
                Start Campaign
              </Button>
            </div>
          )}
        </div>

      </div>
    </PageWrapper>
  );
}
