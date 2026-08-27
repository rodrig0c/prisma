'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
  Star, FileText, X, Check, ArrowLeft, LogOut, ChevronRight, UserCheck,
  Plus, Trash2, Pencil, Camera, Users, Copy, CalendarDays, TrendingUp,
  Lightbulb, Loader2, ClipboardList, KeyRound, Sparkles,
  CheckCircle2, AlertTriangle
} from 'lucide-react';

// =============================================================================
// TIPOS (espelham prisma.sql)
// =============================================================================
type ProfileRole = 'pais' | 'at_escola' | 'terapeuta_clinico' | 'professor';

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: ProfileRole | null;
  specialty: string | null;
  avatar_url: string | null;
}

interface Patient {
  id: string;
  code: string;
  full_name: string;
  birth_date: string | null;
  school_name: string | null;
  grade_level: string | null;
  support_level: 'Nível 1 (Leve)' | 'Nível 2 (Moderado)' | 'Nível 3 (Substancial)' | null;
  photo_emoji: string | null;
  photo_url: string | null;
}

interface ScheduleSlot {
  id: string;
  patient_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  subject: string;
  icon: string;
  color: string;
}

type CompletedActivity = 'total' | 'parcial' | 'adaptada' | 'nao_realizou';
type PromptLevel = 'independente' | 'dica_verbal' | 'gestual_visual' | 'ajuda_fisica_parcial' | 'ajuda_fisica_total';
type RegulationState = 'regulado' | 'alerta' | 'agitado' | 'hipoativo' | 'sobrecarregado';

interface DailyLog {
  id: string;
  patient_id: string;
  slot_id: string | null;
  date: string;
  subject_name: string;
  completed_activity: CompletedActivity | null;
  prompt_level: PromptLevel | null;
  regulation_state: RegulationState | null;
  sensory_notes: string | null;
  observations: string | null;
  created_by: string | null;
  author_name?: string;
}

type GuidelineCategory = 'pedagogico' | 'sensorial' | 'comportamental' | 'comunicacao' | 'social';

interface Guideline {
  id: string;
  patient_id: string;
  title: string;
  category: GuidelineCategory;
  description: string;
  target_audience: string;
  is_active: boolean;
  author_id: string | null;
  author_name: string | null;
  author_role: string | null;
  created_at: string;
}

// =============================================================================
// CONSTANTES / RÓTULOS
// =============================================================================
const ROLE_LABELS: Record<ProfileRole, { label: string; short: string; emoji: string; color: string }> = {
  at_escola: { label: 'Acompanhante Terapêutico (AT)', short: 'AT', emoji: '🎒', color: '#4F46E5' },
  pais: { label: 'Pai / Mãe / Responsável', short: 'Responsável', emoji: '🏡', color: '#F59E0B' },
  terapeuta_clinico: { label: 'Terapeuta Clínico', short: 'Terapeuta', emoji: '🩺', color: '#10B981' },
  professor: { label: 'Professor(a)', short: 'Professor', emoji: '🏫', color: '#0EA5E9' }
};

const WEEKDAYS = [
  { value: 1, label: 'Segunda' },
  { value: 2, label: 'Terça' },
  { value: 3, label: 'Quarta' },
  { value: 4, label: 'Quinta' },
  { value: 5, label: 'Sexta' }
];

const SUBJECT_PRESETS: { icon: string; color: string; label: string }[] = [
  { icon: '🔢', color: 'blue', label: 'Matemática' },
  { icon: '📚', color: 'emerald', label: 'Português' },
  { icon: '⚽', color: 'amber', label: 'Educação Física' },
  { icon: '🥪', color: 'orange', label: 'Lanche & Socialização' },
  { icon: '🌱', color: 'teal', label: 'Ciências' },
  { icon: '🎨', color: 'purple', label: 'Artes' },
  { icon: '🗣️', color: 'rose', label: 'Fonoaudiologia' },
  { icon: '🧩', color: 'indigo', label: 'Terapia ABA / TO' }
];

const COLOR_MAP: Record<string, { bg: string; border: string; text: string; lightBg: string }> = {
  blue: { bg: 'bg-blue-500', border: 'border-blue-200', text: 'text-blue-600', lightBg: 'bg-blue-50' },
  emerald: { bg: 'bg-emerald-500', border: 'border-emerald-200', text: 'text-emerald-600', lightBg: 'bg-emerald-50' },
  amber: { bg: 'bg-amber-500', border: 'border-amber-200', text: 'text-amber-600', lightBg: 'bg-amber-50' },
  orange: { bg: 'bg-orange-500', border: 'border-orange-200', text: 'text-orange-600', lightBg: 'bg-orange-50' },
  teal: { bg: 'bg-teal-500', border: 'border-teal-200', text: 'text-teal-600', lightBg: 'bg-teal-50' },
  purple: { bg: 'bg-purple-500', border: 'border-purple-200', text: 'text-purple-600', lightBg: 'bg-purple-50' },
  rose: { bg: 'bg-rose-500', border: 'border-rose-200', text: 'text-rose-600', lightBg: 'bg-rose-50' },
  indigo: { bg: 'bg-indigo-500', border: 'border-indigo-200', text: 'text-indigo-600', lightBg: 'bg-indigo-50' }
};

const COMPLETED_LABELS: Record<CompletedActivity, string> = {
  total: 'Realizou totalmente',
  parcial: 'Realizou parcialmente',
  adaptada: 'Realizou de forma adaptada',
  nao_realizou: 'Não realizou'
};

const PROMPT_LABELS: Record<PromptLevel, string> = {
  independente: 'Independente',
  dica_verbal: 'Dica verbal',
  gestual_visual: 'Dica gestual/visual',
  ajuda_fisica_parcial: 'Ajuda física parcial',
  ajuda_fisica_total: 'Ajuda física total'
};

const REGULATION_META: Record<RegulationState, { label: string; dot: string; emoji: string }> = {
  regulado: { label: 'Regulado', dot: 'bg-emerald-500', emoji: '🟢' },
  alerta: { label: 'Alerta / Disperso', dot: 'bg-amber-400', emoji: '🟡' },
  agitado: { label: 'Agitado', dot: 'bg-orange-500', emoji: '⚡' },
  hipoativo: { label: 'Hipoativo / Sonolento', dot: 'bg-sky-400', emoji: '💤' },
  sobrecarregado: { label: 'Sobrecarga sensorial', dot: 'bg-rose-500', emoji: '🔴' }
};

const CATEGORY_META: Record<GuidelineCategory, { label: string; emoji: string }> = {
  pedagogico: { label: 'Pedagógico', emoji: '📘' },
  sensorial: { label: 'Sensorial', emoji: '🧠' },
  comportamental: { label: 'Comportamental', emoji: '🎯' },
  comunicacao: { label: 'Comunicação', emoji: '💬' },
  social: { label: 'Social', emoji: '🤝' }
};

const TRIGGER_OPTIONS = [
  'Barulho alto', 'Mudança de rotina', 'Esforço motor/escrita',
  'Transição de aula', 'Cansaço', 'Luz forte', 'Frustração', 'Fome'
];

const SUPPORT_LEVELS: Patient['support_level'][] = [
  'Nível 1 (Leve)', 'Nível 2 (Moderado)', 'Nível 3 (Substancial)'
];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function calcAge(birthDate: string | null): number | null {
  if (!birthDate) return null;
  const b = new Date(birthDate);
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
}

