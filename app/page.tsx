'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  BookOpen, Sparkles, BarChart3, LogOut, CheckCircle2, 
  Clock, MessageSquarePlus, ChevronRight, UserPlus, KeyRound, 
  Users, Copy, Check, ArrowRight
} from 'lucide-react';

export default function PrismaApp() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Estados do Paciente
  const [patient, setPatient] = useState<any>(null);
  const [patientCodeInput, setPatientCodeInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [flowState, setFlowState] = useState<'SELECT_ROLE' | 'CONNECT_PATIENT' | 'CREATE_PATIENT' | 'APP'>('SELECT_ROLE');

  // Cadastro de Novo Paciente
  const [newPatientForm, setNewPatientForm] = useState({
    full_name: '',
    grade_level: '2º Ano Fundamental',
    school_name: '',
    support_level: 'Nível 1 (Leve)',
    photo_emoji: '👦🏻'
  });

  // Dados do App
  const [activeTab, setActiveTab] = useState<'grade' | 'dicas' | 'relatorios'>('grade');
  const [slots, setSlots] = useState<any[]>([]);
  const [dailyLogs, setDailyLogs] = useState<any[]>([]);
  const [guidelines, setGuidelines] = useState<any[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<any>(null);

  // Formulários de Registro e Diretrizes
  const [logForm, setLogForm] = useState({
    completed_activity: 'total',
    prompt_level: 'independente',
    regulation_state: 'regulado',
    sensory_notes: '',
    observations: ''
  });

  const [showTipModal, setShowTipModal] = useState(false);
  const [newTip, setNewTip] = useState({
    title: '',
    category: 'pedagogico',
    description: '',
    target_audience: 'todos'
  });

  useEffect(() => {
    checkSession();
  }, []);

  useEffect(() => {
    if (patient) {
      loadPatientData(patient.id);
    }
  }, [patient]);

  const checkSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setUser(session.user);
      await fetchUserProfile(session.user);
    }
    setLoading(false);
  };

  const fetchUserProfile = async (currentUser: any) => {
    const { data: prof } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', currentUser.id)
      .single();

    if (prof) {
      setProfile(prof);
      const { data: member } = await supabase
        .from('patient_members')
        .select('patient_id, patients(*)')
        .eq('profile_id', currentUser.id)
        .limit(1)
        .single();

      if (member?.patients) {
        setPatient(member.patients);
        setFlowState('APP');
        if (prof.role === 'terapeuta_clinico') setActiveTab('dicas');
        if (prof.role === 'pais') setActiveTab('relatorios');
      } else {
        setFlowState('CONNECT_PATIENT');
      }
    } else {
      setFlowState('SELECT_ROLE');
    }
  };

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    });
  };

  const handleSelectRole = async (role: string, specialty: string) => {
    if (!user) return;
    const newProf = {
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name || 'Usuário Prisma',
      avatar_url: user.user_metadata?.avatar_url,
      role,
      specialty
    };

    const { error } = await supabase.from('profiles').upsert(newProf);
    if (!error) {
      setProfile(newProf);
      setFlowState('CONNECT_PATIENT');
    }
  };

  const handleConnectByCode = async () => {
    if (!patientCodeInput.trim()) return;
    const cleanCode = patientCodeInput.trim().toUpperCase();

    const { data: foundPatient, error } = await supabase
      .from('patients')
      .select('*')
      .eq('code', cleanCode)
      .single();

    if (error || !foundPatient) {
      alert('Código não encontrado. Verifique com a família.');
      return;
    }

    await supabase.from('patient_members').upsert({
      patient_id: foundPatient.id,
      profile_id: user.id,
      role_in_patient: profile?.specialty || profile?.role
    });

    setPatient(foundPatient);
    setFlowState('APP');
  };

  const handleCreatePatient = async () => {
    if (!newPatientForm.full_name.trim()) return;

    const prefix = newPatientForm.full_name.slice(0, 3).toUpperCase();
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const generatedCode = `${prefix}-${randomNum}`;

    const { data: createdPatient, error } = await supabase
      .from('patients')
      .insert({
        code: generatedCode,
        full_name: newPatientForm.full_name,
        grade_level: newPatientForm.grade_level,
        school_name: newPatientForm.school_name,
        support_level: newPatientForm.support_level,
        photo_emoji: newPatientForm.photo_emoji,
        created_by: user.id
      })
      .select()
      .single();

    if (!error && createdPatient) {
      await supabase.from('patient_members').insert({
        patient_id: createdPatient.id,
        profile_id: user.id,
        role_in_patient: profile?.specialty || 'Responsável'
      });

      await createDefaultSchedule(createdPatient.id);

      setPatient(createdPatient);
      setFlowState('APP');
    }
  };

  const createDefaultSchedule = async (patientId: string) => {
    const defaultSlots = [
      { day_of_week: 1, start_time: '07:30', end_time: '08:20', subject: 'Acolhimento / Rotina', icon: '☀️' },
      { day_of_week: 1, start_time: '08:20', end_time: '09:10', subject: 'Português (Alfabetização)', icon: '📖' },
      { day_of_week: 1, start_time: '09:10', end_time: '09:30', subject: 'Lanche & Socialização', icon: '🥪' },
      { day_of_week: 1, start_time: '09:30', end_time: '10:20', subject: 'Matemática Estruturada', icon: '🔢' },
      { day_of_week: 1, start_time: '10:20', end_time: '11:10', subject: 'Educação Física / Movimento', icon: '⚽' },
      { day_of_week: 1, start_time: '11:10', end_time: '12:00', subject: 'Artes & Expressão', icon: '🎨' }
    ];

    const slotsToInsert = defaultSlots.map(s => ({ ...s, patient_id: patientId }));
    await supabase.from('schedule_slots').insert(slotsToInsert);
  };

  const loadPatientData = async (patientId: string) => {
    const todayIndex = new Date().getDay();
    const weekday = todayIndex === 0 || todayIndex === 6 ? 1 : todayIndex;

    const { data: slotsData } = await supabase
      .from('schedule_slots')
      .select('*')
      .eq('patient_id', patientId)
      .eq('day_of_week', weekday)
      .order('start_time', { ascending: true });

    if (slotsData) setSlots(slotsData);

    const todayStr = new Date().toISOString().split('T')[0];
    const { data: logsData } = await supabase
      .from('daily_logs')
      .select('*')
      .eq('patient_id', patientId)
      .eq('date', todayStr);

    if (logsData) setDailyLogs(logsData);

    const { data: tipsData } = await supabase
      .from('therapeutic_guidelines')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (tipsData) setGuidelines(tipsData);
  };

  const handleSaveLog = async () => {
    if (!selectedSlot || !user || !patient) return;
    const todayStr = new Date().toISOString().split('T')[0];

    const { error } = await supabase.from('daily_logs').insert({
      patient_id: patient.id,
      slot_id: selectedSlot.id,
      date: todayStr,
      subject_name: selectedSlot.subject,
      completed_activity: logForm.completed_activity,
      prompt_level: logForm.prompt_level,
      regulation_state: logForm.regulation_state,
      sensory_notes: logForm.sensory_notes,
      observations: logForm.observations,
      created_by: user.id
    });

    if (!error) {
      setSelectedSlot(null);
      setLogForm({
        completed_activity: 'total',
        prompt_level: 'independente',
        regulation_state: 'regulado',
        sensory_notes: '',
        observations: ''
      });
      loadPatientData(patient.id);
    }
  };

  const handleCreateTip = async () => {
    if (!user || !patient || !newTip.title) return;
    const { error } = await supabase.from('therapeutic_guidelines').insert({
      patient_id: patient.id,
      title: newTip.title,
      category: newTip.category,
      description: newTip.description,
      target_audience: newTip.target_audience,
      author_id: user.id,
      author_name: profile?.full_name || 'Terapeuta',
      author_role: profile?.specialty || 'Terapeuta ABA'
    });

    if (!error) {
      setShowTipModal(false);
      setNewTip({ title: '', category: 'pedagogico', description: '', target_audience: 'todos' });
      loadPatientData(patient.id);
    }
  };

  const copyPatientCode = () => {
    if (patient?.code) {
      navigator.clipboard.writeText(patient.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="font-bold text-slate-500 text-xs tracking-wider uppercase">Carregando Prisma...</p>
        </div>
      </div>
    );
  }

  // 1. TELA DE LOGIN (100% BRANCA COM LOGO PERSONALIZADO)
  if (!user) {
    return (
      <main className="min-h-screen bg-white flex flex-col justify-center items-center p-6 text-center">
        <div className="max-w-sm w-full space-y-6">
          
          {/* LOGO DO APP */}
          <div className="flex justify-center">
            {!logoError ? (
              <img 
                src="/logo.png" 
                alt="Prisma Logo" 
                onError={() => setLogoError(true)}
                className="w-36 h-auto object-contain drop-shadow-sm"
              />
            ) : (
              <div className="w-20 h-20 rounded-3xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-4xl shadow-sm">
                ✨
              </div>
            )}
          </div>

          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Prisma</h1>
            <p className="text-[11px] font-black uppercase tracking-widest text-indigo-600 mt-1">
              Conexão Escolar • Terapia ABA • Família
            </p>
            <p className="text-slate-500 text-xs mt-3 leading-relaxed">
              Plataforma unificada para registro de mediação escolar, hierarquia de dicas, autorregulação e acompanhamento terapêutico.
            </p>
          </div>

          <button
            onClick={handleGoogleLogin}
            className="w-full py-4 px-6 bg-white hover:bg-slate-50 border-2 border-slate-200 hover:border-slate-300 text-slate-700 font-bold rounded-2xl shadow-sm hover:shadow transition flex items-center justify-center gap-3 active:scale-[0.98]"
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

  // 2. SELEÇÃO DE PAPEL
  if (flowState === 'SELECT_ROLE') {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-sm border border-slate-100 p-6 sm:p-8">
          <h2 className="text-2xl font-black text-slate-900 text-center">Como você atua?</h2>
          <p className="text-slate-500 text-xs text-center mt-1 mb-6">Selecione seu papel na equipe do aluno:</p>

          <div className="space-y-3">
            <button
              onClick={() => handleSelectRole('at_escola', 'Acompanhante Terapêutico (AT)')}
              className="w-full p-4 rounded-2xl border-2 border-indigo-100 hover:border-indigo-500 bg-indigo-50/40 flex items-center gap-4 text-left transition active:scale-[0.98]"
            >
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-2xl shadow-sm shrink-0">🎒</div>
              <div>
                <div className="font-bold text-slate-800 text-sm">Acompanhante Terapêutico (AT)</div>
                <div className="text-xs text-slate-500">Registro de aulas, rotina e níveis de suporte</div>
              </div>
            </button>

            <button
              onClick={() => handleSelectRole('terapeuta_clinico', 'Terapeuta ABA / TO / Fono')}
              className="w-full p-4 rounded-2xl border-2 border-teal-100 hover:border-teal-500 bg-teal-50/40 flex items-center gap-4 text-left transition active:scale-[0.98]"
            >
              <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center text-2xl shadow-sm shrink-0">🩺</div>
              <div>
                <div className="font-bold text-slate-800 text-sm">Terapeuta Clínico (ABA / TO / Fono)</div>
                <div className="text-xs text-slate-500">Orientações de manejo e supervisão clínica</div>
              </div>
            </button>

            <button
              onClick={() => handleSelectRole('pais', 'Responsável')}
              className="w-full p-4 rounded-2xl border-2 border-amber-100 hover:border-amber-500 bg-amber-50/40 flex items-center gap-4 text-left transition active:scale-[0.98]"
            >
              <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center text-2xl shadow-sm shrink-0">🏡</div>
              <div>
                <div className="font-bold text-slate-800 text-sm">Pais / Responsáveis</div>
                <div className="text-xs text-slate-500">Acompanhamento diário e relatórios da evolução</div>
              </div>
            </button>

            <button
              onClick={() => handleSelectRole('professor', 'Professor(a) Regente')}
              className="w-full p-4 rounded-2xl border-2 border-pink-100 hover:border-pink-500 bg-pink-50/40 flex items-center gap-4 text-left transition active:scale-[0.98]"
            >
              <div className="w-12 h-12 rounded-2xl bg-pink-600 text-white flex items-center justify-center text-2xl shadow-sm shrink-0">👩🏻‍🏫</div>
              <div>
                <div className="font-bold text-slate-800 text-sm">Professor(a) / Escola</div>
                <div className="text-xs text-slate-500">Acesso a adaptações pedagógicas e rotina</div>
              </div>
            </button>
          </div>
        </div>
      </main>
    );
  }

  // 3. CONECTAR VIA CÓDIGO (COM LAYOUT MOBILE OTIMIZADO)
  if (flowState === 'CONNECT_PATIENT') {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-sm border border-slate-100 p-6 sm:p-8 space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-black text-slate-900">Acessar Aluno</h2>
            <p className="text-slate-500 text-xs mt-1">Conecte-se a uma criança existente ou cadastre um novo perfil.</p>
          </div>

          {/* CARD DE INSERIR CÓDIGO COM BOTÃO INTEGRADO */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
              <KeyRound className="w-4 h-4 text-indigo-600" />
              Tenho um Código de Acesso
            </div>
            
            <div className="space-y-2">
              <input
                type="text"
                placeholder="EX: ROD-8492"
                value={patientCodeInput}
                onChange={(e) => setPatientCodeInput(e.target.value.toUpperCase())}
                className="w-full p-3.5 rounded-xl border border-slate-300 bg-white font-mono font-black text-center text-base tracking-widest uppercase focus:outline-indigo-600 focus:border-indigo-600"
              />
              <button
                onClick={handleConnectByCode}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-bold text-sm rounded-xl transition flex items-center justify-center gap-2 shadow-sm"
              >
                <span>Conectar ao Aluno</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-200 w-full"></div>
            <span className="bg-white px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">ou</span>
          </div>

          <button
            onClick={() => setFlowState('CREATE_PATIENT')}
            className="w-full p-4 rounded-2xl border-2 border-dashed border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50/50 text-indigo-600 font-bold text-xs flex items-center justify-center gap-2 transition"
          >
            <UserPlus className="w-4 h-4" />
            Cadastrar Novo Aluno na Plataforma
          </button>
        </div>
      </main>
    );
  }

  // 4. CADASTRO DE NOVO PACIENTE
  if (flowState === 'CREATE_PATIENT') {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-sm border border-slate-100 p-6 sm:p-8 space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h2 className="text-xl font-black text-slate-900">Cadastrar Aluno</h2>
            <button onClick={() => setFlowState('CONNECT_PATIENT')} className="text-xs font-bold text-slate-400 hover:text-slate-600">Voltar</button>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Nome Completo do Aluno:</label>
            <input
              type="text"
              placeholder="Ex: Rodrigo Pedrosa"
              value={newPatientForm.full_name}
              onChange={(e) => setNewPatientForm({ ...newPatientForm, full_name: e.target.value })}
              className="w-full p-3 rounded-xl border border-slate-200 text-sm bg-slate-50"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Ano Escolar / Turma:</label>
            <input
              type="text"
              placeholder="Ex: 2º Ano Fundamental"
              value={newPatientForm.grade_level}
              onChange={(e) => setNewPatientForm({ ...newPatientForm, grade_level: e.target.value })}
              className="w-full p-3 rounded-xl border border-slate-200 text-sm bg-slate-50"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Escola:</label>
            <input
              type="text"
              placeholder="Ex: Escola Integrar"
              value={newPatientForm.school_name}
              onChange={(e) => setNewPatientForm({ ...newPatientForm, school_name: e.target.value })}
              className="w-full p-3 rounded-xl border border-slate-200 text-sm bg-slate-50"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Nível de Suporte (TEA):</label>
            <select
              value={newPatientForm.support_level}
              onChange={(e) => setNewPatientForm({ ...newPatientForm, support_level: e.target.value })}
              className="w-full p-3 rounded-xl border border-slate-200 text-sm bg-slate-50 font-medium"
            >
              <option value="Nível 1 (Leve)">Nível 1 (Apoio leve)</option>
              <option value="Nível 2 (Moderado)">Nível 2 (Apoio substancial)</option>
              <option value="Nível 3 (Substancial)">Nível 3 (Apoio muito substancial)</option>
            </select>
          </div>

          <button
            onClick={handleCreatePatient}
            className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-sm transition mt-2"
          >
            Gerar Código e Iniciar
          </button>
        </div>
      </main>
    );
  }

  // 5. PAINEL PRINCIPAL (PRISMA APP)
  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* HEADER PRINCIPAL */}
      <header className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 text-white p-4 sm:p-6 rounded-b-[2.5rem] shadow-lg">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 border border-white/40 flex items-center justify-center text-2xl shadow-inner">
              {patient?.photo_emoji || '👦🏻'}
            </div>
            <div>
              <h1 className="font-black text-lg sm:text-xl leading-tight">{patient?.full_name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <button
                  onClick={copyPatientCode}
                  className="bg-white/20 hover:bg-white/30 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition"
                  title="Clique para copiar o código"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-300" /> : <Copy className="w-3 h-3" />}
                  <span>Código: {patient?.code}</span>
                </button>
                <span className="text-[11px] text-indigo-100 hidden sm:inline">{patient?.grade_level}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => { setPatient(null); setFlowState('CONNECT_PATIENT'); }}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1 transition"
              title="Trocar Aluno"
            >
              <Users className="w-4 h-4" />
            </button>
            <button 
              onClick={() => supabase.auth.signOut().then(() => { setUser(null); setProfile(null); })}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1 transition"
              title="Sair"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* NAVEGAÇÃO DE ABAS */}
        <div className="max-w-4xl mx-auto flex gap-2 mt-6">
          <button
            onClick={() => setActiveTab('grade')}
            className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition ${
              activeTab === 'grade' ? 'bg-white text-indigo-700 shadow-md' : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Grade de Hoje
          </button>

          <button
            onClick={() => setActiveTab('dicas')}
            className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition ${
              activeTab === 'dicas' ? 'bg-white text-indigo-700 shadow-md' : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Mural ABA
          </button>

          <button
            onClick={() => setActiveTab('relatorios')}
            className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition ${
              activeTab === 'relatorios' ? 'bg-white text-indigo-700 shadow-md' : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Visão Geral / Pais
          </button>
        </div>
      </header>

      {/* CORPO PRINCIPAL */}
      <main className="max-w-4xl mx-auto p-4 sm:p-6">
        
        {/* ABA 1: GRADE ESCOLAR */}
        {activeTab === 'grade' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-900">Aulas do Dia</h2>
                <p className="text-xs text-slate-500">Toque na matéria para registrar nível de ajuda e regulação</p>
              </div>
              <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full">
                {dailyLogs.length} de {slots.length} registradas
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {slots.map((slot) => {
                const log = dailyLogs.find(l => l.slot_id === slot.id);
                return (
                  <div
                    key={slot.id}
                    onClick={() => setSelectedSlot(slot)}
                    className={`cursor-pointer p-4 rounded-2xl border-2 transition flex items-center justify-between ${
                      log 
                        ? 'border-emerald-300 bg-emerald-50/50' 
                        : 'border-slate-200 bg-white hover:border-indigo-400 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-2xl shadow-sm">
                        {slot.icon}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                        </div>
                        <h3 className="font-bold text-slate-800 text-base">{slot.subject}</h3>
                        {log && (
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-md">
                            {log.prompt_level === 'independente' ? '🌟 Independente' : log.prompt_level} • {log.regulation_state}
                          </span>
                        )}
                      </div>
                    </div>
                    {log ? <CheckCircle2 className="w-6 h-6 text-emerald-500" /> : <ChevronRight className="w-5 h-5 text-slate-300" />}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ABA 2: MURAL ABA */}
        {activeTab === 'dicas' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-900">Diretrizes Clínicas ABA</h2>
                <p className="text-xs text-slate-500">Manejo comportamental, regulação e reforço</p>
              </div>
              <button
                onClick={() => setShowTipModal(true)}
                className="py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition"
              >
                <MessageSquarePlus className="w-4 h-4" />
                Nova Diretriz
              </button>
            </div>

            <div className="space-y-3">
              {guidelines.map((tip) => (
                <div key={tip.id} className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700">
                      {tip.category}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">Por: {tip.author_name} ({tip.author_role})</span>
                  </div>
                  <h3 className="font-bold text-slate-800 text-base">{tip.title}</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">{tip.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ABA 3: PAINEL DOS PAIS */}
        {activeTab === 'relatorios' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-black text-slate-900">Resumo Diário da Rotina</h2>
              <p className="text-xs text-slate-500">Dados consolidados de autonomia e regulação</p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-white border border-indigo-100 text-center shadow-sm">
                <div className="text-2xl font-black text-indigo-600">{dailyLogs.length}</div>
                <div className="text-[11px] text-slate-500 font-medium mt-1">Aulas Registradas</div>
              </div>
              <div className="p-4 rounded-2xl bg-white border border-emerald-100 text-center shadow-sm">
                <div className="text-2xl font-black text-emerald-600">
                  {dailyLogs.filter(l => l.prompt_level === 'independente').length}
                </div>
                <div className="text-[11px] text-slate-500 font-medium mt-1">100% Autonomia</div>
              </div>
              <div className="p-4 rounded-2xl bg-white border border-amber-100 text-center shadow-sm">
                <div className="text-2xl font-black text-amber-500">
                  {dailyLogs.filter(l => l.regulation_state === 'regulado').length}
                </div>
                <div className="text-[11px] text-slate-500 font-medium mt-1">Autorregulado</div>
              </div>
            </div>

            {/* Linha do Tempo */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
              <h3 className="font-bold text-slate-800 text-sm">Linha do Tempo Escolar</h3>
              {dailyLogs.length === 0 ? (
                <p className="text-center py-6 text-xs text-slate-400">Nenhum registro lançado para o dia de hoje.</p>
              ) : (
                dailyLogs.map((log, i) => (
                  <div key={i} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs space-y-1.5">
                    <div className="flex justify-between font-bold text-slate-800">
                      <span>{log.subject_name}</span>
                      <span className="text-indigo-600 font-semibold">{log.prompt_level}</span>
                    </div>
                    {log.observations && <p className="text-slate-600">💬 <b>Obs:</b> {log.observations}</p>}
                    {log.sensory_notes && <p className="text-amber-700 bg-amber-50 p-2 rounded-lg">⚠️ <b>Atenção Sensorial:</b> {log.sensory_notes}</p>}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>

      {/* MODAL DO AT */}
      {selectedSlot && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-black text-slate-800 text-base">{selectedSlot.icon} {selectedSlot.subject}</h3>
              <button onClick={() => setSelectedSlot(null)} className="text-slate-400 font-bold hover:text-slate-600">✕</button>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Nível de Suporte (Prompt Hierarchy):</label>
              <select
                value={logForm.prompt_level}
                onChange={(e) => setLogForm({ ...logForm, prompt_level: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-slate-50 font-medium"
              >
                <option value="independente">🌟 Independente (Sem dicas)</option>
                <option value="dica_verbal">🗣️ Dica Verbal (Instrução/Lembrete)</option>
                <option value="gestual_visual">👉 Pista Visual / Apontar</option>
                <option value="ajuda_fisica_parcial">🤝 Ajuda Física Parcial (Guia de mão)</option>
                <option value="ajuda_fisica_total">🤲 Ajuda Física Total (Mão sobre mão)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Estado de Regulação Sensorial/Emocional:</label>
              <select
                value={logForm.regulation_state}
                onChange={(e) => setLogForm({ ...logForm, regulation_state: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-slate-50 font-medium"
              >
                <option value="regulado">😊 Regulado / Atento / Engajado</option>
                <option value="alerta">👀 Alerta / Hiperfocado</option>
                <option value="agitado">⚡ Agitado / Inquieto</option>
                <option value="hipoativo">😴 Hipoativo / Desatento</option>
                <option value="sobrecarregado">⚠️ Sobrecarga Sensorial / Desregulado</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Gatilhos / Antecedentes Sensoriais:</label>
              <input
                type="text"
                placeholder="Ex: Barulho intenso no recreio, iluminação forte..."
                value={logForm.sensory_notes}
                onChange={(e) => setLogForm({ ...logForm, sensory_notes: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-slate-50"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Observações do AT (Manejo e Reforçadores):</label>
              <textarea
                rows={2}
                placeholder="Adaptações feitas, reforço positivo utilizado, interação com os colegas..."
                value={logForm.observations}
                onChange={(e) => setLogForm({ ...logForm, observations: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-slate-50"
              />
            </div>

            <button
              onClick={handleSaveLog}
              className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition"
            >
              Salvar Registro da Aula
            </button>
          </div>
        </div>
      )}

      {/* MODAL TERAPEUTAS */}
      {showTipModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-black text-slate-800 text-base">Nova Estratégia Clínica ABA</h3>
              <button onClick={() => setShowTipModal(false)} className="text-slate-400 font-bold hover:text-slate-600">✕</button>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Título da Orientação:</label>
              <input
                type="text"
                placeholder="Ex: Manejo para transição entre sala e quadra"
                value={newTip.title}
                onChange={(e) => setNewTip({ ...newTip, title: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-slate-50"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Categoria:</label>
              <select
                value={newTip.category}
                onChange={(e) => setNewTip({ ...newTip, category: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-slate-50 font-medium"
              >
                <option value="pedagogico">Pedagógico & Adaptação Curricular</option>
                <option value="sensorial">Sensorial & Acomodações</option>
                <option value="comportamental">Comportamental & Manejo ABA</option>
                <option value="comunicacao">Comunicação / Fonoaudiologia</option>
                <option value="social">Habilidades Sociais com Pares</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Instrução Prática / Passo a Passo:</label>
              <textarea
                rows={4}
                placeholder="Descreva exatamente como o AT e o professor devem agir..."
                value={newTip.description}
                onChange={(e) => setNewTip({ ...newTip, description: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-slate-50"
              />
            </div>

            <button
              onClick={handleCreateTip}
              className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition"
            >
              Publicar Diretriz
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
