import React, { useState } from 'react';
import { ArrowLeft, RefreshCw, User, Target, Utensils, HeartPulse, ChevronDown, CheckCircle2, Clock, Mail, Calendar as CalendarIcon, KeyRound, ShieldCheck } from 'lucide-react';
import { supabase, createClientAuthAccount } from '../../supabaseClient';
import {
  buildNutritionProfileFromSource,
  buildNutritionSyncAudit,
  buildPhoneCandidates,
  COMMITMENT_LEVEL_OPTIONS,
  countFilledNutritionFields,
  hasNutritionColumnsInSurveyRow,
  normalizeSurveyResponseRecord,
} from '../../utils/nutritionUtils';

const COMMITMENT_VALUE_MAP = {
  'Sẵn sàng tuân thủ 100%': 'Fully Committed',
  'Sẵn sàng phần lớn': 'Mostly Committed',
  'Cần đốc thúc': 'Needs Accountability',
  'Hoàn toàn sẵn sàng, em rất quyết tâm!': 'Highly Motivated',
  'Phần lớn là được, miễn phù hợp với lịch sinh hoạt': 'Flexible But Committed',
  'Hơi khó, không chắc chắn lắm vì bận công việc...': 'Needs a Realistic Plan',
};

const ENGLISH_COMMITMENT_OPTIONS = [
  'Fully Committed',
  'Mostly Committed',
  'Needs Accountability',
  'Highly Motivated',
  'Flexible But Committed',
  'Needs a Realistic Plan',
];

const normalizeGenderValue = (value = '') => {
  if (value === 'Nam') return 'Male';
  if (value === 'Nữ') return 'Female';
  return value || 'Male';
};

const normalizeCommitmentValue = (value = '') =>
  COMMITMENT_VALUE_MAP[value] || value || 'Fully Committed';

