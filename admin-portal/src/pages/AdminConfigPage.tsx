import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../api/admin.api';
import { Department, RoutingRule, PriorityWeights, StaffUser } from '../types/admin';
import { AHMEDABAD_WARDS } from '../utils/wardsData';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Modal } from '../components/common/Modal';
import { Skeleton } from '../components/common/Skeleton';
import { EmptyState } from '../components/common/EmptyState';
import { CategoryIcon } from '../components/common/CategoryIcon';
import {
  Sliders,
  Plus,
  Trash2,
  Save,
  Building2,
  Route,
  Scale,
  Users,
  Check,
  AlertCircle,
  Shield,
  Layers,
  Sparkles,
} from 'lucide-react';

export const AdminConfigPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'categories' | 'routing' | 'weights' | 'users'>(
    'categories'
  );

  // Status feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // ── 1. Categories State & Query ──
  const { data: categories = [], isLoading: isCategoriesLoading } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: () => adminApi.getCategories(),
  });

  const [categoryList, setCategoryList] = useState<string[]>([]);
  const [newCategoryInput, setNewCategoryInput] = useState('');

  React.useEffect(() => {
    if (categories.length > 0) {
      setCategoryList(categories);
    }
  }, [categories]);

  const handleAddCategory = () => {
    const trimmed = newCategoryInput.trim().toLowerCase().replace(/\s+/g, '_');
    if (trimmed && !categoryList.includes(trimmed)) {
      setCategoryList([...categoryList, trimmed]);
      setNewCategoryInput('');
    }
  };

  const handleRemoveCategory = (catToRemove: string) => {
    setCategoryList(categoryList.filter((c) => c !== catToRemove));
  };

  const handleSaveCategories = async () => {
    try {
      await adminApi.updateCategories(categoryList);
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      showToast('Category list updated successfully!');
    } catch (e: any) {
      alert(e.message || 'Failed to update categories');
    }
  };

  // ── 2. Routing Rules State & Query ──
  const { data: routingRules = [], isLoading: isRulesLoading } = useQuery({
    queryKey: ['admin-routing-rules'],
    queryFn: () => adminApi.getRoutingRules(),
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['admin-departments'],
    queryFn: () => adminApi.getDepartments(),
  });

  // Modal for new routing rule
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [ruleCategory, setRuleCategory] = useState('pothole');
  const [ruleWardId, setRuleWardId] = useState('');
  const [ruleDeptId, setRuleDeptId] = useState('');

  const handleUpsertRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleDeptId) return;

    try {
      await adminApi.upsertRoutingRule({
        category: ruleCategory,
        ward_id: ruleWardId || undefined,
        department_id: ruleDeptId,
      });
      queryClient.invalidateQueries({ queryKey: ['admin-routing-rules'] });
      setIsRuleModalOpen(false);
      showToast('Routing rule configured successfully!');
    } catch (err: any) {
      alert(err.message || 'Failed to upsert routing rule');
    }
  };

  const handleDeleteRule = async (id: string) => {
    if (!confirm('Are you sure you want to delete this routing rule?')) return;
    try {
      await adminApi.deleteRoutingRule(id);
      queryClient.invalidateQueries({ queryKey: ['admin-routing-rules'] });
      showToast('Routing rule removed');
    } catch (err: any) {
      alert(err.message || 'Failed to delete routing rule');
    }
  };

  // ── 3. Priority Weights State & Query ──
  const { data: priorityWeights, isLoading: isWeightsLoading } = useQuery({
    queryKey: ['admin-priority-weights'],
    queryFn: () => adminApi.getPriorityWeights(),
  });

  const [weights, setWeights] = useState({
    w1: 1.0,
    w2: 2.0,
    w3: 5.0,
    w4: 1.5,
  });

  React.useEffect(() => {
    if (priorityWeights?.priority_weights) {
      setWeights({
        w1: priorityWeights.priority_weights.w1 ?? 1.0,
        w2: priorityWeights.priority_weights.w2 ?? 2.0,
        w3: priorityWeights.priority_weights.w3 ?? 5.0,
        w4: priorityWeights.priority_weights.w4 ?? 1.5,
      });
    }
  }, [priorityWeights]);

  const handleSaveWeights = async () => {
    try {
      await adminApi.updatePriorityWeights({ priority_weights: weights });
      queryClient.invalidateQueries({ queryKey: ['admin-priority-weights'] });
      showToast('Priority weights updated successfully!');
    } catch (e: any) {
      alert(e.message || 'Failed to save weights');
    }
  };

  // ── 4. Staff Users State & Query ──
  const { data: staffList = [], isLoading: isStaffLoading } = useQuery({
    queryKey: ['admin-staff-list'],
    queryFn: () => adminApi.listStaff(),
  });

  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [newStaff, setNewStaff] = useState({
    name: '',
    email: '',
    password: '',
    role: 'staff',
    department_id: '',
  });

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adminApi.createStaff({
        ...newStaff,
        department_id: newStaff.department_id || undefined,
      });
      queryClient.invalidateQueries({ queryKey: ['admin-staff-list'] });
      setIsStaffModalOpen(false);
      setNewStaff({
        name: '',
        email: '',
        password: '',
        role: 'staff',
        department_id: '',
      });
      showToast('New staff officer account registered!');
    } catch (err: any) {
      alert(err.message || 'Failed to create staff account');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-semibold animate-in slide-in-from-bottom-5">
          <Check className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
            <Sliders className="w-6 h-6 text-brand-400" />
            System Administration &amp; Configuration
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Configure report categories, automated routing rules table, and scoring parameters (Super Admin)
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-background-border pb-px overflow-x-auto text-xs">
        <button
          onClick={() => setActiveTab('categories')}
          className={`flex items-center gap-2 px-4 py-3 font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'categories'
              ? 'border-brand-500 text-brand-300 bg-brand-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          Report Categories ({categoryList.length})
        </button>

        <button
          onClick={() => setActiveTab('routing')}
          className={`flex items-center gap-2 px-4 py-3 font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'routing'
              ? 'border-brand-500 text-brand-300 bg-brand-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Route className="w-4 h-4" />
          Automated Routing Rules ({routingRules.length})
        </button>

        <button
          onClick={() => setActiveTab('weights')}
          className={`flex items-center gap-2 px-4 py-3 font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'weights'
              ? 'border-brand-500 text-brand-300 bg-brand-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Scale className="w-4 h-4" />
          Priority Weights Formula
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-3 font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'users'
              ? 'border-brand-500 text-brand-300 bg-brand-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          Staff Directory ({staffList.length})
        </button>
      </div>

      {/* ── TAB 1: CATEGORIES ── */}
      {activeTab === 'categories' && (
        <div className="bg-background-card border border-background-border rounded-2xl p-6 shadow-card space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-100">Municipal Grievance Categories</h3>
              <p className="text-xs text-slate-400">
                Active incident categories available to citizens on mobile submission
              </p>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={handleSaveCategories}
              leftIcon={<Save className="w-4 h-4" />}
            >
              Save Category Changes
            </Button>
          </div>

          {/* Add Category Input */}
          <div className="flex items-center gap-3 max-w-md">
            <Input
              placeholder="New category name (e.g. fallen_tree)..."
              value={newCategoryInput}
              onChange={(e) => setNewCategoryInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
            />
            <Button variant="secondary" size="md" onClick={handleAddCategory}>
              Add
            </Button>
          </div>

          {/* Categories Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {categoryList.map((cat) => (
              <div
                key={cat}
                className="flex items-center justify-between p-3.5 rounded-xl bg-background-secondary border border-background-border text-xs group hover:border-brand-500/40 transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-background-card flex items-center justify-center text-brand-400 border border-background-border">
                    <CategoryIcon category={cat} className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-semibold text-slate-200">
                      {cat.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                    </span>
                    <p className="font-mono text-[10px] text-slate-400">{cat}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveCategory(cat)}
                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
                  title="Remove Category"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB 2: ROUTING RULES (SRS FR-9.1) ── */}
      {activeTab === 'routing' && (
        <div className="bg-background-card border border-background-border rounded-2xl p-6 shadow-card space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-100">
                (Category, Ward) → Department Routing Rules Table
              </h3>
              <p className="text-xs text-slate-400">
                SRS FR-9.1 automated dispatch engine mapping for incoming civic reports
              </p>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsRuleModalOpen(true)}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Add Routing Rule
            </Button>
          </div>

          {isRulesLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : routingRules.length === 0 ? (
            <EmptyState
              title="No Routing Rules Configured"
              description="Configure routing rules to automatically assign incoming issues to municipal departments."
              isSeedHelper={true}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-background-border bg-background-secondary/40 text-slate-400 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Category Trigger</th>
                    <th className="py-3.5 px-3">Ward Scope</th>
                    <th className="py-3.5 px-3">Routed Department</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-background-border/50">
                  {routingRules.map((rule) => {
                    const wardName =
                      typeof rule.ward_id === 'object' && rule.ward_id
                        ? rule.ward_id.name
                        : 'All Wards (Default Rule)';

                    const deptName =
                      typeof rule.department_id === 'object' && rule.department_id
                        ? rule.department_id.name
                        : 'Unassigned';

                    return (
                      <tr key={rule._id} className="hover:bg-background-hover/50 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-slate-200">
                          <span className="capitalize">{rule.category.replace(/_/g, ' ')}</span>
                          <span className="font-mono text-[10px] text-slate-400 ml-2">
                            ({rule.category})
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-slate-300">
                          <span
                            className={`px-2 py-0.5 rounded border text-[11px] ${
                              rule.ward_id
                                ? 'bg-indigo-950/40 text-indigo-300 border-indigo-800'
                                : 'bg-slate-800 text-slate-300 border-slate-700'
                            }`}
                          >
                            {wardName}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 font-semibold text-emerald-400">
                          <div className="flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                            {deptName}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => handleDeleteRule(rule._id)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
                            title="Delete Rule"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: PRIORITY WEIGHTS ── */}
      {activeTab === 'weights' && (
        <div className="bg-background-card border border-background-border rounded-2xl p-6 shadow-card space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-100">
                Priority Engine Weights Configuration
              </h3>
              <p className="text-xs text-slate-400">
                Score Formula: Score = w1 × nearby_reports + w2 × upvotes + w3 × urgency_keywords + w4 × category_weight
              </p>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={handleSaveWeights}
              leftIcon={<Save className="w-4 h-4" />}
            >
              Save Formula Weights
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-background-secondary p-4 rounded-xl border border-background-border space-y-2">
              <label className="text-xs font-semibold text-slate-200 block">
                w1: Nearby Reports Weight
              </label>
              <p className="text-[11px] text-slate-400">Multiplied by reports within 50m</p>
              <input
                type="number"
                step="0.1"
                value={weights.w1}
                onChange={(e) => setWeights({ ...weights, w1: parseFloat(e.target.value) || 0 })}
                className="w-full bg-background-card border border-background-border rounded-lg text-slate-100 text-sm px-3 py-2"
              />
            </div>

            <div className="bg-background-secondary p-4 rounded-xl border border-background-border space-y-2">
              <label className="text-xs font-semibold text-slate-200 block">
                w2: Citizen Upvotes Weight
              </label>
              <p className="text-[11px] text-slate-400">Multiplied by citizen confirmations</p>
              <input
                type="number"
                step="0.1"
                value={weights.w2}
                onChange={(e) => setWeights({ ...weights, w2: parseFloat(e.target.value) || 0 })}
                className="w-full bg-background-card border border-background-border rounded-lg text-slate-100 text-sm px-3 py-2"
              />
            </div>

            <div className="bg-background-secondary p-4 rounded-xl border border-background-border space-y-2">
              <label className="text-xs font-semibold text-slate-200 block">
                w3: Urgency Keywords Weight
              </label>
              <p className="text-[11px] text-slate-400">Multiplied by detected urgency words</p>
              <input
                type="number"
                step="0.1"
                value={weights.w3}
                onChange={(e) => setWeights({ ...weights, w3: parseFloat(e.target.value) || 0 })}
                className="w-full bg-background-card border border-background-border rounded-lg text-slate-100 text-sm px-3 py-2"
              />
            </div>

            <div className="bg-background-secondary p-4 rounded-xl border border-background-border space-y-2">
              <label className="text-xs font-semibold text-slate-200 block">
                w4: Category Base Weight
              </label>
              <p className="text-[11px] text-slate-400">Base severity multiplier</p>
              <input
                type="number"
                step="0.1"
                value={weights.w4}
                onChange={(e) => setWeights({ ...weights, w4: parseFloat(e.target.value) || 0 })}
                className="w-full bg-background-card border border-background-border rounded-lg text-slate-100 text-sm px-3 py-2"
              />
            </div>
          </div>

          {/* Priority Tier Threshold Preview */}
          <div className="bg-background-secondary/60 border border-background-border rounded-xl p-5 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Priority Tier Decision Boundary Thresholds
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/60">
                <span className="font-bold text-rose-300 block">Critical Tier</span>
                <span className="text-[11px] text-slate-300">Score &ge; 40</span>
              </div>
              <div className="p-3 rounded-lg bg-orange-950/40 border border-orange-800/60">
                <span className="font-bold text-orange-300 block">High Tier</span>
                <span className="text-[11px] text-slate-300">Score &ge; 25</span>
              </div>
              <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-800/60">
                <span className="font-bold text-amber-300 block">Medium Tier</span>
                <span className="text-[11px] text-slate-300">Score &ge; 12</span>
              </div>
              <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/60">
                <span className="font-bold text-emerald-300 block">Low Tier</span>
                <span className="text-[11px] text-slate-300">Score &lt; 12</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 4: STAFF DIRECTORY ── */}
      {activeTab === 'users' && (
        <div className="bg-background-card border border-background-border rounded-2xl p-6 shadow-card space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-100">Municipal Staff Accounts</h3>
              <p className="text-xs text-slate-400">
                Directory of Department Heads and Field Officers with assigned scopes
              </p>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsStaffModalOpen(true)}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Add Staff Officer
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-background-border bg-background-secondary/40 text-slate-400 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Officer Name</th>
                  <th className="py-3.5 px-3">Email Address</th>
                  <th className="py-3.5 px-3">Role</th>
                  <th className="py-3.5 px-3">Department</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-background-border/50">
                {staffList.map((st) => (
                  <tr key={st._id} className="hover:bg-background-hover/50 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-200 flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-slate-800 text-brand-400 flex items-center justify-center font-bold text-xs">
                        {st.name.charAt(0)}
                      </div>
                      {st.name}
                    </td>
                    <td className="py-3.5 px-3 font-mono text-slate-300">{st.email}</td>
                    <td className="py-3.5 px-3">
                      <span className="px-2 py-0.5 rounded border text-[10px] font-bold uppercase bg-brand-500/10 text-brand-300 border-brand-500/30">
                        {st.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-slate-300">
                      {typeof st.department_id === 'object' && st.department_id
                        ? st.department_id.name
                        : 'General / All'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Add Routing Rule */}
      <Modal
        isOpen={isRuleModalOpen}
        onClose={() => setIsRuleModalOpen(false)}
        title="Add Routing Rule"
        subtitle="Map (Category, Ward) to an assigned department"
        maxWidth="md"
      >
        <form onSubmit={handleUpsertRule} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 block">Category Trigger</label>
            <select
              value={ruleCategory}
              onChange={(e) => setRuleCategory(e.target.value)}
              className="w-full bg-background-secondary border border-background-border rounded-xl text-slate-100 text-xs px-3 py-2.5"
            >
              {categoryList.map((cat) => (
                <option key={cat} value={cat}>
                  {cat.replace(/_/g, ' ').toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 block">
              Ward Scope (Leave empty for All Wards)
            </label>
            <input
              type="text"
              placeholder="Ward ID (optional, leave blank for all wards)"
              value={ruleWardId}
              onChange={(e) => setRuleWardId(e.target.value)}
              className="w-full bg-background-secondary border border-background-border rounded-xl text-slate-100 text-xs px-3 py-2"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 block">
              Target Department <span className="text-rose-400">*</span>
            </label>
            <select
              value={ruleDeptId}
              onChange={(e) => setRuleDeptId(e.target.value)}
              className="w-full bg-background-secondary border border-background-border rounded-xl text-slate-100 text-xs px-3 py-2.5"
              required
            >
              <option value="">Select Target Department</option>
              {departments.map((dept) => (
                <option key={dept._id} value={dept._id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-background-border">
            <Button type="button" variant="outline" onClick={() => setIsRuleModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save Routing Rule
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Add Staff Account */}
      <Modal
        isOpen={isStaffModalOpen}
        onClose={() => setIsStaffModalOpen(false)}
        title="Register Staff Account"
        subtitle="Create a new municipal login account"
        maxWidth="md"
      >
        <form onSubmit={handleCreateStaff} className="space-y-4">
          <Input
            label="Full Name"
            placeholder="e.g. Vikram Mehta"
            value={newStaff.name}
            onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
            required
          />

          <Input
            label="Email Address"
            type="email"
            placeholder="vikram@civicpulse.in"
            value={newStaff.email}
            onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
            required
          />

          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            value={newStaff.password}
            onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })}
            required
          />

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 block">Role</label>
            <select
              value={newStaff.role}
              onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value })}
              className="w-full bg-background-secondary border border-background-border rounded-xl text-slate-100 text-xs px-3 py-2.5"
            >
              <option value="staff">Field Staff</option>
              <option value="dept-head">Department Head</option>
              <option value="super-admin">Super Admin</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 block">Department</label>
            <select
              value={newStaff.department_id}
              onChange={(e) => setNewStaff({ ...newStaff, department_id: e.target.value })}
              className="w-full bg-background-secondary border border-background-border rounded-xl text-slate-100 text-xs px-3 py-2.5"
            >
              <option value="">Unassigned / General</option>
              {departments.map((dept) => (
                <option key={dept._id} value={dept._id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-background-border">
            <Button type="button" variant="outline" onClick={() => setIsStaffModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Register Account
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