function generatePatientCode(fullName: string) {
  const initials = fullName
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 3)
    .toUpperCase() || 'ALU';
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${initials}-${num}`;
}

function weekdayLabel(offsetFromMondayIndex: number) {
  return WEEKDAYS.find((w) => w.value === offsetFromMondayIndex)?.label ?? '';
}

function formatDateBR(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR');
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================
export default function PrismaApp() {
  const [authUser, setAuthUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [activePatientId, setActivePatientId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [bootError, setBootError] = useState<string | null>(null);

  const [screen, setScreen] = useState<'dashboard' | 'schedule-editor' | 'guidelines' | 'weekly-report' | 'switch-patient' | 'add-patient' | 'patient-info'>('dashboard');

  const activePatient = useMemo(
    () => patients.find((p) => p.id === activePatientId) || null,
    [patients, activePatientId]
  );

  const loadProfileAndPatients = useCallback(async (user: any) => {
    try {
      const { data: profileRow } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      setProfile(profileRow ?? null);

      if (profileRow) {
        const { data: memberRows } = await supabase
          .from('patient_members')
          .select('patient_id, patients(*)')
          .eq('profile_id', profileRow.id);

        const linkedPatients: Patient[] = (memberRows || [])
          .map((r: any) => r.patients)
          .filter(Boolean);

        setPatients(linkedPatients);
        setActivePatientId((prev) => prev && linkedPatients.some((p) => p.id === prev)
          ? prev
          : linkedPatients[0]?.id ?? null);
      } else {
        setPatients([]);
        setActivePatientId(null);
      }
    } catch (e: any) {
      setBootError(e?.message || 'Erro ao carregar seus dados.');
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setAuthUser(session.user);
        loadProfileAndPatients(session.user).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUser(session?.user ?? null);
      if (session?.user) {
        loadProfileAndPatients(session.user);
      } else {
        setProfile(null);
        setPatients([]);
        setActivePatientId(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [loadProfileAndPatients]);

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setAuthUser(null);
    setProfile(null);
    setPatients([]);
    setActivePatientId(null);
    setScreen('dashboard');
  };

  const refreshPatients = useCallback(async () => {
    if (authUser) await loadProfileAndPatients(authUser);
  }, [authUser, loadProfileAndPatients]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-9 h-9 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (!authUser) {
    return <LoginScreen onLogin={handleGoogleLogin} />;
  }

  if (bootError) {
    return (
      <div className="min-h-screen bg-[#F4F7FB] flex items-center justify-center p-6 text-center">
        <div className="max-w-sm space-y-3">
          <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
          <p className="text-sm font-semibold text-slate-700">{bootError}</p>
          <button onClick={handleSignOut} className="text-xs font-bold text-indigo-600 underline">
            Sair e tentar novamente
          </button>
        </div>
      </div>
    );
  }

  if (!profile || patients.length === 0 || !activePatient) {
    return (
      <OnboardingFlow
        authUser={authUser}
        profile={profile}
        onProfileCreated={refreshPatients}
        onSignOut={handleSignOut}
        onPatientLinked={refreshPatients}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F7FB] pb-12">
      <AppHeader
        profile={profile}
        patient={activePatient}
        canGoBack={screen !== 'dashboard'}
        onBack={() => setScreen('dashboard')}
        onSwitchPatient={() => setScreen('switch-patient')}
        onOpenPatientInfo={() => setScreen('patient-info')}
        onSignOut={handleSignOut}
        onRoleChange={async (newRole) => {
          await supabase.from('profiles').update({ role: newRole }).eq('id', profile.id);
          setProfile({ ...profile, role: newRole });
          setScreen('dashboard');
        }}
      />

      <main className="max-w-xl mx-auto p-4 sm:p-6 space-y-6 print:max-w-full print:p-8 print:bg-white">
        {screen === 'switch-patient' && (
          <SwitchPatientScreen
            patients={patients}
            activePatientId={activePatientId}
            onSelect={(id) => { setActivePatientId(id); setScreen('dashboard'); }}
            onAddNew={() => setScreen('add-patient')}
          />
        )}

        {screen === 'add-patient' && profile && (
          <AddPatientPanel
            profile={profile}
            embedded
            onDone={async () => { await refreshPatients(); setScreen('dashboard'); }}
            onCancel={() => setScreen('switch-patient')}
          />
        )}

        {screen === 'patient-info' && (
          <PatientInfoScreen
            patient={activePatient}
            onUpdated={refreshPatients}
            onClose={() => setScreen('dashboard')}
          />
        )}

        {screen === 'dashboard' && profile.role === 'at_escola' && (
          <ATDashboard patient={activePatient} profile={profile} onOpenSchedule={() => setScreen('schedule-editor')} />
        )}

        {screen === 'schedule-editor' && profile.role === 'at_escola' && (
          <ScheduleEditor patient={activePatient} profile={profile} onClose={() => setScreen('dashboard')} />
        )}

        {screen === 'dashboard' && profile.role === 'pais' && (
          <ParentsDashboard patient={activePatient} onOpenWeekly={() => setScreen('weekly-report')} onOpenGuidelines={() => setScreen('guidelines')} profile={profile} />
        )}

        {screen === 'weekly-report' && profile.role === 'pais' && (
          <WeeklyReport patient={activePatient} onClose={() => setScreen('dashboard')} profile={profile} />
        )}

        {screen === 'dashboard' && profile.role === 'terapeuta_clinico' && (
          <TherapistDashboard patient={activePatient} profile={profile} onOpenWeekly={() => setScreen('weekly-report')} />
        )}

        {screen === 'weekly-report' && profile.role === 'terapeuta_clinico' && (
          <WeeklyReport patient={activePatient} onClose={() => setScreen('dashboard')} profile={profile} />
        )}

        {screen === 'dashboard' && profile.role === 'professor' && (
          <ParentsDashboard patient={activePatient} onOpenWeekly={() => setScreen('weekly-report')} onOpenGuidelines={() => setScreen('guidelines')} readOnlyLabel="Visão do(a) Professor(a)" profile={profile} />
        )}

        {screen === 'weekly-report' && profile.role === 'professor' && (
          <WeeklyReport patient={activePatient} onClose={() => setScreen('dashboard')} profile={profile} />
        )}

        {screen === 'guidelines' && (
          <GuidelinesScreen patient={activePatient} profile={profile} onClose={() => setScreen('dashboard')} />
        )}
      </main>
    </div>
  );
}

// =============================================================================
// TELA DE LOGIN
// =============================================================================
function LoginScreen({ onLogin }: { onLogin: () => void }) {
  return (
    <main className="min-h-screen bg-white flex flex-col justify-center items-center px-6 py-10 text-center">
      <div className="max-w-md w-full flex flex-col items-center">
        <div className="w-full flex justify-center mb-6">
          <img
            src="/logo.png"
            alt="Prisma"
            className="w-full max-w-[340px] sm:max-w-[400px] h-auto object-contain mix-blend-multiply"
          />
        </div>

        <div className="space-y-2 mb-8">
          <p className="text-xs font-black uppercase tracking-widest text-indigo-600">
            CONEXÃO ESCOLAR • TERAPIA • FAMÍLIA
          </p>
          <p className="text-slate-500 text-xs sm:text-sm leading-relaxed max-w-xs mx-auto">
            Plataforma unificada para registro de mediação escolar e acompanhamento terapêutico de crianças autistas.
          </p>
        </div>

        <button
          onClick={onLogin}
          className="w-full max-w-sm py-4 px-6 bg-white hover:bg-slate-50 border-2 border-slate-200 hover:border-slate-300 text-slate-700 font-bold rounded-2xl shadow-sm hover:shadow transition flex items-center justify-center gap-3 active:scale-[0.98]"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
          </svg>
          Entrar com conta Google
        </button>
      </div>
    </main>
  );
}

// =============================================================================
// ONBOARDING
// =============================================================================
function OnboardingFlow({
  authUser, profile, onProfileCreated, onSignOut, onPatientLinked
}: {
  authUser: any;
  profile: Profile | null;
  onProfileCreated: () => Promise<void>;
  onSignOut: () => void;
  onPatientLinked: () => Promise<void>;
}) {
  const [step, setStep] = useState<'role' | 'patient'>(profile ? 'patient' : 'role');
  const [saving, setSaving] = useState(false);
  const [selectedRole, setSelectedRole] = useState<ProfileRole | null>(null);
  const [specialty, setSpecialty] = useState('');

  const googleName = authUser?.user_metadata?.full_name || authUser?.user_metadata?.name || authUser?.email;
  const googleAvatar = authUser?.user_metadata?.avatar_url || authUser?.user_metadata?.picture || null;

  const handleCreateProfile = async () => {
    if (!selectedRole) return;
    setSaving(true);
    await supabase.from('profiles').upsert({
      id: authUser.id,
      email: authUser.email,
      full_name: googleName,
      role: selectedRole,
      specialty: selectedRole === 'terapeuta_clinico' ? specialty || null : null,
      avatar_url: googleAvatar
    });
    setSaving(false);
    await onProfileCreated();
    setStep('patient');
  };

  return (
    <main className="min-h-screen bg-[#F4F7FB] flex flex-col justify-between items-center p-4 sm:p-6">
      <div className="w-full max-w-md flex justify-between items-center">
        <span className="text-xs font-bold text-slate-400">
          {step === 'role' ? 'Passo 1 de 2' : 'Passo 2 de 2'}
        </span>
        <button
          onClick={onSignOut}
          className="text-xs font-bold text-slate-500 hover:text-red-600 flex items-center gap-1.5 py-1.5 px-3 rounded-lg hover:bg-slate-200/50 transition"
        >
          <LogOut className="w-4 h-4" /> Sair da conta
        </button>
      </div>

      <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-xl p-6 sm:p-8 space-y-6 border border-slate-100 my-auto">
        {step === 'role' && (
          <>
            <div className="flex flex-col items-center text-center">
              {googleAvatar ? (
                <img src={googleAvatar} alt="" className="w-20 h-20 rounded-full border-4 border-indigo-200 object-cover shadow-sm" />
              ) : (
                <div className="w-20 h-20 rounded-full border-4 border-indigo-200 bg-indigo-50 flex items-center justify-center text-3xl">🙂</div>
              )}
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-4 tracking-tight">Olá, {googleName?.split(' ')[0]}!</h1>
              <p className="text-slate-500 text-xs sm:text-sm mt-1 leading-snug">
                Antes de começar, conte-nos qual é o seu papel de acompanhamento. Isso define o que você verá no app.
              </p>
            </div>

            <div className="space-y-3">
              {(Object.keys(ROLE_LABELS) as ProfileRole[]).map((r) => {
                const meta = ROLE_LABELS[r];
                const active = selectedRole === r;
                return (
                  <button
                    key={r}
                    onClick={() => setSelectedRole(r)}
                    className={`w-full p-4 rounded-2xl border transition flex items-center gap-4 text-left active:scale-[0.98] ${
                      active ? 'border-2 shadow-sm' : 'border-slate-200 hover:bg-slate-50'
                    }`}
                    style={active ? { borderColor: meta.color, background: `${meta.color}10` } : {}}
                  >
                    <div
                      className="w-12 h-12 rounded-2xl text-white flex items-center justify-center text-2xl shadow-sm shrink-0"
                      style={{ background: meta.color }}
                    >
                      {meta.emoji}
                    </div>
                    <div className="flex-1">
                      <div className="font-black text-slate-800 text-sm sm:text-base">{meta.label}</div>
                    </div>
                    {active && <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: meta.color }} />}
                  </button>
                );
              })}
            </div>

            {selectedRole === 'terapeuta_clinico' && (
              <input
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                placeholder="Sua especialidade (ex: Terapeuta ABA, Fonoaudióloga...)"
                className="w-full p-3.5 rounded-2xl border border-slate-200 text-sm focus:outline-indigo-600"
              />
            )}

            <button
              disabled={!selectedRole || saving}
              onClick={handleCreateProfile}
              className="w-full py-4 bg-[#4F46E5] hover:bg-[#4338CA] disabled:bg-slate-300 text-white font-bold text-sm rounded-2xl shadow-md transition active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Continuar <ChevronRight className="w-4 h-4" /></>}
            </button>
          </>
        )}

        {step === 'patient' && profile && (
          <AddPatientPanel profile={profile} onDone={onPatientLinked} />
        )}
      </div>
      <div className="h-4" />
    </main>
  );
}

// =============================================================================
// PAINEL: cadastrar nova criança
// =============================================================================
function AddPatientPanel({
  profile, onDone, onCancel, embedded
}: {
  profile: Profile;
  onDone: () => Promise<void>;
  onCancel?: () => void;
  embedded?: boolean;
}) {
  const [mode, setMode] = useState<'choose' | 'create' | 'code'>('choose');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successCode, setSuccessCode] = useState<string | null>(null);

  const [form, setForm] = useState({
    full_name: '', birth_date: '', school_name: '', grade_level: '',
    support_level: 'Nível 1 (Leve)' as NonNullable<Patient['support_level']>
  });
  const [code, setCode] = useState('');

  const handleCreatePatient = async () => {
    if (!form.full_name.trim()) { setError('Informe o nome completo da criança.'); return; }
    setSaving(true);
    setError(null);
    const newCode = generatePatientCode(form.full_name);
    const { data: patientRow, error: pErr } = await supabase
      .from('patients')
      .insert({
        code: newCode,
        full_name: form.full_name.trim(),
        birth_date: form.birth_date || null,
        school_name: form.school_name || null,
        grade_level: form.grade_level || null,
        support_level: form.support_level,
        created_by: profile.id
      })
      .select()
      .single();

    if (pErr || !patientRow) {
      setError(pErr?.message || 'Não foi possível cadastrar a criança.');
      setSaving(false);
      return;
    }

    await supabase.from('patient_members').insert({
      patient_id: patientRow.id,
      profile_id: profile.id,
      role_in_patient: profile.role
    });

    setSaving(false);
    setSuccessCode(newCode);
  };

  const handleJoinByCode = async () => {
    if (!code.trim()) { setError('Digite o código de compartilhamento.'); return; }
    setSaving(true);
    setError(null);

    const { data: patientRow } = await supabase
      .from('patients')
      .select('id')
      .eq('code', code.trim().toUpperCase())
      .maybeSingle();

    if (!patientRow) {
      setError('Código não encontrado. Confira com quem cadastrou a criança.');
      setSaving(false);
      return;
    }

    await supabase.from('patient_members').upsert({
      patient_id: patientRow.id,
      profile_id: profile.id,
      role_in_patient: profile.role
    }, { onConflict: 'patient_id,profile_id' });

    setSaving(false);
    await onDone();
  };

  if (successCode) {
    return (
      <div className="text-center space-y-4 py-2">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8 text-emerald-600" />
        </div>
        <h2 className="text-lg font-black text-slate-900">Criança cadastrada!</h2>
        <p className="text-xs text-slate-500 max-w-xs mx-auto">
          Compartilhe o código abaixo com a família, escola e terapeutas para que eles também acompanhem.
        </p>
        <div className="bg-slate-50 border-2 border-dashed border-indigo-300 rounded-2xl py-4 px-6 flex items-center justify-center gap-3">
          <span className="text-2xl font-black tracking-widest text-indigo-700">{successCode}</span>
          <button
            onClick={() => navigator.clipboard?.writeText(successCode)}
            className="p-2 bg-white rounded-xl border border-slate-200 hover:bg-slate-50"
            title="Copiar código"
          >
            <Copy className="w-4 h-4 text-slate-600" />
          </button>
        </div>
        <button
          onClick={onDone}
          className="w-full py-4 bg-[#4F46E5] hover:bg-[#4338CA] text-white font-bold text-sm rounded-2xl shadow-md transition active:scale-[0.98]"
        >
          Ir para o painel
        </button>
      </div>
    );
  }

  if (mode === 'choose') {
    return (
      <div className="space-y-5">
        <div className="text-center">
          <h2 className="text-lg sm:text-xl font-black text-slate-900">
            {embedded ? 'Adicionar criança' : 'Agora, vamos vincular uma criança'}
          </h2>
          <p className="text-xs text-slate-500 mt-1">Cadastre uma nova criança ou entre com um código já existente.</p>
        </div>

        <button
          onClick={() => setMode('create')}
          className="w-full p-4 rounded-2xl border border-indigo-100 bg-[#F5F5FE] hover:bg-[#ECECFE] transition flex items-center gap-4 text-left active:scale-[0.98]"
        >
          <div className="w-12 h-12 rounded-2xl bg-[#4F46E5] text-white flex items-center justify-center text-xl shadow-sm shrink-0">
            <Plus className="w-6 h-6" />
          </div>
          <div>
            <div className="font-black text-slate-800 text-sm">Cadastrar nova criança</div>
            <div className="text-xs text-slate-500">Você será o primeiro responsável vinculado</div>
          </div>
        </button>

        <button
          onClick={() => setMode('code')}
          className="w-full p-4 rounded-2xl border border-emerald-200 bg-[#F0FDF4] hover:bg-[#DCFCE7] transition flex items-center gap-4 text-left active:scale-[0.98]"
        >
          <div className="w-12 h-12 rounded-2xl bg-[#10B981] text-white flex items-center justify-center text-xl shadow-sm shrink-0">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <div className="font-black text-slate-800 text-sm">Já tenho um código</div>
            <div className="text-xs text-slate-500">Entrar em uma criança já cadastrada</div>
          </div>
        </button>

        {onCancel && (
          <button onClick={onCancel} className="w-full text-xs font-bold text-slate-400 hover:text-slate-600 py-2">
            Cancelar
          </button>
        )}
      </div>
    );
  }

  if (mode === 'code') {
    return (
      <div className="space-y-5">
        <button onClick={() => { setMode('choose'); setError(null); }} className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-700">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>
        <h2 className="text-lg font-black text-slate-900">Digite o código</h2>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Ex: ROD-8492"
          className="w-full p-4 rounded-2xl border border-slate-200 text-center text-lg font-black tracking-widest focus:outline-indigo-600"
        />
        {error && <p className="text-xs text-rose-600 font-semibold text-center">{error}</p>}
        <button
          disabled={saving}
          onClick={handleJoinByCode}
          className="w-full py-4 bg-[#10B981] hover:bg-[#0d9c6d] disabled:bg-slate-300 text-white font-bold text-sm rounded-2xl shadow-md transition active:scale-[0.98] flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Entrar'}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <button onClick={() => { setMode('choose'); setError(null); }} className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-700">
        <ArrowLeft className="w-4 h-4" /> Voltar
      </button>
      <h2 className="text-lg font-black text-slate-900">Cadastrar criança</h2>

      <div className="space-y-4">
        <input
          value={form.full_name}
          onChange={(e) => setForm({ ...form, full_name: e.target.value })}
          placeholder="Nome completo *"
          className="w-full p-3.5 rounded-2xl border border-slate-200 text-sm focus:outline-indigo-600"
        />
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-black uppercase text-slate-500 block mb-1.5 ml-1">Data de nascimento</label>
            <input
              type="date"
              value={form.birth_date}
              onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
              className="w-full p-3 rounded-2xl border border-slate-200 text-xs focus:outline-indigo-600"
            />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase text-slate-500 block mb-1.5 ml-1">Série / Ano</label>
            <input
              value={form.grade_level}
              onChange={(e) => setForm({ ...form, grade_level: e.target.value })}
              placeholder="Ex: 2º Ano"
              className="w-full p-3 rounded-2xl border border-slate-200 text-xs focus:outline-indigo-600"
            />
          </div>
        </div>
        <input
          value={form.school_name}
          onChange={(e) => setForm({ ...form, school_name: e.target.value })}
          placeholder="Escola"
          className="w-full p-3.5 rounded-2xl border border-slate-200 text-sm focus:outline-indigo-600"
        />
        <div>
          <label className="text-[10px] font-black uppercase text-slate-500 block mb-1.5 ml-1">Nível de suporte (DSM-5)</label>
          <select
            value={form.support_level}
            onChange={(e) => setForm({ ...form, support_level: e.target.value as any })}
            className="w-full p-3.5 rounded-2xl border border-slate-200 bg-white text-xs font-bold focus:outline-indigo-600"
          >
            {SUPPORT_LEVELS.map((lvl) => <option key={lvl} value={lvl!}>{lvl}</option>)}
          </select>
        </div>
      </div>

      {error && <p className="text-xs text-rose-600 font-semibold text-center">{error}</p>}

      <button
        disabled={saving}
        onClick={handleCreatePatient}
        className="w-full py-4 bg-[#4F46E5] hover:bg-[#4338CA] disabled:bg-slate-300 text-white font-bold text-sm rounded-2xl shadow-md transition active:scale-[0.98] flex items-center justify-center gap-2"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Cadastrar criança'}
      </button>
    </div>
  );
}

// =============================================================================
// PERFIL DA CRIANÇA
// =============================================================================
interface LinkedMember {
  role_in_patient: string;
  profiles: { id: string; full_name: string | null; email: string; role: ProfileRole | null; specialty: string | null; avatar_url: string | null } | null;
}

function PatientInfoScreen({
  patient, onUpdated, onClose
}: {
  patient: Patient;
  onUpdated: () => Promise<void>;
  onClose: () => void;
}) {
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [members, setMembers] = useState<LinkedMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);

  const [form, setForm] = useState({
    full_name: patient.full_name,
    birth_date: patient.birth_date || '',
    school_name: patient.school_name || '',
    grade_level: patient.grade_level || '',
    support_level: patient.support_level || 'Nível 1 (Leve)'
  });

  const loadMembers = useCallback(async () => {
    setLoadingMembers(true);
    const { data } = await supabase
      .from('patient_members')
      .select('role_in_patient, profiles(id, full_name, email, role, specialty, avatar_url)')
      .eq('patient_id', patient.id);
    setMembers((data as any) || []);
    setLoadingMembers(false);
  }, [patient.id]);

  useEffect(() => { loadMembers(); }, [loadMembers]);

  const handleSave = async () => {
    setSaving(true);
    await supabase.from('patients').update({
      full_name: form.full_name.trim(),
      birth_date: form.birth_date || null,
      school_name: form.school_name || null,
      grade_level: form.grade_level || null,
      support_level: form.support_level
    }).eq('id', patient.id);
    setSaving(false);
    setEditMode(false);
    await onUpdated();
  };

  const grouped = useMemo(() => {
    const byRole: Record<ProfileRole, LinkedMember[]> = { pais: [], at_escola: [], terapeuta_clinico: [], professor: [] };
    members.forEach((m) => {
      const r = m.profiles?.role;
      if (r && byRole[r]) byRole[r].push(m);
    });
    return byRole;
  }, [members]);

  const age = calcAge(patient.birth_date);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-lg font-black text-slate-900">Perfil da criança</h3>
        {!editMode && (
          <button onClick={() => setEditMode(true)} className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 transition">
            <Pencil className="w-3.5 h-3.5" /> Editar
          </button>
        )}
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-100 p-6 shadow-sm space-y-5">
        <div className="flex flex-col items-center gap-2">
          <ChildAvatar patient={patient} size={80} editable />
          {!editMode && (
            <div className="text-center">
              <p className="font-black text-slate-900 text-lg">{patient.full_name}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {age !== null ? `${age} anos` : 'Idade não informada'}
                {patient.grade_level ? ` • ${patient.grade_level}` : ''}
              </p>
            </div>
          )}
        </div>

        {!editMode ? (
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <InfoRow label="Escola" value={patient.school_name || '—'} />
            <InfoRow label="Data de nascimento" value={patient.birth_date ? formatDateBR(patient.birth_date) : '—'} />
            <InfoRow label="Nível de suporte" value={patient.support_level || '—'} />
            <InfoRow label="Código de compartilhamento" value={patient.code} copyable />
          </div>
        ) : (
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <div>
              <label className="text-[10px] font-black uppercase text-slate-500 block mb-1.5 ml-1">Nome completo</label>
              <input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="w-full p-3.5 rounded-2xl border border-slate-200 text-sm focus:outline-indigo-600" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 block mb-1.5 ml-1">Nascimento</label>
                <input type="date" value={form.birth_date} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} className="w-full p-3 rounded-2xl border border-slate-200 text-xs focus:outline-indigo-600" />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 block mb-1.5 ml-1">Série / Ano</label>
                <input value={form.grade_level} onChange={(e) => setForm({ ...form, grade_level: e.target.value })} className="w-full p-3 rounded-2xl border border-slate-200 text-xs focus:outline-indigo-600" />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-slate-500 block mb-1.5 ml-1">Escola</label>
              <input value={form.school_name} onChange={(e) => setForm({ ...form, school_name: e.target.value })} className="w-full p-3.5 rounded-2xl border border-slate-200 text-sm focus:outline-indigo-600" />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-slate-500 block mb-1.5 ml-1">Nível de suporte (DSM-5)</label>
              <select value={form.support_level} onChange={(e) => setForm({ ...form, support_level: e.target.value as any })} className="w-full p-3.5 rounded-2xl border border-slate-200 bg-white text-xs font-bold focus:outline-indigo-600">
                {SUPPORT_LEVELS.map((lvl) => <option key={lvl} value={lvl!}>{lvl}</option>)}
              </select>
            </div>

            <div className="flex gap-3 pt-1">
              <button onClick={() => setEditMode(false)} className="flex-1 py-3.5 rounded-2xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition">
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.full_name.trim()}
                className="flex-[2] py-3.5 rounded-2xl bg-[#4F46E5] hover:bg-[#4338CA] disabled:bg-slate-300 text-white font-bold text-xs shadow-md transition active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar alterações'}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h4 className="text-xs font-black uppercase tracking-wide text-slate-500 px-1">Equipe vinculada</h4>

        {loadingMembers && <div className="py-8 flex justify-center"><Loader2 className="w-5 h-5 text-indigo-500 animate-spin" /></div>}

        {!loadingMembers && members.length === 0 && (
          <div className="bg-white rounded-[2rem] border border-slate-100 p-6 text-center">
            <p className="text-xs text-slate-500">Ninguém mais entrou com o código ainda. Compartilhe <b>{patient.code}</b> com a família, escola e terapeutas.</p>
          </div>
        )}

        {!loadingMembers && members.length > 0 && (Object.keys(ROLE_LABELS) as ProfileRole[]).map((r) => {
          const list = grouped[r];
          if (!list || list.length === 0) return null;
          const meta = ROLE_LABELS[r];
          return (
            <div key={r} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm space-y-2.5">
              <span className="text-[10px] font-black uppercase tracking-wide" style={{ color: meta.color }}>{meta.emoji} {meta.label}</span>
              {list.map((m, i) => (
                <div key={i} className="flex items-center gap-3">
                  {m.profiles?.avatar_url ? (
                    <img src={m.profiles.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center"><UserCheck className="w-4 h-4 text-slate-400" /></div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">{m.profiles?.full_name || 'Sem nome'}</p>
                    <p className="text-[10px] text-slate-400 truncate">{m.profiles?.specialty || m.profiles?.email}</p>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function InfoRow({ label, value, copyable }: { label: string; value: string; copyable?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs font-semibold text-slate-500">{label}</span>
      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 text-right">
        {value}
        {copyable && value !== '—' && (
          <button onClick={() => navigator.clipboard?.writeText(value)} className="text-slate-400 hover:text-indigo-600 transition">
            <Copy className="w-3.5 h-3.5" />
          </button>
        )}
      </span>
    </div>
  );
}

function SwitchPatientScreen({
  patients, activePatientId, onSelect, onAddNew
}: {
  patients: Patient[];
  activePatientId: string | null;
  onSelect: (id: string) => void;
  onAddNew: () => void;
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-black text-slate-900 px-1">Trocar de criança</h2>
      <div className="space-y-3">
        {patients.map((p) => {
          const active = p.id === activePatientId;
          const age = calcAge(p.birth_date);
          return (
            <button
              key={p.id}
              onClick={() => onSelect(p.id)}
              className={`w-full p-4 rounded-2xl border transition flex items-center gap-4 text-left active:scale-[0.98] ${
                active ? 'border-indigo-400 bg-indigo-50 shadow-sm' : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <ChildAvatar patient={p} size={48} />
              <div className="flex-1">
                <div className="font-black text-slate-800 text-sm">{p.full_name}</div>
                <div className="text-xs text-slate-500">
                  {age !== null ? `${age} anos • ` : ''}{p.grade_level || 'Sem série informada'}
                </div>
              </div>
              {active && <CheckCircle2 className="w-5 h-5 text-indigo-600 shrink-0" />}
            </button>
          );
        })}
      </div>

      <button
        onClick={onAddNew}
        className="w-full p-4 rounded-2xl border-2 border-dashed border-slate-300 text-slate-500 hover:border-indigo-300 hover:text-indigo-600 transition flex items-center justify-center gap-2 font-bold text-sm active:scale-[0.98]"
      >
        <Plus className="w-4 h-4" /> Adicionar outra criança
      </button>
    </div>
  );
}

