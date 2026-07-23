'use client';

import { useState } from 'react';
import { updateGlobalSettings } from '../actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Plus, Shield, Zap, Mail, Settings, CreditCard, Database, DownloadCloud } from 'lucide-react';

type PaymentMethod = {
  id: string;
  name: string;
  accountNumber: string;
  qrCodeUrl: string;
};

export function SettingsForm({ initialData }: { initialData: any }) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [exportOptions, setExportOptions] = useState({
    businesses: true,
    users: true,
    subscriptionRequests: true,
    globalSettings: true,
    systemAlerts: true,
  });
  
  const exportUrl = `/hq/api/export?entities=${Object.entries(exportOptions).filter(([k, v]) => v).map(([k]) => k).join(',')}`;
  
  // Safely parse initial payment methods
  let defaultMethods: PaymentMethod[] = [];
  try {
    if (Array.isArray(initialData.paymentMethods)) {
      defaultMethods = initialData.paymentMethods;
    }
  } catch (e) {}

  const [methods, setMethods] = useState<PaymentMethod[]>(defaultMethods);
  
  // Form State for new fields
  const [formData, setFormData] = useState({
    maintenanceMode: initialData.maintenanceMode ?? false,
    allowNewSignups: initialData.allowNewSignups ?? true,
    defaultTrialDays: initialData.defaultTrialDays ?? 30,
    defaultPlanId: initialData.defaultPlanId ?? 'FREE',
    supportEmail: initialData.supportEmail ?? '',
    replyToEmail: initialData.replyToEmail ?? '',
    termsUrl: initialData.termsUrl ?? '',
    privacyUrl: initialData.privacyUrl ?? '',
    freeTierProjectLimit: initialData.freeTierProjectLimit ?? 3,
    proTierProjectLimit: initialData.proTierProjectLimit ?? 20,
    maxFailedLogins: initialData.maxFailedLogins ?? 5,
    sessionTimeoutMinutes: initialData.sessionTimeoutMinutes ?? 15,
  });

  const handleAddMethod = () => {
    setMethods([
      ...methods, 
      { id: Date.now().toString(), name: '', accountNumber: '', qrCodeUrl: '' }
    ]);
  };

  const handleRemoveMethod = (id: string) => {
    setMethods(methods.filter(m => m.id !== id));
  };

  const handleMethodChange = (id: string, field: keyof PaymentMethod, value: string) => {
    setMethods(methods.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const target = e.target as HTMLInputElement;
    const value = target.type === 'checkbox' ? target.checked : 
                  target.type === 'number' ? parseInt(target.value) : 
                  target.value;
    setFormData({ ...formData, [target.name]: value });
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);

    try {
      const res = await updateGlobalSettings({ ...formData, paymentMethods: methods });
      if (res?.success) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        alert(res?.error || 'Failed to update settings');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update settings');
    } finally {
      setLoading(false);
    }
  }

  const tabs = [
    { id: 'general', label: 'General & Quotas', icon: Settings },
    { id: 'security', label: 'Security & Access', icon: Shield },
    { id: 'subscription', label: 'Subscriptions', icon: Zap },
    { id: 'communications', label: 'Communications', icon: Mail },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'data', label: 'Data & Backups', icon: Database },
  ];

  return (
    <div className="flex flex-col md:flex-row gap-8">
      {/* Sidebar Tabs */}
      <div className="w-full md:w-64 space-y-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id 
                ? 'bg-primary text-primary-foreground shadow-sm' 
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Form Content */}
      <div className="flex-1">
        <form onSubmit={handleSubmit} className="bg-card border border-border/50 rounded-xl shadow-sm overflow-hidden">
          <div className="p-6 space-y-6">
            
            {activeTab === 'general' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                <h3 className="text-lg font-semibold border-b border-border/50 pb-4">General Configuration & Quotas</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Free Tier Project Limit</label>
                    <Input type="number" name="freeTierProjectLimit" value={formData.freeTierProjectLimit} onChange={handleInputChange} />
                    <p className="text-xs text-muted-foreground">Max projects allowed on free plan.</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Pro Tier Project Limit</label>
                    <Input type="number" name="proTierProjectLimit" value={formData.proTierProjectLimit} onChange={handleInputChange} />
                    <p className="text-xs text-muted-foreground">Max projects allowed on pro plan.</p>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium">Terms of Service URL</label>
                    <Input type="url" name="termsUrl" value={formData.termsUrl} onChange={handleInputChange} placeholder="https://..." />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium">Privacy Policy URL</label>
                    <Input type="url" name="privacyUrl" value={formData.privacyUrl} onChange={handleInputChange} placeholder="https://..." />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                <h3 className="text-lg font-semibold border-b border-border/50 pb-4">Security & Access Control</h3>
                
                <div className="space-y-4">
                  <label className="flex items-center gap-3 p-4 border border-border/50 rounded-lg bg-muted/20 cursor-pointer hover:bg-muted/50 transition-colors">
                    <input type="checkbox" name="maintenanceMode" checked={formData.maintenanceMode} onChange={handleInputChange} className="w-4 h-4 text-primary" />
                    <div>
                      <div className="font-medium">Maintenance Mode</div>
                      <div className="text-xs text-muted-foreground">Block all non-admin users from accessing the app.</div>
                    </div>
                  </label>
                  
                  <label className="flex items-center gap-3 p-4 border border-border/50 rounded-lg bg-muted/20 cursor-pointer hover:bg-muted/50 transition-colors">
                    <input type="checkbox" name="allowNewSignups" checked={formData.allowNewSignups} onChange={handleInputChange} className="w-4 h-4 text-primary" />
                    <div>
                      <div className="font-medium">Allow New Signups</div>
                      <div className="text-xs text-muted-foreground">Toggle open or closed registrations.</div>
                    </div>
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Max Failed Logins</label>
                    <Input type="number" name="maxFailedLogins" value={formData.maxFailedLogins} onChange={handleInputChange} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Admin Session Timeout (Minutes)</label>
                    <Input type="number" name="sessionTimeoutMinutes" value={formData.sessionTimeoutMinutes} onChange={handleInputChange} />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'subscription' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                <h3 className="text-lg font-semibold border-b border-border/50 pb-4">Subscriptions & Trials</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Default Trial Days</label>
                    <Input type="number" name="defaultTrialDays" value={formData.defaultTrialDays} onChange={handleInputChange} />
                    <p className="text-xs text-muted-foreground">Length of the free trial.</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Default Plan ID</label>
                    <select 
                      name="defaultPlanId" 
                      value={formData.defaultPlanId} 
                      onChange={handleInputChange}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="FREE">FREE</option>
                      <option value="PRO">PRO</option>
                      <option value="BUSINESS">BUSINESS</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'communications' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                <h3 className="text-lg font-semibold border-b border-border/50 pb-4">Communications & Support</h3>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Support Email Address</label>
                    <Input type="email" name="supportEmail" value={formData.supportEmail} onChange={handleInputChange} placeholder="support@yourcompany.com" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Default Reply-To Email</label>
                    <Input type="email" name="replyToEmail" value={formData.replyToEmail} onChange={handleInputChange} placeholder="noreply@yourcompany.com" />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'payments' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                <h3 className="text-lg font-semibold border-b border-border/50 pb-4 flex items-center justify-between">
                  Payment Methods
                  <Button type="button" variant="outline" size="sm" onClick={handleAddMethod}>
                    <Plus className="w-4 h-4 mr-2" /> Add
                  </Button>
                </h3>
                
                <div className="space-y-4">
                  {methods.map((method, index) => (
                    <div key={method.id} className="p-4 border border-border/50 rounded-lg relative bg-muted/20">
                      <button type="button" onClick={() => handleRemoveMethod(method.id)} className="absolute top-4 right-4 p-2 text-red-500 hover:bg-red-500/10 rounded-md">
                        <Trash2 className="w-4 h-4" />
                      </button>
                      
                      <h4 className="text-sm font-semibold mb-4">Method {index + 1}</h4>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-medium mb-1">Method Name</label>
                          <Input required value={method.name} onChange={e => handleMethodChange(method.id, 'name', e.target.value)} placeholder="e.g. Bank Transfer" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1">Account Details / Number</label>
                          <Input required value={method.accountNumber} onChange={e => handleMethodChange(method.id, 'accountNumber', e.target.value)} />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1">QR Code Image URL (Optional)</label>
                          <Input type="url" value={method.qrCodeUrl} onChange={e => handleMethodChange(method.id, 'qrCodeUrl', e.target.value)} />
                        </div>
                      </div>
                    </div>
                  ))}
                  {methods.length === 0 && (
                    <div className="p-8 text-center border-2 border-dashed border-border/50 rounded-xl text-muted-foreground">
                      No payment methods configured.
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'data' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                <h3 className="text-lg font-semibold border-b border-border/50 pb-4">Data & Backups</h3>
                
                <div className="space-y-4">
                  <div className="p-6 border border-border/50 rounded-xl bg-muted/10">
                    <h4 className="text-base font-semibold mb-2">Selective Database Export</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Choose which data tables to include in your JSON backup download. Keep this file secure.
                    </p>
                    
                    <div className="space-y-3 mb-6 bg-background rounded-lg border border-border/50 p-4">
                      {Object.entries({
                        businesses: 'Organizations (Businesses)',
                        users: 'Users Directory',
                        subscriptionRequests: 'Subscription History',
                        globalSettings: 'Global Settings',
                        systemAlerts: 'System Broadcasts'
                      }).map(([key, label]) => (
                        <label key={key} className="flex items-center gap-3 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={exportOptions[key as keyof typeof exportOptions]}
                            onChange={(e) => setExportOptions(prev => ({ ...prev, [key]: e.target.checked }))}
                            className="w-4 h-4 text-primary rounded border-border"
                          />
                          <span className="text-sm font-medium">{label}</span>
                        </label>
                      ))}
                    </div>

                    <a href={exportUrl} download>
                      <Button type="button" className="bg-indigo-600 hover:bg-indigo-700 text-white" disabled={!Object.values(exportOptions).some(Boolean)}>
                        <DownloadCloud className="w-4 h-4 mr-2" />
                        Export Selected Data
                      </Button>
                    </a>
                  </div>
                </div>
              </div>
            )}

          </div>
          
          {/* Footer actions */}
          <div className="p-6 bg-muted/20 border-t border-border/50 flex items-center justify-end gap-4">
            {success && <span className="text-sm text-green-500 font-medium animate-in fade-in">Saved successfully!</span>}
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save All Settings'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