const AddClientView = ({ onBack, onSave, coachEmail }) => {
  const initialFormState = {
    name: '', phone: '', email: '', gender: 'Male', dob: '',
    height: '', weight: '', goal: '',
    traininghistory: '', jobtype: '', trainingtime: '', targetduration: '',
    cookinghabit: '', dietaryrestriction: '', favoritefoods: '', avoidfoods: '',
    cookingtime: '', foodbudget: '', medicalconditions: '',
    supplements: '', sleephabits: '', commitmentlevel: 'Fully Committed',
  };

  const [clientPassword, setClientPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState(initialFormState);
  const [expandedSection, setExpandedSection] = useState('basic');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const traineePortalUrl = typeof window !== 'undefined' ? `${window.location.origin}/portal/login` : '/portal/login';

  const toggleSection = (id) => setExpandedSection(expandedSection === id ? null : id);
  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const commitmentOptions = Array.from(
    new Set([
      ...ENGLISH_COMMITMENT_OPTIONS,
      ...COMMITMENT_LEVEL_OPTIONS.map(normalizeCommitmentValue),
      ...(formData.commitmentlevel ? [formData.commitmentlevel] : []),
    ]),
  );

  const handleSyncAPI = async () => {
    if (!formData.phone) return alert('Enter a phone number before syncing.');
    setIsSyncing(true);
    try {
      const phoneCandidates = buildPhoneCandidates(formData.phone);
      const { data, error } = await supabase
        .from('survey_responses')
        .select('*')
        .in('phone', phoneCandidates)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      const matchedRow = (data || [])[0];
      if (matchedRow) {
        console.log('Raw survey_responses row:', matchedRow);

        const mappedData = normalizeSurveyResponseRecord(matchedRow);
        const normalizedMappedData = {
          ...mappedData,
          gender: normalizeGenderValue(mappedData.gender),
          commitmentlevel: normalizeCommitmentValue(mappedData.commitmentlevel),
        };
        const mappedNutritionProfile = buildNutritionProfileFromSource(mappedData);
        const filledNutritionFields = countFilledNutritionFields(mappedNutritionProfile);
        const hasNutritionColumns = hasNutritionColumnsInSurveyRow(matchedRow);

        if (filledNutritionFields === 0) {
          if (hasNutritionColumns) {
            alert(
              'A matching survey response was found, but the nutrition fields are still empty.\n\n' +
              'Sync worked correctly. The linked Google Form row simply does not include nutrition details yet.'
            );
          } else {
            alert(
              'A survey response was found, but the nutrition fields could not be mapped.\n\n' +
              'The Google Form column names likely differ from the current schema. Check the console and extend the alias mapping if needed.'
            );
          }
        }

        setFormData(prev => ({ ...prev, ...normalizedMappedData }));

        const audit = buildNutritionSyncAudit(
          buildNutritionProfileFromSource({ ...formData, ...normalizedMappedData }),
          mappedNutritionProfile,
        );

        alert(
          `Sync complete.\n\n` +
          `Nutrition profile:\n` +
          `• Matched: ${audit.counts.synced}\n` +
          `• Added from form: ${audit.counts.missingInClient}\n` +
          `• Still mismatched: ${audit.counts.mismatch}\n\n` +
          `Review the Goals, Lifestyle, and Nutrition sections below.`
        );
      } else {
        alert('No survey data was found for this phone number yet.');
      }
    } catch (e) {
      console.error('Sync error:', e);
      alert('Sync connection failed.');
    }
    setIsSyncing(false);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.phone) return alert('Full name and phone number are required.');
    if (!clientPassword || clientPassword.length < 6) return alert('Trainee password must be at least 6 characters.');

    setIsSaving(true);

    const { userId, error: authError } = await createClientAuthAccount(formData.phone, clientPassword);

    if (authError) {
      alert('Account creation failed: ' + authError);
      setIsSaving(false);
      return;
    }

    const allowedKeys = Object.keys(initialFormState);
    const cleanPayload = {};
    allowedKeys.forEach(key => {
      if (formData[key] !== undefined && formData[key] !== null) {
        cleanPayload[key] = formData[key];
      }
    });

    cleanPayload.auth_user_id = userId;
    cleanPayload.username = formData.phone.replace(/\s/g, '');
    cleanPayload.coach_email = coachEmail || null;

    const { error: dbError } = await supabase.from('clients').insert([cleanPayload]);

    setIsSaving(false);
    if (!dbError) {
      alert(
        `Trainee created successfully.\n\n` +
        `Portal:\n• ${traineePortalUrl}\n\n` +
        `Login details:\n• Username: ${formData.phone}\n• Password: ${clientPassword}\n\n` +
        `Share the portal link and these credentials with the trainee.`
      );
      onSave();
      onBack();
    } else {
      alert('Save failed: ' + dbError.message);
    }
  };

  return (
    <div className="app-screen-shell h-screen flex flex-col relative z-20 overflow-y-auto px-6 animate-slide-up hide-scrollbar">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-[rgba(13,27,46,0.95)] backdrop-blur-2xl -mx-6 px-6 pt-6 pb-4 border-b border-white/[0.05] flex justify-between items-center">
         <button onClick={onBack} className="app-ghost-button p-3 border rounded-full text-white active:scale-90 transition-all"><ArrowLeft className="w-5 h-5" /></button>
         <h2 className="text-[10px] font-black tracking-[0.2em] text-white/40 uppercase">New Trainee Form</h2>
         <button onClick={handleSyncAPI} className={`app-ghost-button p-3 rounded-full border text-[var(--app-blue)] ${isSyncing ? 'animate-spin' : ''}`}>
            <RefreshCw className="w-5 h-5" />
         </button>
      </div>

      <div className="flex-1 pb-32 pt-4 space-y-4">
        <div className="app-glass-panel border rounded-[24px] overflow-hidden">
          <div onClick={() => toggleSection('basic')} className="p-5 flex justify-between items-center cursor-pointer">
            <div className="flex items-center gap-2"><User className="w-4 h-4 text-emerald-400" /><h3 className="text-white text-sm font-medium">1. Personal Information (*)</h3></div>
            <ChevronDown className={`w-4 h-4 text-neutral-500 transition-transform ${expandedSection === 'basic' ? 'rotate-180' : ''}`} />
          </div>
          {expandedSection === 'basic' && (
            <div className="px-5 pb-5 space-y-3">
              <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Full Name *" className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white text-sm outline-none" />
              <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="Phone Number *" className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white text-sm outline-none" />
              <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Email" className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white text-sm outline-none" />

              <div className="bg-[var(--app-accent-faint)] border border-[var(--app-accent-soft)] rounded-[16px] p-4 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <ShieldCheck className="w-4 h-4 text-[var(--app-accent)]" />
                  <p className="text-[10px] font-black text-[var(--app-accent)] uppercase tracking-widest">Trainee Account</p>
                </div>

                <div>
                  <p className="text-[9px] text-neutral-600 mb-1 ml-1">Portal link</p>
                  <div className="w-full bg-black/30 border border-white/5 rounded-xl p-3 text-neutral-400 text-xs break-all">
                    {traineePortalUrl}
                  </div>
                </div>

                <div>
                  <p className="text-[9px] text-neutral-600 mb-1 ml-1">Username (auto from phone)</p>
                  <div className="w-full bg-black/30 border border-white/5 rounded-xl p-3 text-neutral-500 text-sm font-mono">
                    {formData.phone || '(enter phone number above)'}
                  </div>
                </div>

                <div>
                  <p className="text-[9px] text-neutral-600 mb-1 ml-1">Password (created by coach)</p>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-[var(--app-accent)]/70 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={clientPassword}
                      onChange={(e) => setClientPassword(e.target.value)}
                      placeholder="Set trainee password (6+ characters)"
                      className="w-full bg-black/40 border border-[var(--app-accent-soft)] rounded-xl py-3 pl-10 pr-16 text-white text-sm outline-none focus:border-[var(--app-accent-strong)]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-neutral-600 uppercase tracking-widest"
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <p className="text-[9px] text-neutral-600 mt-1 ml-1">
                    After saving, the app will confirm the login details so you can share them with the trainee.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input type="date" name="dob" value={formData.dob} onChange={handleChange} className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-neutral-400 text-xs outline-none" />
                <select name="gender" value={formData.gender} onChange={handleChange} className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-neutral-400 text-sm outline-none"><option>Male</option><option>Female</option></select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input type="text" name="height" value={formData.height} onChange={handleChange} placeholder="Height (cm)" className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white text-sm outline-none" />
                <input type="text" name="weight" value={formData.weight} onChange={handleChange} placeholder="Weight (kg)" className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white text-sm outline-none" />
              </div>
            </div>
          )}
        </div>

        <div className="app-glass-panel border rounded-[24px] overflow-hidden">
          <div onClick={() => toggleSection('goals')} className="p-5 flex justify-between items-center cursor-pointer">
            <div className="flex items-center gap-2"><Target className="w-4 h-4 text-blue-400" /><h3 className="text-white text-sm font-medium">2. Goals & Lifestyle</h3></div>
            <ChevronDown className={`w-4 h-4 text-neutral-500 transition-transform ${expandedSection === 'goals' ? 'rotate-180' : ''}`} />
          </div>
          {expandedSection === 'goals' && (
            <div className="px-5 pb-5 space-y-3">
              <input type="text" name="goal" value={formData.goal} onChange={handleChange} placeholder="Primary Goal" className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white text-sm outline-none" />
              <input type="text" name="targetduration" value={formData.targetduration} onChange={handleChange} placeholder="Target Timeline" className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white text-sm outline-none" />
              <input type="text" name="jobtype" value={formData.jobtype} onChange={handleChange} placeholder="Work Style" className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white text-sm outline-none" />
              <input type="text" name="sleephabits" value={formData.sleephabits} onChange={handleChange} placeholder="Sleep Routine" className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white text-sm outline-none" />
            </div>
          )}
        </div>

        <div className="app-glass-panel border rounded-[24px] overflow-hidden">
          <div onClick={() => toggleSection('nutrition')} className="p-5 flex justify-between items-center cursor-pointer">
            <div className="flex items-center gap-2"><Utensils className="w-4 h-4 text-orange-400" /><h3 className="text-white text-sm font-medium">3. Nutrition</h3></div>
            <ChevronDown className={`w-4 h-4 text-neutral-500 transition-transform ${expandedSection === 'nutrition' ? 'rotate-180' : ''}`} />
          </div>
          {expandedSection === 'nutrition' && (
            <div className="px-5 pb-5 space-y-3">
              <input type="text" name="cookinghabit" value={formData.cookinghabit} onChange={handleChange} placeholder="Cooking Habit" className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white text-sm outline-none" />
              <input type="text" name="dietaryrestriction" value={formData.dietaryrestriction} onChange={handleChange} placeholder="Allergies / Restrictions" className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white text-sm outline-none" />
              <textarea name="favoritefoods" value={formData.favoritefoods} onChange={handleChange} rows="2" placeholder="Favorite Foods" className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white text-sm resize-none"></textarea>
              <input type="text" name="avoidfoods" value={formData.avoidfoods} onChange={handleChange} placeholder="Foods to Avoid" className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white text-sm outline-none" />
              <div className="grid grid-cols-2 gap-3">
                <input type="text" name="cookingtime" value={formData.cookingtime} onChange={handleChange} placeholder="Cooking Time / Day" className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white text-sm" />
                <input type="text" name="foodbudget" value={formData.foodbudget} onChange={handleChange} placeholder="Food Budget" className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white text-sm" />
              </div>
            </div>
          )}
        </div>

        <div className="app-glass-panel border rounded-[24px] overflow-hidden">
          <div onClick={() => toggleSection('health')} className="p-5 flex justify-between items-center cursor-pointer">
            <div className="flex items-center gap-2"><HeartPulse className="w-4 h-4 text-red-400" /><h3 className="text-white text-sm font-medium">4. Health & Commitment</h3></div>
            <ChevronDown className={`w-4 h-4 text-neutral-500 transition-transform ${expandedSection === 'health' ? 'rotate-180' : ''}`} />
          </div>
          {expandedSection === 'health' && (
            <div className="px-5 pb-5 space-y-3">
              <textarea name="medicalconditions" value={formData.medicalconditions} onChange={handleChange} rows="2" placeholder="Medical Conditions (joints, heart, injuries...)" className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white text-sm resize-none"></textarea>
              <input type="text" name="supplements" value={formData.supplements} onChange={handleChange} placeholder="Current Supplements / Medication" className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white text-sm" />
              <select name="commitmentlevel" value={formData.commitmentlevel} onChange={handleChange} className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-neutral-400 text-sm outline-none">
                {commitmentOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <button onClick={handleSave} disabled={isSaving} className={`w-full text-black font-black py-5 rounded-[24px] flex items-center justify-center gap-2 shadow-2xl transition-all mt-4 ${isSaving ? 'bg-neutral-500' : 'app-cta-button hover:scale-[1.02] active:scale-95'}`}>
          {isSaving ? <RefreshCw className="animate-spin w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />} 
          {isSaving ? 'Saving...' : 'Add Trainee'}
        </button>
      </div>
    </div>
  );
};

export default AddClientView;