// =============================================================================
// AVATAR DA CRIANÇA
// =============================================================================
function ChildAvatar({
  patient, size = 44, editable = false, onUploaded
}: {
  patient: Patient;
  size?: number;
  editable?: boolean;
  onUploaded?: (url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${patient.id}/${Date.now()}.${ext}`;

    const { error: upErr } = await supabase.storage.from('patient-photos').upload(path, file, { upsert: true });
    if (!upErr) {
      const { data } = supabase.storage.from('patient-photos').getPublicUrl(path);
      await supabase.from('patients').update({ photo_url: data.publicUrl }).eq('id', patient.id);
      onUploaded?.(data.publicUrl);
    }
    setUploading(false);
  };

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div
        className="rounded-full border-2 border-blue-400 bg-white flex items-center justify-center overflow-hidden shadow-sm"
        style={{ width: size, height: size }}
      >
        {patient.photo_url ? (
          <img src={patient.photo_url} alt={patient.full_name} className="w-full h-full object-cover" />
        ) : (
          <span style={{ fontSize: size * 0.5 }}>{patient.photo_emoji || '🙂'}</span>
        )}
      </div>
      {editable && (
        <label className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow cursor-pointer hover:bg-indigo-700">
          {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />}
          <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
        </label>
      )}
    </div>
  );
}

// =============================================================================
// CABEÇALHO PERSISTENTE - CORRIGIDO
// =============================================================================
function AppHeader({
  profile, patient, canGoBack, onBack, onSwitchPatient, onOpenPatientInfo, onSignOut, onRoleChange
}: {
  profile: Profile;
  patient: Patient;
  canGoBack: boolean;
  onBack: () => void;
  onSwitchPatient: () => void;
  onOpenPatientInfo: () => void;
  onSignOut: () => void;
  onRoleChange: (role: ProfileRole) => void | Promise<void>;
}) {
  const age = calcAge(patient.birth_date);
  const roleMeta = profile.role ? ROLE_LABELS[profile.role] : null;
  const [showRolePicker, setShowRolePicker] = useState(false);

  return (
    <header className="bg-white border-b border-slate-100 sticky top-0 z-40 shadow-sm print:hidden relative">
      {/* Fundo com ícone - sem overflow-hidden */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `url('/header.png')`,
          backgroundSize: '200px 200px',
          backgroundRepeat: 'repeat',
          backgroundPosition: 'center'
        }}
      />
      
      <div className="max-w-xl mx-auto p-4 space-y-3 relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            {canGoBack && (
              <button onClick={onBack} className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center shrink-0 transition active:scale-95">
                <ArrowLeft className="w-4 h-4 text-slate-600" />
              </button>
            )}
            <ChildAvatar patient={patient} size={44} editable={profile.role === 'at_escola' || profile.role === 'pais'} />
            <button onClick={onOpenPatientInfo} className="min-w-0 text-left active:opacity-70 transition">
              <h2 className="font-black text-slate-900 text-base leading-tight truncate">{patient.full_name}</h2>
              <p className="text-[11px] text-slate-400 font-medium truncate">
                {age !== null ? `${age} anos • ` : ''}{patient.grade_level || patient.school_name || 'Toque para ver o perfil'}
              </p>
            </button>
          </div>

          <button
            onClick={onSwitchPatient}
            className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[11px] font-bold transition active:scale-95 flex items-center gap-1 shrink-0"
          >
            <Users className="w-3.5 h-3.5" /> Trocar
          </button>
        </div>

        <div className="flex items-center justify-between bg-slate-50 rounded-2xl px-3 py-2 relative">
          <div className="flex items-center gap-2 min-w-0">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover" />
            ) : (
              <UserCheck className="w-4 h-4 text-slate-400 shrink-0" />
            )}
            <span className="text-xs font-bold text-slate-700 truncate">{profile.full_name}</span>
          </div>
          {roleMeta && (
            <button
              onClick={() => setShowRolePicker((v) => !v)}
              title="Trocar papel (modo de teste)"
              className="text-[10px] font-black uppercase tracking-wide px-2 py-1 rounded-lg shrink-0 hover:opacity-75 transition active:scale-95"
              style={{ color: roleMeta.color, background: `${roleMeta.color}15` }}
            >
              {roleMeta.emoji} {roleMeta.short}
            </button>
          )}
          <button onClick={onSignOut} className="text-slate-400 hover:text-rose-600 transition shrink-0 ml-2" title="Sair">
            <LogOut className="w-4 h-4" />
          </button>

          {showRolePicker && (
            <div className="absolute right-0 top-full mt-2 bg-white rounded-2xl border border-slate-200 shadow-xl p-2 z-50 w-64">
              <p className="text-[10px] font-black uppercase text-slate-400 px-2 py-1">Ver como (modo de teste)</p>
              {(Object.keys(ROLE_LABELS) as ProfileRole[]).map((r) => {
                const meta = ROLE_LABELS[r];
                const active = profile.role === r;
                return (
                  <button
                    key={r}
                    onClick={async () => { setShowRolePicker(false); await onRoleChange(r); }}
                    className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-bold transition ${active ? '' : 'hover:bg-slate-50'}`}
                    style={active ? { background: `${meta.color}15`, color: meta.color } : { color: '#334155' }}
                  >
                    <span>{meta.emoji}</span> {meta.label}
                    {active && <CheckCircle2 className="w-3.5 h-3.5 ml-auto" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

// =============================================================================
// VISÃO DO AT
// =============================================================================
function ATDashboard({ patient, profile, onOpenSchedule }: { patient: Patient; profile: Profile; onOpenSchedule: () => void }) {
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSlot, setActiveSlot] = useState<ScheduleSlot | null>(null);
  const [existingLog, setExistingLog] = useState<DailyLog | null>(null);

  const todayDow = (() => {
    const d = new Date().getDay();
    return d === 0 || d === 6 ? 1 : d;
  })();

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: slotRows }, { data: logRows }] = await Promise.all([
      supabase.from('schedule_slots').select('*').eq('patient_id', patient.id).eq('day_of_week', todayDow).order('start_time'),
      supabase.from('daily_logs').select('*').eq('patient_id', patient.id).eq('date', todayISO())
    ]);
    setSlots(slotRows || []);
    setLogs(logRows || []);
    setLoading(false);
  }, [patient.id, todayDow]);

  useEffect(() => { load(); }, [load]);

  const openSlot = (slot: ScheduleSlot) => {
    const found = logs.find((l) => l.slot_id === slot.id) || null;
    setExistingLog(found);
    setActiveSlot(slot);
  };

  const handleSaved = (log: DailyLog) => {
    setLogs((prev) => [log, ...prev.filter((l) => l.slot_id !== log.slot_id)]);
    setActiveSlot(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center px-1">
        <h3 className="text-sm font-black text-slate-700 uppercase tracking-wide">
          Rotina de {weekdayLabel(todayDow)}
        </h3>
        <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
          {logs.length} de {slots.length} preenchidas
        </span>
      </div>

      <button
        onClick={onOpenSchedule}
        className="w-full p-3.5 rounded-2xl border border-dashed border-slate-300 text-slate-500 hover:border-indigo-300 hover:text-indigo-600 transition flex items-center justify-center gap-2 font-bold text-xs active:scale-[0.98] bg-white"
      >
        <ClipboardList className="w-4 h-4" /> Editar grade de disciplinas
      </button>

      {loading && (
        <div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 text-indigo-500 animate-spin" /></div>
      )}

      {!loading && slots.length === 0 && (
        <div className="bg-white rounded-[2rem] border border-slate-100 p-8 text-center space-y-2">
          <p className="text-sm font-bold text-slate-700">Nenhuma disciplina cadastrada para hoje.</p>
          <p className="text-xs text-slate-500">Toque em "Editar grade de disciplinas" para montar a rotina escolar.</p>
        </div>
      )}

      {slots.map((slot) => {
        const hasLog = logs.find((l) => l.slot_id === slot.id);
        const cm = COLOR_MAP[slot.color] || COLOR_MAP.indigo;
        return (
          <div key={slot.id} className={`${cm.lightBg} rounded-[2rem] border ${cm.border} p-5 sm:p-6 shadow-sm space-y-4`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 tracking-wider">
                {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
              </span>
              {hasLog ? (
                <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Concluído
                </span>
              ) : (
                <span className="bg-amber-100 text-amber-700 text-xs font-bold px-3 py-1 rounded-full">Pendente</span>
              )}
            </div>

            <div className="flex items-center gap-3.5">
              <div className={`w-12 h-12 rounded-2xl ${cm.bg} text-white flex items-center justify-center text-xl shadow-sm`}>
                {slot.icon}
              </div>
              <div>
                <h4 className="text-lg font-black text-slate-900 leading-tight">{slot.subject}</h4>
                <p className="text-xs text-slate-500 mt-0.5">Toque para abrir o formulário rápido</p>
              </div>
            </div>

            <button
              onClick={() => openSlot(slot)}
              className={`w-full py-3.5 rounded-2xl font-bold text-sm text-center transition active:scale-[0.98] shadow-sm ${
                hasLog ? 'bg-white hover:bg-slate-50 text-indigo-700 border-2 border-indigo-200' : 'bg-[#4F46E5] hover:bg-[#4338CA] text-white shadow-indigo-200'
              }`}
            >
              {hasLog ? 'Ver / Editar registro' : 'Registrar acompanhamento'}
            </button>
          </div>
        );
      })}

      {activeSlot && (
        <DailyLogModal
          patient={patient}
          profile={profile}
          slot={activeSlot}
          existingLog={existingLog}
          onClose={() => setActiveSlot(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}

// =============================================================================
// MODAL DE REGISTRO DE AULA
// =============================================================================
function DailyLogModal({
  patient, profile, slot, existingLog, onClose, onSaved
}: {
  patient: Patient;
  profile: Profile;
  slot: ScheduleSlot;
  existingLog: DailyLog | null;
  onClose: () => void;
  onSaved: (log: DailyLog) => void;
}) {
  const [completed, setCompleted] = useState<CompletedActivity>(existingLog?.completed_activity || 'total');
  const [promptLevel, setPromptLevel] = useState<PromptLevel>(existingLog?.prompt_level || 'independente');
  const [regulation, setRegulation] = useState<RegulationState>(existingLog?.regulation_state || 'regulado');
  const [triggers, setTriggers] = useState<string[]>(existingLog?.sensory_notes ? existingLog.sensory_notes.split(',').map((t) => t.trim()).filter(Boolean) : []);
  const [notes, setNotes] = useState(existingLog?.observations || '');
  const [saving, setSaving] = useState(false);

  const toggleTrigger = (t: string) => {
    setTriggers((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      patient_id: patient.id,
      slot_id: slot.id,
      date: todayISO(),
      subject_name: slot.subject,
      completed_activity: completed,
      prompt_level: promptLevel,
      regulation_state: regulation,
      sensory_notes: triggers.join(', ') || null,
      observations: notes || null,
      created_by: profile.id
    };

    const { data, error } = await supabase
      .from('daily_logs')
      .upsert(payload, { onConflict: 'patient_id,slot_id,date' })
      .select()
      .single();

    setSaving(false);
    if (!error && data) {
      onSaved({ ...data, author_name: profile.full_name || undefined });
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
      <div className="bg-white w-full max-w-lg rounded-t-[2.5rem] sm:rounded-[2.5rem] p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex justify-between items-start border-b border-slate-100 pb-4">
          <div>
            <span className="text-xs font-black tracking-wider text-[#4F46E5] uppercase">
              {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
            </span>
            <h3 className="text-2xl font-black text-slate-900 mt-0.5">{slot.subject}</h3>
          </div>
          <button onClick={onClose} className="w-9 h-9 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center text-slate-500 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div>
          <label className="text-xs font-black tracking-wider uppercase text-slate-700 block mb-2">Conseguiu realizar as atividades?</label>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(COMPLETED_LABELS) as CompletedActivity[]).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setCompleted(opt)}
                className={`py-3 rounded-2xl font-bold text-[11px] transition border ${
                  completed === opt ? 'bg-[#4F46E5] text-white border-[#4F46E5] shadow-sm' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {COMPLETED_LABELS[opt]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-black tracking-wider uppercase text-slate-700 block mb-2">Nível de apoio (dica/prompting)</label>
          <select
            value={promptLevel}
            onChange={(e) => setPromptLevel(e.target.value as PromptLevel)}
            className="w-full p-3.5 rounded-2xl border border-slate-200 bg-white font-bold text-xs text-slate-800 focus:outline-indigo-600 shadow-sm"
          >
            {(Object.keys(PROMPT_LABELS) as PromptLevel[]).map((p) => (
              <option key={p} value={p}>{PROMPT_LABELS[p]}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-black tracking-wider uppercase text-slate-700 block mb-2">Estado de regulação sensorial</label>
          <select
            value={regulation}
            onChange={(e) => setRegulation(e.target.value as RegulationState)}
            className="w-full p-3.5 rounded-2xl border border-slate-200 bg-white font-bold text-xs text-slate-800 focus:outline-indigo-600 shadow-sm"
          >
            {(Object.keys(REGULATION_META) as RegulationState[]).map((r) => (
              <option key={r} value={r}>{REGULATION_META[r].emoji} {REGULATION_META[r].label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-black tracking-wider uppercase text-slate-700 block mb-2">Gatilhos observados (opcional)</label>
          <div className="flex flex-wrap gap-2">
            {TRIGGER_OPTIONS.map((t) => {
              const isSelected = triggers.includes(t);
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleTrigger(t)}
                  className={`py-2 px-3.5 rounded-full text-xs font-semibold transition border ${
                    isSelected ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-bold' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="text-xs font-black tracking-wider uppercase text-slate-700 block mb-2">Observações (manejo e reforçadores usados)</label>
          <textarea
            rows={3}
            placeholder="Ex: Utilizou o suporte visual para finalizar a página 12..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full p-3.5 rounded-2xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:outline-indigo-600 transition"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-4 bg-[#4F46E5] hover:bg-[#4338CA] disabled:bg-slate-300 text-white font-bold text-sm rounded-2xl shadow-md transition active:scale-[0.98] flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar acompanhamento da aula'}
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// EDITOR DE GRADE
// =============================================================================
function ScheduleEditor({ patient, profile, onClose }: { patient: Patient; profile: Profile; onClose: () => void }) {
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeDay, setActiveDay] = useState(1);
  const [editing, setEditing] = useState<Partial<ScheduleSlot> | null>(null);
  const [logSlot, setLogSlot] = useState<ScheduleSlot | null>(null);
  const [saving, setSaving] = useState(false);

  const todayDow = (() => {
    const d = new Date().getDay();
    return d === 0 || d === 6 ? 1 : d;
  })();

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: slotRows }, { data: logRows }] = await Promise.all([
      supabase.from('schedule_slots').select('*').eq('patient_id', patient.id).order('start_time'),
      supabase.from('daily_logs').select('*').eq('patient_id', patient.id).eq('date', todayISO())
    ]);
    setSlots(slotRows || []);
    setLogs(logRows || []);
    setLoading(false);
  }, [patient.id]);

  useEffect(() => { load(); }, [load]);

  const dayosSlots = slots.filter((s) => s.day_of_week === activeDay);

  const startNew = () => {
    const preset = SUBJECT_PRESETS[0];
    setEditing({ day_of_week: activeDay, start_time: '08:00', end_time: '08:50', subject: '', icon: preset.icon, color: preset.color });
  };

  const handleSave = async () => {
    if (!editing?.subject) return;
    setSaving(true);
    if (editing.id) {
      await supabase.from('schedule_slots').update({
        start_time: editing.start_time, end_time: editing.end_time,
        subject: editing.subject, icon: editing.icon, color: editing.color, day_of_week: editing.day_of_week
      }).eq('id', editing.id);
    } else {
      await supabase.from('schedule_slots').insert({
        patient_id: patient.id,
        day_of_week: editing.day_of_week,
        start_time: editing.start_time,
        end_time: editing.end_time,
        subject: editing.subject,
        icon: editing.icon,
        color: editing.color
      });
    }
    setSaving(false);
    setEditing(null);
    load();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('schedule_slots').delete().eq('id', id);
    load();
  };

  const handleCardClick = (slot: ScheduleSlot) => {
    if (activeDay !== todayDow) return;
    setLogSlot(slot);
  };

  const handleLogSaved = (log: DailyLog) => {
    setLogs((prev) => [log, ...prev.filter((l) => l.slot_id !== log.slot_id)]);
    setLogSlot(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-lg font-black text-slate-900">Grade de disciplinas</h3>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {WEEKDAYS.map((d) => (
          <button
            key={d.value}
            onClick={() => setActiveDay(d.value)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              activeDay === d.value ? 'bg-[#4F46E5] text-white shadow-sm' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 text-indigo-500 animate-spin" /></div>
      ) : (
        <div className="space-y-3.5">
          {dayosSlots.length === 0 && (
            <div className="bg-white rounded-[2rem] border border-slate-100 p-8 text-center">
              <p className="text-sm font-bold text-slate-700">Nenhuma disciplina neste dia ainda.</p>
              <p className="text-xs text-slate-500 mt-1">Toque em "Adicionar disciplina" abaixo para montar a rotina.</p>
            </div>
          )}
          {dayosSlots.map((slot) => {
            const cm = COLOR_MAP[slot.color] || COLOR_MAP.indigo;
            const isToday = activeDay === todayDow;
            const hasLog = logs.find((l) => l.slot_id === slot.id);
            return (
              <div
                key={slot.id}
                onClick={() => handleCardClick(slot)}
                className={`${cm.lightBg} rounded-2xl border ${cm.border} p-4 flex items-center gap-3 shadow-sm transition ${
                  isToday ? 'cursor-pointer hover:shadow-md active:scale-[0.99]' : ''
                }`}
              >
                <div className={`w-11 h-11 rounded-xl ${cm.bg} text-white flex items-center justify-center text-lg shadow-sm shrink-0`}>
                  {slot.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm text-slate-800 truncate">{slot.subject}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                    {isToday && (
                      <span className={`ml-2 font-bold ${hasLog ? 'text-emerald-600' : 'text-amber-600'}`}>
                        • {hasLog ? 'Registrado hoje' : 'Toque para registrar'}
                      </span>
                    )}
                  </div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); setEditing(slot); }} className="p-2 text-slate-400 hover:text-indigo-600 transition shrink-0"><Pencil className="w-4 h-4" /></button>
                <button onClick={(e) => { e.stopPropagation(); handleDelete(slot.id); }} className="p-2 text-slate-400 hover:text-rose-600 transition shrink-0"><Trash2 className="w-4 h-4" /></button>
              </div>
            );
          })}
        </div>
      )}

      <button
        onClick={startNew}
        className="w-full p-3.5 rounded-2xl border-2 border-dashed border-slate-300 text-slate-500 hover:border-indigo-300 hover:text-indigo-600 transition flex items-center justify-center gap-2 font-bold text-xs active:scale-[0.98] bg-white"
      >
        <Plus className="w-4 h-4" /> Adicionar disciplina em {WEEKDAYS.find((d) => d.value === activeDay)?.label}
      </button>

      {editing && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="bg-white w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center">
              <h4 className="text-lg font-black text-slate-900">{editing.id ? 'Editar disciplina' : 'Nova disciplina'}</h4>
              <button onClick={() => setEditing(null)} className="w-8 h-8 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center"><X className="w-4 h-4" /></button>
            </div>

            <input
              value={editing.subject || ''}
              onChange={(e) => setEditing({ ...editing, subject: e.target.value })}
              placeholder="Nome da disciplina"
              className="w-full p-3.5 rounded-2xl border border-slate-200 text-sm focus:outline-indigo-600"
            />

            <div>
              <label className="text-[10px] font-black uppercase text-slate-500 block mb-2 ml-1">Ícone e cor</label>
              <div className="flex flex-wrap gap-2.5">
                {SUBJECT_PRESETS.map((p) => {
                  const cm = COLOR_MAP[p.color];
                  const active = editing.icon === p.icon && editing.color === p.color;
                  return (
                    <button
                      key={p.label}
                      onClick={() => setEditing({ ...editing, icon: p.icon, color: p.color, subject: editing.subject || p.label })}
                      className={`w-11 h-11 rounded-xl ${cm.bg} border-2 ${active ? 'border-white ring-2 ring-indigo-500' : 'border-transparent'} text-white flex items-center justify-center text-lg shadow-sm`}
                    >
                      {p.icon}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 block mb-1.5 ml-1">Início</label>
                <input type="time" value={editing.start_time || ''} onChange={(e) => setEditing({ ...editing, start_time: e.target.value })} className="w-full p-3 rounded-2xl border border-slate-200 text-xs focus:outline-indigo-600" />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 block mb-1.5 ml-1">Fim</label>
                <input type="time" value={editing.end_time || ''} onChange={(e) => setEditing({ ...editing, end_time: e.target.value })} className="w-full p-3 rounded-2xl border border-slate-200 text-xs focus:outline-indigo-600" />
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={saving || !editing.subject}
              className="w-full py-4 bg-[#4F46E5] hover:bg-[#4338CA] disabled:bg-slate-300 text-white font-bold text-sm rounded-2xl shadow-md transition active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar disciplina'}
            </button>
          </div>
        </div>
      )}

      {logSlot && (
        <DailyLogModal
          patient={patient}
          profile={profile}
          slot={logSlot}
          existingLog={logs.find((l) => l.slot_id === logSlot.id) || null}
          onClose={() => setLogSlot(null)}
          onSaved={handleLogSaved}
        />
      )}
    </div>
  );
}

// =============================================================================
// VISÃO DOS PAIS
// =============================================================================
function ParentsDashboard({
  patient, onOpenWeekly, onOpenGuidelines, readOnlyLabel, profile
}: {
  patient: Patient;
  onOpenWeekly: () => void;
  onOpenGuidelines: () => void;
  readOnlyLabel?: string;
  profile: Profile;
}) {
  const [date, setDate] = useState(todayISO());
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('daily_logs').select('*').eq('patient_id', patient.id).eq('date', date).order('subject_name');
    setLogs(data || []);
    setLoading(false);
  }, [patient.id, date]);

  useEffect(() => { load(); }, [load]);

  const handleExportPDF = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho do relatório - visível apenas na impressão */}
      <div className="hidden print:block pb-6 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Prisma" className="h-10 w-auto object-contain" />
            <div className="h-8 w-px bg-slate-300" />
            <div>
              <p className="text-sm font-bold text-slate-900">Relatório de Acompanhamento</p>
              <p className="text-xs text-slate-500">{formatDateBR(date)}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold text-slate-700">{profile?.full_name}</p>
            <p className="text-[10px] text-slate-400">Emitido em {new Date().toLocaleDateString('pt-BR')}</p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-lg">
              {patient.photo_emoji || '👶'}
            </div>
            <div>
              <p className="font-bold text-slate-900">{patient.full_name}</p>
              <p className="text-xs text-slate-500">
                {patient.school_name || 'Escola não informada'} • {patient.grade_level || 'Série não informada'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-100 p-6 shadow-sm space-y-4 print:shadow-none print:border-0 print:p-0">
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-black text-slate-900 leading-tight">
              {readOnlyLabel || 'Relatório do dia'}
            </h3>
            <p className="text-xs text-slate-500 mt-1">Anotações feitas pelo acompanhante terapêutico</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* Date Picker compacto */}
            <div className="relative">
              <button
                onClick={() => setShowDatePicker(!showDatePicker)}
                className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-700 transition flex items-center gap-1.5 text-xs font-bold whitespace-nowrap"
              >
                <CalendarDays className="w-4 h-4" />
                <span className="hidden sm:inline">{formatDateBR(date)}</span>
              </button>
              {showDatePicker && (
                <div className="absolute right-0 top-full mt-2 bg-white rounded-2xl border border-slate-200 shadow-xl p-3 z-20 min-w-[220px]">
                  <input
                    type="date"
                    value={date}
                    max={todayISO()}
                    onChange={(e) => {
                      setDate(e.target.value);
                      setShowDatePicker(false);
                    }}
                    className="w-full p-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 focus:outline-indigo-600"
                  />
                </div>
              )}
            </div>
            
            <button 
              onClick={handleExportPDF} 
              className="p-2.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl flex items-center gap-1.5 text-indigo-700 transition active:scale-95 print:hidden text-xs font-bold whitespace-nowrap"
            >
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">PDF</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 print:hidden">
        <button onClick={onOpenWeekly} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm flex flex-col items-center gap-1.5 hover:bg-slate-50 transition active:scale-[0.98]">
          <TrendingUp className="w-5 h-5 text-indigo-600" />
          <span className="text-xs font-bold text-slate-700">Gráfico da semana</span>
        </button>
        <button onClick={onOpenGuidelines} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm flex flex-col items-center gap-1.5 hover:bg-slate-50 transition active:scale-[0.98]">
          <Lightbulb className="w-5 h-5 text-amber-500" />
          <span className="text-xs font-bold text-slate-700">Dicas dos terapeutas</span>
        </button>
      </div>

      {loading && <div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 text-indigo-500 animate-spin" /></div>}

      {!loading && logs.length === 0 && (
        <div className="bg-white rounded-[2rem] border border-slate-100 p-8 text-center">
          <p className="text-sm font-bold text-slate-700">Nenhum registro nesta data.</p>
        </div>
      )}

      <div className="space-y-4">
        {logs.map((log) => <DailyLogCard key={log.id} log={log} />)}
      </div>
    </div>
  );
}

function DailyLogCard({ log }: { log: DailyLog }) {
  const reg = log.regulation_state ? REGULATION_META[log.regulation_state] : null;
  const triggers = log.sensory_notes ? log.sensory_notes.split(',').map((t) => t.trim()).filter(Boolean) : [];

  return (
    <div className="bg-white rounded-[2rem] border border-slate-100 p-6 shadow-sm space-y-4 print:break-inside-avoid print:shadow-none print:border-0 print:p-4 print:border-b print:border-slate-200">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2 print:border-b-0 print:pb-0">
        <h4 className="text-base font-black text-slate-900">{log.subject_name}</h4>
        {reg && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-slate-200 bg-white text-xs font-bold text-slate-800 shadow-sm">
            {reg.label} <span className={`w-2.5 h-2.5 rounded-full ${reg.dot}`}></span>
          </span>
        )}
      </div>

      {log.observations && (
        <p className="text-slate-800 text-sm font-medium leading-relaxed italic bg-slate-50/70 p-3.5 rounded-2xl border border-slate-100 print:bg-white print:border-0 print:p-0 print:italic print:text-slate-700">
          "{log.observations}"
        </p>
      )}

      {triggers.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Gatilhos:</span>
          {triggers.map((t) => (
            <span key={t} className="text-[11px] bg-amber-50 text-amber-800 font-semibold px-2 py-0.5 rounded-md print:bg-transparent print:border print:border-slate-300">⚠️ {t}</span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3 text-xs font-semibold text-slate-600 pt-1 flex-wrap">
        {log.completed_activity && <span>{COMPLETED_LABELS[log.completed_activity]}</span>}
        {log.prompt_level && <span>• Apoio: {PROMPT_LABELS[log.prompt_level]}</span>}
      </div>
    </div>
  );
}

// =============================================================================
// VISÃO DO TERAPEUTA
// =============================================================================
function TherapistDashboard({
  patient, profile, onOpenWeekly
}: {
  patient: Patient;
  profile: Profile;
  onOpenWeekly: () => void;
}) {
  const [date, setDate] = useState(todayISO());
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGuidelineForm, setShowGuidelineForm] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('daily_logs').select('*').eq('patient_id', patient.id).eq('date', date).order('subject_name');
    setLogs(data || []);
    setLoading(false);
  }, [patient.id, date]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-[2rem] border border-slate-100 p-6 shadow-sm space-y-4">
        <h3 className="text-xl font-black text-slate-900">Painel clínico</h3>
        
        <div className="relative">
          <button
            onClick={() => setShowDatePicker(!showDatePicker)}
            className="w-full p-3 rounded-2xl border border-slate-200 text-sm font-bold text-slate-700 flex items-center justify-between hover:bg-slate-50 transition"
          >
            <span>{formatDateBR(date)}</span>
            <CalendarDays className="w-4 h-4 text-slate-400" />
          </button>
          {showDatePicker && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-slate-200 shadow-xl p-4 z-10">
              <input
                type="date"
                value={date}
                max={todayISO()}
                onChange={(e) => {
                  setDate(e.target.value);
                  setShowDatePicker(false);
                }}
                className="w-full p-3 rounded-2xl border border-slate-200 text-sm font-bold text-slate-700 focus:outline-indigo-600"
              />
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button onClick={onOpenWeekly} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm flex flex-col items-center gap-1.5 hover:bg-slate-50 transition active:scale-[0.98]">
          <TrendingUp className="w-5 h-5 text-indigo-600" />
          <span className="text-xs font-bold text-slate-700">Evolução da semana</span>
        </button>
        <button onClick={() => setShowGuidelineForm(true)} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm flex flex-col items-center gap-1.5 hover:bg-slate-50 transition active:scale-[0.98]">
          <Sparkles className="w-5 h-5 text-emerald-600" />
          <span className="text-xs font-bold text-slate-700">Nova dica / orientação</span>
        </button>
      </div>

      {loading && <div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 text-indigo-500 animate-spin" /></div>}
      {!loading && logs.length === 0 && (
        <div className="bg-white rounded-[2rem] border border-slate-100 p-8 text-center">
          <p className="text-sm font-bold text-slate-700">Nenhum registro do AT nesta data.</p>
        </div>
      )}
      <div className="space-y-4">
        {logs.map((log) => <DailyLogCard key={log.id} log={log} />)}
      </div>

      {showGuidelineForm && (
        <GuidelineFormModal patient={patient} profile={profile} onClose={() => setShowGuidelineForm(false)} onSaved={() => setShowGuidelineForm(false)} />
      )}
    </div>
  );
}

// =============================================================================
// TELA DE DIRETRIZES
// =============================================================================
function GuidelinesScreen({ patient, profile, onClose }: { patient: Patient; profile: Profile; onClose: () => void }) {
  const [guidelines, setGuidelines] = useState<Guideline[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const canEdit = profile.role === 'terapeuta_clinico';

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('therapeutic_guidelines').select('*').eq('patient_id', patient.id).eq('is_active', true).order('created_at', { ascending: false });
    setGuidelines(data || []);
    setLoading(false);
  }, [patient.id]);

  useEffect(() => { load(); }, [load]);

  const handleArchive = async (id: string) => {
    await supabase.from('therapeutic_guidelines').update({ is_active: false }).eq('id', id);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-lg font-black text-slate-900">Dicas dos terapeutas</h3>
        {canEdit && (
          <button onClick={() => setShowForm(true)} className="p-2 bg-indigo-50 hover:bg-indigo-100 rounded-xl text-indigo-600 transition"><Plus className="w-5 h-5" /></button>
        )}
      </div>

      {loading && <div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 text-indigo-500 animate-spin" /></div>}

      {!loading && guidelines.length === 0 && (
        <div className="bg-white rounded-[2rem] border border-slate-100 p-8 text-center">
          <Lightbulb className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-700">Nenhuma orientação registrada ainda.</p>
        </div>
      )}

      <div className="space-y-3">
        {guidelines.map((g) => {
          const cat = CATEGORY_META[g.category];
          return (
            <div key={g.id} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wide text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">{cat.emoji} {cat.label}</span>
                {canEdit && (
                  <button onClick={() => handleArchive(g.id)} className="text-slate-300 hover:text-rose-500 transition" title="Arquivar"><Trash2 className="w-4 h-4" /></button>
                )}
              </div>
              <h4 className="font-black text-slate-900 text-sm">{g.title}</h4>
              <p className="text-xs text-slate-600 leading-relaxed">{g.description}</p>
              <p className="text-[10px] text-slate-400 italic">Por {g.author_name} ({g.author_role === 'terapeuta_clinico' ? 'Terapeuta' : g.author_role}) • para {g.target_audience}</p>
            </div>
          );
        })}
      </div>

      {showForm && (
        <GuidelineFormModal patient={patient} profile={profile} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />
      )}
    </div>
  );
}

function GuidelineFormModal({
  patient, profile, onClose, onSaved
}: {
  patient: Patient;
  profile: Profile;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<GuidelineCategory>('comportamental');
  const [description, setDescription] = useState('');
  const [audience, setAudience] = useState('todos');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim() || !description.trim()) return;
    setSaving(true);
    await supabase.from('therapeutic_guidelines').insert({
      patient_id: patient.id,
      title: title.trim(),
      category,
      description: description.trim(),
      target_audience: audience,
      author_id: profile.id,
      author_name: profile.full_name,
      author_role: profile.role
    });
    setSaving(false);
    onSaved();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
      <div className="bg-white w-full max-w-lg rounded-t-[2.5rem] sm:rounded-[2.5rem] p-6 sm:p-8 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex justify-between items-center">
          <h4 className="text-lg font-black text-slate-900">Nova orientação</h4>
          <button onClick={onClose} className="w-8 h-8 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center"><X className="w-4 h-4" /></button>
        </div>

        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título (ex: Como lidar com transições)" className="w-full p-3.5 rounded-2xl border border-slate-200 text-sm focus:outline-indigo-600" />

        <div>
          <label className="text-[10px] font-black uppercase text-slate-500 block mb-1.5 ml-1">Categoria</label>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(CATEGORY_META) as GuidelineCategory[]).map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition ${category === c ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-600 border border-slate-200'}`}
              >
                {CATEGORY_META[c].emoji} {CATEGORY_META[c].label}
              </button>
            ))}
          </div>
        </div>

        <textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descreva a orientação de forma prática e objetiva..." className="w-full p-3.5 rounded-2xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:outline-indigo-600 transition" />

        <div>
          <label className="text-[10px] font-black uppercase text-slate-500 block mb-1.5 ml-1">Destinada a</label>
          <select value={audience} onChange={(e) => setAudience(e.target.value)} className="w-full p-3.5 rounded-2xl border border-slate-200 bg-white text-xs font-bold focus:outline-indigo-600">
            <option value="todos">Todos</option>
            <option value="at_escola">Acompanhante Terapêutico</option>
            <option value="pais">Pais / Responsáveis</option>
            <option value="professor">Professor(a)</option>
          </select>
        </div>

        <button
          onClick={handleSave}
          disabled={saving || !title.trim() || !description.trim()}
          className="w-full py-4 bg-[#10B981] hover:bg-[#0d9c6d] disabled:bg-slate-300 text-white font-bold text-sm rounded-2xl shadow-md transition active:scale-[0.98] flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Publicar orientação'}
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// RELATÓRIO SEMANAL
// =============================================================================
function WeeklyReport({ patient, onClose, profile }: { patient: Patient; onClose: () => void; profile: Profile }) {
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(true);

  const { start, end, days } = useMemo(() => {
    const now = new Date();
    const day = now.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);
    const list: { iso: string; label: string }[] = [];
    for (let i = 0; i < 5; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      list.push({ iso: d.toISOString().slice(0, 10), label: WEEKDAYS[i].label.slice(0, 3) });
    }
    return { start: list[0].iso, end: list[4].iso, days: list };
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase.from('daily_logs').select('*').eq('patient_id', patient.id).gte('date', start).lte('date', end);
      setLogs(data || []);
      setLoading(false);
    })();
  }, [patient.id, start, end]);

  const regulationScore = (r: RegulationState | null) => {
    switch (r) {
      case 'regulado': return 5;
      case 'alerta': return 3.5;
      case 'hipoativo': return 3;
      case 'agitado': return 2;
      case 'sobrecarregado': return 1;
      default: return 0;
    }
  };

  const dailyAverages = days.map((d) => {
    const dayLogs = logs.filter((l) => l.date === d.iso);
    if (dayLogs.length === 0) return { ...d, avg: 0, count: 0 };
    const avg = dayLogs.reduce((sum, l) => sum + regulationScore(l.regulation_state), 0) / dayLogs.length;
    return { ...d, avg, count: dayLogs.length };
  });

  const totalLogs = logs.length;
  const fullCompletion = logs.filter((l) => l.completed_activity === 'total').length;
  const overloadCount = logs.filter((l) => l.regulation_state === 'sobrecarregado').length;

  const triggerCounts: Record<string, number> = {};
  logs.forEach((l) => {
    (l.sensory_notes || '').split(',').map((t) => t.trim()).filter(Boolean).forEach((t) => {
      triggerCounts[t] = (triggerCounts[t] || 0) + 1;
    });
  });
  const topTriggers = Object.entries(triggerCounts).sort((a, b) => b[1] - a[1]).slice(0, 4);

  const maxBar = 100;

  const handleExportPDF = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho do relatório - visível apenas na impressão */}
      <div className="hidden print:block pb-6 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Prisma" className="h-10 w-auto object-contain" />
            <div className="h-8 w-px bg-slate-300" />
            <div>
              <p className="text-sm font-bold text-slate-900">Relatório Semanal</p>
              <p className="text-xs text-slate-500">{formatDateBR(start)} a {formatDateBR(end)}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold text-slate-700">{profile?.full_name}</p>
            <p className="text-[10px] text-slate-400">Emitido em {new Date().toLocaleDateString('pt-BR')}</p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-lg">
              {patient.photo_emoji || '👶'}
            </div>
            <div>
              <p className="font-bold text-slate-900">{patient.full_name}</p>
              <p className="text-xs text-slate-500">
                {patient.school_name || 'Escola não informada'} • {patient.grade_level || 'Série não informada'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-100 p-6 shadow-sm space-y-1 print:shadow-none print:border-0 print:p-0">
        <h3 className="text-xl font-black text-slate-900">Evolução da semana</h3>
        <p className="text-xs text-slate-500">
          {formatDateBR(start)} a {formatDateBR(end)}
        </p>
      </div>

      {loading ? (
        <div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 text-indigo-500 animate-spin" /></div>
      ) : (
        <>
          <div className="bg-white rounded-[2rem] border border-slate-100 p-6 shadow-sm print:shadow-none print:border-0 print:p-0">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500 mb-4">Regulação sensorial média por dia</p>
            <div className="flex items-end justify-between gap-3 h-40">
              {dailyAverages.map((d) => {
                const heightPct = (d.avg / 5) * maxBar;
                const barColor = d.avg === 0 ? '#E2E8F0' : d.avg >= 4 ? '#10B981' : d.avg >= 2.5 ? '#F59E0B' : '#EF4444';
                return (
                  <div key={d.iso} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                    <div className="w-full rounded-t-xl transition-all" style={{ height: `${heightPct}%`, background: barColor, minHeight: d.count ? 8 : 2 }} />
                    <span className="text-[10px] font-bold text-slate-500">{d.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-2xl border border-slate-100 p-4 text-center shadow-sm print:border-0 print:shadow-none">
              <p className="text-2xl font-black text-slate-900">{totalLogs}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Registros</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 p-4 text-center shadow-sm print:border-0 print:shadow-none">
              <p className="text-2xl font-black text-emerald-600">{totalLogs ? Math.round((fullCompletion / totalLogs) * 100) : 0}%</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Realização total</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 p-4 text-center shadow-sm print:border-0 print:shadow-none">
              <p className="text-2xl font-black text-rose-500">{overloadCount}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Sobrecargas</p>
            </div>
          </div>

          {topTriggers.length > 0 && (
            <div className="bg-white rounded-[2rem] border border-slate-100 p-6 shadow-sm space-y-3 print:shadow-none print:border-0 print:p-0">
              <p className="text-xs font-black uppercase tracking-wide text-slate-500">Gatilhos mais frequentes</p>
              {topTriggers.map(([trigger, count]) => (
                <div key={trigger} className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-slate-700 w-40 truncate">{trigger}</span>
                  <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-400 rounded-full" style={{ width: `${(count / totalLogs) * 100}%` }} />
                  </div>
                  <span className="text-xs font-bold text-slate-500 w-5 text-right">{count}</span>
                </div>
              ))}
            </div>
          )}

          <button 
            onClick={handleExportPDF} 
            className="w-full py-3.5 rounded-2xl border border-slate-200 bg-white text-slate-700 font-bold text-xs flex items-center justify-center gap-2 hover:bg-slate-50 transition active:scale-[0.98] print:hidden"
          >
            <FileText className="w-4 h-4" /> Exportar relatório em PDF
          </button>
        </>
      )}
    </div>
  );
}