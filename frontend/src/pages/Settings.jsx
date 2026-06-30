import { useState } from 'react';
import { Settings as SettingsIcon, Building2, Phone, Bell, Key, AlertTriangle, Save, Eye, EyeOff } from 'lucide-react';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { toast } from '@/stores/uiStore';
import { cn } from '@/utils/cn';
import useAuthStore from '@/stores/authStore';
import api from '@/services/api';

const TABS = [
  { id: 'profile', label: 'Business Profile', icon: <Building2 size={14} /> },
  { id: 'whatsapp', label: 'WhatsApp', icon: <Phone size={14} /> },
  { id: 'notifications', label: 'Notifications', icon: <Bell size={14} /> },
  { id: 'api', label: 'API Keys', icon: <Key size={14} /> },
  { id: 'danger', label: 'Danger Zone', icon: <AlertTriangle size={14} /> },
];

function ProfileTab() {
  const { user } = useAuthStore();
  const business = user?.business || {};

  const [form, setForm] = useState({
    name: business.name || '',
    email: user?.email || '',
    phone: business.phone || '',
    city: business.city || '',
    state: business.state || '',
  });

  return (
    <div className="space-y-5 max-w-xl">
      <div className="grid grid-cols-2 gap-4">
        <Input label="Business Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        <Input label="Email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
        <Input label="Phone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
        <Input label="City" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
      </div>
      <Button variant="primary" size="sm" icon={<Save size={13} />} onClick={async () => {
        // API call to update profile could go here
        toast.success('Profile updated successfully!');
      }}>
        Save Changes
      </Button>
    </div>
  );
}

function WhatsAppTab() {
  return (
    <div className="space-y-4 max-w-xl">
      <div
        className="flex items-center gap-3 p-4 rounded-xl"
        style={{ background: 'var(--success-bg)', border: '1px solid rgba(22,163,74,0.2)' }}
      >
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--success)', color: '#fff' }}>
          <Phone size={15} color="#fff" />
        </div>
        <div>
          <p className="text-sm font-medium" style={{ color: 'var(--success)' }}>WhatsApp Connected</p>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Twilio Sandbox: +1 415 523 8886</p>
        </div>
      </div>
      <Input label="Twilio WhatsApp Number" value="+14155238886" readOnly />
      <Input label="Webhook URL" value="https://your-backend.railway.app/webhook/whatsapp/incoming" readOnly />
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
        Set this URL in your Twilio console under WhatsApp sandbox settings.
      </p>
    </div>
  );
}

function NotificationsTab() {
  const [settings, setSettings] = useState({
    hotLead: true,
    newMessage: true,
    campaignComplete: true,
    qualifiedLead: false,
    dailyDigest: true,
  });

  const toggles = [
    { key: 'hotLead', label: 'Hot lead detected', desc: 'When a lead scores 4/4' },
    { key: 'newMessage', label: 'New incoming message', desc: 'Each WhatsApp reply' },
    { key: 'campaignComplete', label: 'Campaign completed', desc: 'When all leads are processed' },
    { key: 'qualifiedLead', label: 'Lead qualified', desc: 'When score reaches 3+' },
    { key: 'dailyDigest', label: 'Daily digest email', desc: 'Morning summary of activity' },
  ];

  return (
    <div className="space-y-3 max-w-xl">
      {toggles.map(t => (
        <div key={t.key} className="flex items-center justify-between p-4 rounded-xl" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t.label}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{t.desc}</p>
          </div>
          <button
            onClick={() => {
              setSettings(s => ({ ...s, [t.key]: !s[t.key] }));
              toast.success('Settings updated');
            }}
            className="w-10 h-5 rounded-full transition-all relative flex-shrink-0 ml-4"
            style={{
              background: settings[t.key] ? 'var(--accent)' : 'var(--border-subtle)',
            }}
          >
            <span
              className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform"
              style={{ transform: settings[t.key] ? 'translateX(20px)' : 'translateX(0)' }}
            />
          </button>
        </div>
      ))}
    </div>
  );
}

