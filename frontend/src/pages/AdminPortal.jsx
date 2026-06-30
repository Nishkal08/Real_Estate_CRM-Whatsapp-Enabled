import { useState, useEffect } from 'react';
import { Terminal, Users, Megaphone, MessageSquare, Trash2, Building, BarChart3, Plus, ShieldCheck, X } from 'lucide-react';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { StatCard } from '@/components/analytics/StatCard';
import { toast } from '@/stores/uiStore';
import api from '@/services/api';

export default function AdminPortal() {
  const [stats, setStats] = useState(null);
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  
  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    password: '',
    plan: 'starter'
  });
  const [creating, setCreating] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, bizRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/businesses')
      ]);
      setStats(statsRes.data.data);
      setBusinesses(bizRes.data.data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to retrieve admin data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDeleteBusiness = async (biz) => {
    const confirmText = `⚠️ WARNING: This will permanently delete the tenant "${biz.name}" (${biz.email}) along with all campaigns, knowledge bases, leads, appointments, and conversation logs. \n\nType the business name "${biz.name}" below to confirm deletion:`;
    const userInput = window.prompt(confirmText);
    
    if (userInput !== biz.name) {
      if (userInput !== null) {
        toast.error("Business name did not match. Deletion aborted.");
      }
      return;
    }

    setDeletingId(biz.id);
    try {
      await api.delete(`/admin/businesses/${biz.id}`);
      toast.success(`Successfully deleted business "${biz.name}"`);
      fetchData(); // Reload list
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete business');
    } finally {
      setDeletingId(null);
    }
  };

  const handleUpdatePlan = async (bizId, newPlan) => {
    try {
      await api.put(`/admin/businesses/${bizId}/plan`, { plan: newPlan });
      toast.success("Subscription plan updated successfully!");
      // Update local state instantly
      setBusinesses(prev => prev.map(b => b.id === bizId ? { ...b, plan: newPlan } : b));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update plan');
    }
  };

  const handleCreateBusiness = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await api.post('/admin/businesses', createForm);
      toast.success(`Successfully registered tenant "${createForm.name}"!`);
      setShowCreateModal(false);
      setCreateForm({ name: '', email: '', password: '', plan: 'starter' });
      fetchData(); // Reload list
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to register business');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <PageWrapper>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent)]" />
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading admin workspace...</p>
          </div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      {/* Metrics Row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Registered Businesses"
          value={stats?.businesses || 0}
          icon={<Building size={16} />}
          color="accent"
          loading={loading}
        />
        <StatCard
          title="Total Platform Leads"
          value={stats?.leads || 0}
          icon={<Users size={16} />}
          color="success"
          loading={loading}
        />
        <StatCard
          title="Active Campaigns"
          value={stats?.campaigns || 0}
          icon={<Megaphone size={16} />}
          color="accent"
          loading={loading}
        />
        <StatCard
          title="Total WhatsApp Messages"
          value={stats?.messages || 0}
          icon={<MessageSquare size={16} />}
          color="warning"
          loading={loading}
        />
      </div>

      {/* Main Content */}
      <div className="card-no-hover p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Manage Tenants</h2>
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>View, add, and monitor registered business accounts on Aurion CRM.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={fetchData} icon={<BarChart3 size={13} />}>
              Refresh List
            </Button>
            <Button variant="primary" size="sm" onClick={() => setShowCreateModal(true)} icon={<Plus size={13} />}>
              Create Tenant
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr style={{ borderBottom: '1.5px solid var(--border-subtle)' }}>
                <th className="pb-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Business Info</th>
                <th className="pb-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Plan & WhatsApp</th>
                <th className="pb-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Leads</th>
                <th className="pb-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Campaigns</th>
                <th className="pb-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Created</th>
                <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-right" style={{ color: 'var(--text-muted)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {businesses.map((biz) => {
                const isSelf = biz.email === 'nishkal2005@gmail.com';
                return (
                  <tr key={biz.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td className="py-4">
                      <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                        {biz.name}
                        {isSelf && (
                          <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase bg-[rgba(59,130,246,0.15)] text-[var(--primary)]">
                            Admin Account
                          </span>
                        )}
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{biz.email}</div>
                    </td>
                    <td className="py-4">
                      {isSelf ? (
                        <span className="text-[11px] font-bold uppercase px-2 py-0.5 rounded bg-[rgba(245,158,11,0.15)] text-[var(--warning)]">
                          {biz.plan}
                        </span>
                      ) : (
                        <select
                          value={biz.plan}
                          onChange={(e) => handleUpdatePlan(biz.id, e.target.value)}
                          className="text-[11px] font-bold uppercase px-1 py-0.5 rounded border bg-[var(--bg-elevated)]"
                          style={{
                            color: biz.plan === 'enterprise' ? 'var(--warning)' : 'var(--text-primary)',
                            borderColor: 'var(--border-subtle)',
                          }}
                        >
                          <option value="starter">Starter</option>
                          <option value="pro">Pro</option>
                          <option value="enterprise">Enterprise</option>
                        </select>
                      )}
                      <div className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>{biz.waNumber || 'Not Linked'}</div>
                    </td>
                    <td className="py-4 text-sm" style={{ color: 'var(--text-primary)' }}>{biz.stats.leads}</td>
                    <td className="py-4 text-sm" style={{ color: 'var(--text-primary)' }}>{biz.stats.campaigns}</td>
                    <td className="py-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {new Date(biz.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </td>
                    <td className="py-4 text-right">
                      {!isSelf && (
                        <Button
                          variant="danger"
                          size="sm"
                          icon={<Trash2 size={13} />}
                          loading={deletingId === biz.id}
                          onClick={() => handleDeleteBusiness(biz)}
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Tenant Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div
            className="w-full max-w-md rounded-2xl p-6"
            style={{
              background: 'var(--bg-glass-strong)',
              border: '1px solid var(--border-subtle)',
              boxShadow: 'var(--shadow-float)',
              backdropFilter: 'var(--blur-md)'
            }}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-md font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <Building size={16} /> Register New Tenant
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="btn-icon p-1">
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleCreateBusiness} className="space-y-4">
              <Input
                label="Business Name"
                value={createForm.name}
                onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Sterling Realities"
                required
              />

              <Input
                label="Owner Email Address"
                type="email"
                value={createForm.email}
                onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))}
                placeholder="e.g. admin@sterling.com"
                required
              />

              <Input
                label="Default Password"
                type="password"
                value={createForm.password}
                onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))}
                placeholder="Password"
                required
              />

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  Subscription Tier
                </label>
                <select
                  value={createForm.plan}
                  onChange={e => setCreateForm(f => ({ ...f, plan: e.target.value }))}
                  className="w-full p-2.5 rounded-xl border text-sm bg-[var(--bg-elevated)]"
                  style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
                >
                  <option value="starter">Starter Plan</option>
                  <option value="pro">Pro Plan</option>
                  <option value="enterprise">Enterprise Plan</option>
                </select>
              </div>

              <div className="flex gap-3 mt-6">
                <Button variant="outline" type="button" className="flex-1 justify-center" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" className="flex-1 justify-center" loading={creating}>
                  Create Business
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