function APIKeysTab() {
  const [showKeys, setShowKeys] = useState({});

  const keys = [
    { id: 'gemini', label: 'Gemini API Key', value: 'AIzaSy••••••••••••••••••••••••••' },
    { id: 'mistral', label: 'Mistral API Key', value: 'mis-••••••••••••••••••••••••••' },
    { id: 'twilio_sid', label: 'Twilio Account SID', value: 'AC••••••••••••••••••••••••••••••' },
  ];

  return (
    <div className="space-y-4 max-w-xl">
      <div className="p-3 rounded-xl" style={{ background: 'var(--warning-bg)', border: '1px solid rgba(217,119,6,0.2)' }}>
        <div className="flex items-center gap-2">
          <AlertTriangle size={13} style={{ color: 'var(--warning)', flexShrink: 0 }} />
          <p className="text-xs" style={{ color: 'var(--warning)' }}>
            Never share API keys. These are masked for your security.
          </p>
        </div>
      </div>
      {keys.map(k => (
        <div key={k.id} className="relative">
          <Input
            label={k.label}
            value={showKeys[k.id] ? 'actual-value-would-be-here' : k.value}
            readOnly
            iconRight={
              <button onClick={() => setShowKeys(s => ({ ...s, [k.id]: !s[k.id] }))} className="btn-icon p-0">
                {showKeys[k.id] ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            }
          />
        </div>
      ))}
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
        API keys are stored in environment variables on the server.
      </p>
    </div>
  );
}

function DangerZoneTab() {
  const [clearingKB, setClearingKB] = useState(false);
  const [deletingLeads, setDeletingLeads] = useState(false);
  const [resettingDemo, setResettingDemo] = useState(false);

  const handleClearKB = async () => {
    if (!window.confirm("Are you absolutely sure you want to clear the entire Knowledge Base? This will delete all uploaded files and embedded chunks, and CANNOT be undone.")) {
      return;
    }
    setClearingKB(true);
    try {
      // Fetch KBs list first to get current KB ID
      const kbsRes = await api.get('/kb');
      const activeKb = kbsRes.data.data?.[0];
      if (!activeKb) {
        toast.error("No active Knowledge Base found.");
        return;
      }
      await api.delete(`/kb/${activeKb.id}/clear`);
      toast.success("Knowledge Base cleared successfully!");
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to clear Knowledge Base");
    } finally {
      setClearingKB(false);
    }
  };

  const handleDeleteLeads = async () => {
    if (!window.confirm("Are you absolutely sure you want to delete all leads, conversation history, and calendar bookings? This action is permanent and CANNOT be undone.")) {
      return;
    }
    setDeletingLeads(true);
    try {
      await api.delete('/leads/clear');
      toast.success("All leads and conversation logs deleted!");
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to delete leads");
    } finally {
      setDeletingLeads(false);
    }
  };

  const handleResetDemo = async () => {
    if (!window.confirm("Are you sure you want to restore the application to the default SolarBright demo state? This will clear all current records and recreate the standard demo setup.")) {
      return;
    }
    setResettingDemo(true);
    try {
      await api.post('/auth/reset-demo');
      toast.success("Demo data restored successfully!");
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to restore demo data");
    } finally {
      setResettingDemo(false);
    }
  };

  return (
    <div className="space-y-4 max-w-xl">
      <div className="flex items-start justify-between p-4 rounded-xl" style={{ background: 'var(--danger-bg)', border: '1px solid rgba(220,38,38,0.2)' }}>
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--danger)' }}>Clear Knowledge Base</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>Delete all uploaded documents and embedded chunks. This cannot be undone.</p>
        </div>
        <Button
          variant="danger"
          size="sm"
          className="flex-shrink-0 ml-4"
          loading={clearingKB}
          onClick={handleClearKB}
        >
          Clear KB
        </Button>
      </div>

      <div className="flex items-start justify-between p-4 rounded-xl" style={{ background: 'var(--danger-bg)', border: '1px solid rgba(220,38,38,0.2)' }}>
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--danger)' }}>Delete All Leads</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>Permanently delete all lead records and conversation history.</p>
        </div>
        <Button
          variant="danger"
          size="sm"
          className="flex-shrink-0 ml-4"
          loading={deletingLeads}
          onClick={handleDeleteLeads}
        >
          Delete Leads
        </Button>
      </div>

      <div className="flex items-start justify-between p-4 rounded-xl" style={{ background: 'var(--danger-bg)', border: '1px solid rgba(220,38,38,0.2)' }}>
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--danger)' }}>Reset Demo Data</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>Restore the app to the original SolarBright demo state.</p>
        </div>
        <Button
          variant="danger"
          size="sm"
          className="flex-shrink-0 ml-4"
          loading={resettingDemo}
          onClick={handleResetDemo}
        >
          Reset to Demo
        </Button>
      </div>
    </div>
  );
}

export default function Settings() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('profile');

  const isDemoUser = user?.email === 'demo@solarbright.in';
  const visibleTabs = TABS.filter(tab => {
    if (tab.id === 'api' || tab.id === 'danger') {
      return isDemoUser;
    }
    return true;
  });

  const CONTENT = {
    profile: <ProfileTab />,
    whatsapp: <WhatsAppTab />,
    notifications: <NotificationsTab />,
    api: <APIKeysTab />,
    danger: <DangerZoneTab />,
  };

  return (
    <PageWrapper>
      <div className="page-header" style={{ paddingBottom: 0 }}>
      </div>

      <div className="flex gap-6">
        {/* Sidebar nav */}
        <div className="w-48 flex-shrink-0 space-y-1">
          {visibleTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'nav-item w-full text-left',
                activeTab === tab.id && 'active',
                tab.id === 'danger' && activeTab !== tab.id && 'hover:!bg-[var(--danger-bg)] hover:!text-[var(--danger)]'
              )}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 card-no-hover min-h-[400px]">
          <h2 className="text-lg mb-6" style={{ color: 'var(--text-primary)' }}>
            {TABS.find(t => t.id === activeTab)?.label}
          </h2>
          {CONTENT[activeTab]}
        </div>
      </div>
    </PageWrapper>
  );
}
