'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  Star, FileText, X, Check, ArrowLeft, 
  LogOut, ChevronRight, UserCheck
} from 'lucide-react';

// Interfaces
interface ScheduleSlot {
  id: string;
  order: string;
  time: string;
  subject: string;
  iconType: 'math' | 'portugues' | 'pe' | 'snack' | 'science' | 'art';
}

interface DailyLog {
  id: string;
  slot_id: string;
  subject: string;
  day_text: string;
  date_formatted: string;
  completed: 'Sim' | 'Parcialmente' | 'Não';
  engagement: number;
  regulation: 'Regulado' | 'Desatento' | 'Agitado' | 'Sobrecarga';
  triggers: string[];
  notes: string;
  author_name: string;
  author_role: string;
}

// Grade de Aulas Padrão
const DEFAULT_SLOTS: ScheduleSlot[] = [
  { id: '1', order: '1ª AULA', time: '08:00', subject: 'Matemática', iconType: 'math' },
  { id: '2', order: '2ª AULA', time: '08:50', subject: 'Português', iconType: 'portugues' },
  { id: '3', order: '3ª AULA', time: '09:40', subject: 'Educação Física', iconType: 'pe' },
  { id: '4', order: '4ª AULA', time: '10:30', subject: 'Lanche & Socialização', iconType: 'snack' },
  { id: '5', order: '5ª AULA', time: '11:00', subject: 'Ciências', iconType: 'science' },
  { id: '6', order: '6ª AULA', time: '11:50', subject: 'Artes Visuais', iconType: 'art' },
];

// Histórico Inicial de Exemplo
const INITIAL_LOGS: DailyLog[] = [
  {
    id: 'log-1',
    slot_id: '2',
    subject: 'Português',
    day_text: 'Terça',
    date_formatted: '18/08/2026',
    completed: 'Sim',
    engagement: 5,
    regulation: 'Regulado',
    triggers: [],
    notes: 'Participou ativamente da leitura em voz alta. Ótimo foco!',
    author_name: 'Mariana',
    author_role: 'Acompanhante Terapêutica'
  },
  {
    id: 'log-2',
    slot_id: '5',
    subject: 'Ciências',
    day_text: 'Terça',
    date_formatted: '18/08/2026',
    completed: 'Parcialmente',
    engagement: 3,
    regulation: 'Desatento',
    triggers: ['Barulho alto', 'Cansaço'],
    notes: 'Houve ruído na reforma do pátio. Precisamos fazer uma pausa de 3min no cantinho calmo.',
    author_name: 'Mariana',
    author_role: 'Acompanhante Terapêutica'
  }
];

export default function PrismaApp() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentRole, setCurrentRole] = useState<'none' | 'at' | 'pais' | 'terapeuta'>('none');
  
  const [slots] = useState<ScheduleSlot[]>(DEFAULT_SLOTS);
  const [logs, setLogs] = useState<DailyLog[]>(INITIAL_LOGS);
  const [selectedSlotForModal, setSelectedSlotForModal] = useState<ScheduleSlot | null>(null);

  // Estado do Formulário do AT (Modal)
  const [formData, setFormData] = useState({
    completed: 'Sim' as 'Sim' | 'Parcialmente' | 'Não',
    engagement: 5,
    regulation: 'Regulado' as 'Regulado' | 'Desatento' | 'Agitado' | 'Sobrecarga',
    triggers: [] as string[],
    notes: ''
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setCurrentRole('none');
  };

  const toggleTrigger = (triggerName: string) => {
    setFormData((prev) => ({
      ...prev,
      triggers: prev.triggers.includes(triggerName)
        ? prev.triggers.filter((t) => t !== triggerName)
        : [...prev.triggers, triggerName]
    }));
  };

  const handleOpenModal = (slot: ScheduleSlot) => {
    const existingLog = logs.find((l) => l.slot_id === slot.id);
    if (existingLog) {
      setFormData({
        completed: existingLog.completed,
        engagement: existingLog.engagement,
        regulation: existingLog.regulation,
        triggers: existingLog.triggers || [],
        notes: existingLog.notes || ''
      });
    } else {
      setFormData({
        completed: 'Sim',
        engagement: 5,
        regulation: 'Regulado',
        triggers: [],
        notes: ''
      });
    }
    setSelectedSlotForModal(slot);
  };

  const handleSaveLog = () => {
    if (!selectedSlotForModal) return;

    const newLogEntry: DailyLog = {
      id: `log-${Date.now()}`,
      slot_id: selectedSlotForModal.id,
      subject: selectedSlotForModal.subject,
      day_text: 'Hoje',
      date_formatted: new Date().toLocaleDateString('pt-BR'),
      completed: formData.completed,
      engagement: formData.engagement,
      regulation: formData.regulation,
      triggers: formData.triggers,
      notes: formData.notes,
      author_name: user?.user_metadata?.full_name?.split(' ')[0] || 'Mariana',
      author_role: 'Acompanhante Terapêutica'
    };

    setLogs((prev) => [newLogEntry, ...prev.filter((l) => l.slot_id !== selectedSlotForModal.id)]);
    setSelectedSlotForModal(null);
  };

  const getSlotIcon = (type: string) => {
    switch (type) {
      case 'math':
        return (
          <div className="w-12 h-12 rounded-2xl bg-blue-100 border border-blue-200 flex items-center justify-center text-xl font-bold text-blue-600">
            🔢
          </div>
        );
      case 'portugues':
        return (
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-xl font-bold text-emerald-600">
            📚
          </div>
        );
      case 'pe':
        return (
          <div className="w-12 h-12 rounded-2xl bg-amber-100 border border-amber-200 flex items-center justify-center text-xl font-bold text-amber-600">
            ⚽
          </div>
        );
      case 'snack':
        return (
          <div className="w-12 h-12 rounded-2xl bg-orange-100 border border-orange-200 flex items-center justify-center text-xl font-bold text-orange-600">
            🥪
          </div>
        );
      case 'science':
        return (
          <div className="w-12 h-12 rounded-2xl bg-teal-100 border border-teal-200 flex items-center justify-center text-xl font-bold text-teal-600">
            🌱
          </div>
        );
      default:
        return (
          <div className="w-12 h-12 rounded-2xl bg-purple-100 border border-purple-200 flex items-center justify-center text-xl font-bold text-purple-600">
            🎨
          </div>
        );
    }
  };

  const getRegulationBadge = (reg: string) => {
    switch (reg) {
      case 'Regulado':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-slate-200 bg-white text-xs font-bold text-slate-800 shadow-sm">
            Regulado <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          </span>
        );
      case 'Desatento':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-slate-200 bg-white text-xs font-bold text-slate-800 shadow-sm">
            Desatento <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
          </span>
        );
      case 'Agitado':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-slate-200 bg-white text-xs font-bold text-slate-800 shadow-sm">
            Agitado <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-slate-200 bg-white text-xs font-bold text-slate-800 shadow-sm">
            Sobrecarga <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // =========================================================================
  // 1. TELA DE LOGIN (100% BRANCA COM LOGO AMPLIADO E SEM O TEXTO DUPLICADO)
  // =========================================================================
  if (!user) {
    return (
      <main className="min-h-screen bg-white flex flex-col justify-center items-center px-6 py-10 text-center">
        <div className="max-w-md w-full flex flex-col items-center">
          
          {/* Logo Ampliado e Integrado */}
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
              Plataforma unificada para registro de mediação escolar e acompanhamento terapêutico.
            </p>
          </div>

          <button
            onClick={handleGoogleLogin}
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

  // =========================================================================
  // 2. TELA DE SELEÇÃO DE PAPEL / ACESSO DO USUÁRIO (Fiel à Imagem 15)
  // =========================================================================
  if (currentRole === 'none') {
    return (
      <main className="min-h-screen bg-[#F4F7FB] flex flex-col justify-between items-center p-4 sm:p-6">
        {/* Botão Sair no Topo */}
        <div className="w-full max-w-md flex justify-end">
          <button
            onClick={handleSignOut}
            className="text-xs font-bold text-slate-500 hover:text-red-600 flex items-center gap-1.5 py-1.5 px-3 rounded-lg hover:bg-slate-200/50 transition"
          >
            <LogOut className="w-4 h-4" />
            <span>Sair da conta</span>
          </button>
        </div>

        {/* Card Central */}
        <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-xl p-6 sm:p-8 space-y-6 border border-slate-100 my-auto">
          
          {/* Avatar com Aro Azul e Badge "7 anos" */}
          <div className="flex flex-col items-center">
            <div className="relative w-24 h-24 rounded-full border-4 border-blue-400 p-1 bg-white shadow-sm flex items-center justify-center">
              <span className="text-5xl">👦🏻</span>
              <span className="absolute -bottom-2 bg-[#10B981] text-white text-[11px] font-black px-2.5 py-0.5 rounded-full shadow-sm">
                7 anos
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-4 tracking-tight">
              Rodrigo Pedrosa
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm text-center mt-1 leading-snug">
              Sistema Integrado de Acompanhamento Terapêutico Escolar
            </p>
          </div>

          {/* Banner de Acesso */}
          <div className="bg-[#EDF5FD] border border-[#D0E6FC] rounded-2xl py-3 px-4 text-center">
            <p className="text-[11px] font-black tracking-wider uppercase text-[#0284C7]">
              ACESSO DO USUÁRIO
            </p>
            <p className="text-slate-700 text-xs font-semibold mt-0.5">
              Quem está acessando o sistema hoje?
            </p>
          </div>

          {/* Os 3 Botões de Papel */}
          <div className="space-y-3">
            {/* Opção 1: AT */}
            <button
              onClick={() => setCurrentRole('at')}
              className="w-full p-4 rounded-2xl border border-indigo-100 bg-[#F5F5FE] hover:bg-[#ECECFE] transition flex items-center gap-4 text-left active:scale-[0.98]"
            >
              <div className="w-12 h-12 rounded-2xl bg-[#4F46E5] text-white flex items-center justify-center text-2xl shadow-sm shrink-0">
                🎒
              </div>
              <div>
                <div className="font-black text-slate-800 text-sm sm:text-base">
                  Acompanhante Terapêutico (AT)
                </div>
                <div className="text-xs text-slate-500">
                  Acompanhamento presencial e registro de aulas
                </div>
              </div>
            </button>

            {/* Opção 2: Pais */}
            <button
              onClick={() => setCurrentRole('pais')}
              className="w-full p-4 rounded-2xl border border-amber-200 bg-[#FEFBF2] hover:bg-[#FDF6E3] transition flex items-center gap-4 text-left active:scale-[0.98]"
            >
              <div className="w-12 h-12 rounded-2xl bg-[#F59E0B] text-white flex items-center justify-center text-2xl shadow-sm shrink-0">
                🏡
              </div>
              <div>
                <div className="font-black text-slate-800 text-sm sm:text-base">
                  Pais / Responsáveis
                </div>
                <div className="text-xs text-slate-500">
                  Visualizar relatórios, relatórios semanais e gráficos
                </div>
              </div>
            </button>

            {/* Opção 3: Terapeuta */}
            <button
              onClick={() => setCurrentRole('terapeuta')}
              className="w-full p-4 rounded-2xl border border-emerald-200 bg-[#F0FDF4] hover:bg-[#DCFCE7] transition flex items-center gap-4 text-left active:scale-[0.98]"
            >
              <div className="w-12 h-12 rounded-2xl bg-[#10B981] text-white flex items-center justify-center text-2xl shadow-sm shrink-0">
                🩺
              </div>
              <div>
                <div className="font-black text-slate-800 text-sm sm:text-base">
                  Terapeuta Clínico
                </div>
                <div className="text-xs text-slate-500">
                  Análise de dados e criação de dicas práticas
                </div>
              </div>
            </button>
          </div>
        </div>

        <div className="h-4"></div>
      </main>
    );
  }

  // =========================================================================
  // 3A. VISÃO DO AT: GRADE DE AULAS (Fiel à Imagem 16)
  // =========================================================================
  if (currentRole === 'at') {
    return (
      <div className="min-h-screen bg-[#F4F7FB] pb-12">
        {/* Cabeçalho */}
        <header className="bg-white border-b border-slate-100 p-4 sticky top-0 z-10 shadow-sm">
          <div className="max-w-xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full border-2 border-blue-400 p-0.5 bg-white flex items-center justify-center text-2xl shadow-sm">
                👦🏻
              </div>
              <div>
                <h2 className="font-black text-slate-900 text-base leading-tight">Rodrigo Pedrosa</h2>
                <p className="text-[11px] text-slate-400 font-medium">7 anos • 2º Ano Ensino Fundamental</p>
              </div>
            </div>

            <button
              onClick={() => setCurrentRole('none')}
              className="py-1.5 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition active:scale-95"
            >
              Trocar Perfil
            </button>
          </div>
        </header>

        {/* Lista de Aulas */}
        <main className="max-w-xl mx-auto p-4 sm:p-6 space-y-4">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-sm font-black text-slate-700 uppercase tracking-wide">
              Rotina Escolar de Hoje
            </h3>
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
              {logs.length} de {slots.length} preenchidas
            </span>
          </div>

          {slots.map((slot) => {
            const hasLog = logs.find((l) => l.slot_id === slot.id);
            return (
              <div
                key={slot.id}
                className="bg-white rounded-[2rem] border border-slate-100 p-5 sm:p-6 shadow-sm space-y-4"
              >
                {/* Topo do Card */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 tracking-wider">
                    {slot.order} ({slot.time})
                  </span>

                  {hasLog ? (
                    <span className="bg-[#D1FAE5] text-[#065F46] text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Concluído
                    </span>
                  ) : (
                    <span className="bg-[#FEF3C7] text-[#92400E] text-xs font-bold px-3 py-1 rounded-full">
                      Pendente
                    </span>
                  )}
                </div>

                {/* Nome e Ícone */}
                <div className="flex items-center gap-3.5">
                  {getSlotIcon(slot.iconType)}
                  <div>
                    <h4 className="text-lg font-black text-slate-900 leading-tight">
                      {slot.subject}
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Clique para abrir o formulário rápido
                    </p>
                  </div>
                </div>

                {/* Botão de Registro */}
                <button
                  onClick={() => handleOpenModal(slot)}
                  className={`w-full py-3.5 rounded-2xl font-bold text-sm text-center transition active:scale-[0.98] shadow-sm ${
                    hasLog
                      ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200'
                      : 'bg-[#4F46E5] hover:bg-[#4338CA] text-white shadow-indigo-200'
                  }`}
                >
                  {hasLog ? 'Ver / Editar Registro' : 'Registrar Acompanhamento'}
                </button>
              </div>
            );
          })}
        </main>

        {/* =================================================================== */}
        {/* MODAL DO AT: REGISTRO DA AULA (Fiel à Imagem 14) */}
        {/* =================================================================== */}
        {selectedSlotForModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
            <div className="bg-white w-full max-w-lg rounded-t-[2.5rem] sm:rounded-[2.5rem] p-6 sm:p-8 space-y-5 max-h-[90vh] overflow-y-auto shadow-2xl animate-in slide-in-from-bottom">
              
              {/* Header do Modal */}
              <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                <div>
                  <span className="text-xs font-black tracking-wider text-[#4F46E5] uppercase">
                    {selectedSlotForModal.order} ({selectedSlotForModal.time})
                  </span>
                  <h3 className="text-2xl font-black text-slate-900 mt-0.5">
                    {selectedSlotForModal.subject}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedSlotForModal(null)}
                  className="w-9 h-9 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center text-slate-500 font-bold transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Realização das Atividades */}
              <div>
                <label className="text-xs font-black tracking-wider uppercase text-slate-700 block mb-2">
                  CONSEGUIU REALIZAR AS ATIVIDADES?
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Sim', 'Parcialmente', 'Não'] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setFormData({ ...formData, completed: opt })}
                      className={`py-3 rounded-2xl font-bold text-xs transition border ${
                        formData.completed === opt
                          ? 'bg-[#4F46E5] text-white border-[#4F46E5] shadow-sm'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nível de Engajamento */}
              <div>
                <label className="text-xs font-black tracking-wider uppercase text-slate-700 block mb-2">
                  NÍVEL DE ENGAJAMENTO / FOCO (1 A 5)
                </label>
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex justify-around items-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setFormData({ ...formData, engagement: star })}
                      className="p-1 transition transform active:scale-125"
                    >
                      <Star
                        className={`w-7 h-7 ${
                          star <= formData.engagement
                            ? 'text-[#F59E0B] fill-[#F59E0B]'
                            : 'text-slate-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Estado Sensorial */}
              <div>
                <label className="text-xs font-black tracking-wider uppercase text-slate-700 block mb-2">
                  ESTADO DE REGULAÇÃO SENSORIAL
                </label>
                <select
                  value={formData.regulation}
                  onChange={(e) => setFormData({ ...formData, regulation: e.target.value as any })}
                  className="w-full p-3.5 rounded-2xl border border-slate-200 bg-white font-bold text-xs text-slate-800 focus:outline-indigo-600 shadow-sm"
                >
                  <option value="Regulado">Regulado 🟢 (Calmo e receptivo)</option>
                  <option value="Desatento">Desatento 🟡 (Disperso ou sonolento)</option>
                  <option value="Agitado">Agitado ⚡ (Inquieto ou hiperativo)</option>
                  <option value="Sobrecarga">Sobrecarga 🔴 (Em crise ou desregulado)</option>
                </select>
              </div>

              {/* Gatilhos Observados */}
              <div>
                <label className="text-xs font-black tracking-wider uppercase text-slate-700 block mb-2">
                  GATILHOS OBSERVADOS (OPCIONAL)
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    'Barulho alto',
                    'Mudança de rotina',
                    'Esforço motor/escrita',
                    'Transição de aula',
                    'Cansaço',
                    'Luz forte',
                    'Frustração'
                  ].map((trigger) => {
                    const isSelected = formData.triggers.includes(trigger);
                    return (
                      <button
                        key={trigger}
                        type="button"
                        onClick={() => toggleTrigger(trigger)}
                        className={`py-2 px-3.5 rounded-full text-xs font-semibold transition border ${
                          isSelected
                            ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-bold'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {trigger}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Observações */}
              <div>
                <label className="text-xs font-black tracking-wider uppercase text-slate-700 block mb-2">
                  OBSERVAÇÕES ADICIONAIS
                </label>
                <textarea
                  rows={3}
                  placeholder="Ex: Utilizou o suporte visual para finalizar a página 12..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full p-3.5 rounded-2xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:outline-indigo-600 transition"
                />
              </div>

              {/* Salvar */}
              <button
                onClick={handleSaveLog}
                className="w-full py-4 bg-[#4F46E5] hover:bg-[#4338CA] text-white font-bold text-sm rounded-2xl shadow-md transition active:scale-[0.98]"
              >
                Salvar Acompanhamento da Aula
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // 3B. VISÃO DOS PAIS E TERAPEUTAS: HISTÓRICO (Fiel à Imagem 13)
  // =========================================================================
  return (
    <div className="min-h-screen bg-[#F4F7FB] pb-12">
      {/* Cabeçalho */}
      <header className="bg-white border-b border-slate-100 p-4 sticky top-0 z-10 shadow-sm">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full border-2 border-blue-400 p-0.5 bg-white flex items-center justify-center text-2xl shadow-sm">
              👦🏻
            </div>
            <div>
              <h2 className="font-black text-slate-900 text-base leading-tight">Rodrigo Pedrosa</h2>
              <p className="text-[11px] text-slate-400 font-medium">7 anos • 2º Ano Ensino Fundamental</p>
            </div>
          </div>

          <button
            onClick={() => setCurrentRole('none')}
            className="py-1.5 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition active:scale-95"
          >
            Trocar Perfil
          </button>
        </div>
      </header>

      {/* Conteúdo do Histórico */}
      <main className="max-w-xl mx-auto p-4 sm:p-6 space-y-6">
        
        {/* Título + Exportar PDF */}
        <div className="bg-white rounded-[2rem] border border-slate-100 p-6 shadow-sm flex items-center justify-between">
          <div>
            <h3 className="text-xl font-black text-slate-900 leading-tight">
              Histórico de<br />Acompanhamento
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Anotações detalhadas feitas pelo Acompanhante Terapêutico
            </p>
          </div>

          <button
            onClick={() => window.print()}
            className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-700 transition active:scale-95 shrink-0"
          >
            <span className="text-xl mb-0.5">📄</span>
            <span className="text-[10px] font-black uppercase tracking-wider">Exportar<br />PDF</span>
          </button>
        </div>

        {/* Cards do Histórico */}
        <div className="space-y-4">
          {logs.map((log) => (
            <div
              key={log.id}
              className="bg-white rounded-[2rem] border border-slate-100 p-6 shadow-sm space-y-4"
            >
              {/* Linha Superior */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-baseline gap-1.5">
                  <h4 className="text-base font-black text-slate-900">{log.subject}</h4>
                  <span className="text-xs text-slate-400 font-medium">
                    • {log.day_text} ({log.date_formatted})
                  </span>
                </div>

                {getRegulationBadge(log.regulation)}
              </div>

              {/* Anotação em Aspas */}
              {log.notes && (
                <p className="text-slate-800 text-sm font-medium leading-relaxed italic bg-slate-50/70 p-3.5 rounded-2xl border border-slate-100">
                  "{log.notes}"
                </p>
              )}

              {/* Gatilhos */}
              {log.triggers && log.triggers.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Gatilhos:</span>
                  {log.triggers.map((tr) => (
                    <span key={tr} className="text-[11px] bg-amber-50 text-amber-800 font-semibold px-2 py-0.5 rounded-md">
                      ⚠️ {tr}
                    </span>
                  ))}
                </div>
              )}

              {/* Conclusão e Estrelas de Engajamento */}
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 pt-1">
                <span>Conseguiu fazer exercícios: <b>{log.completed}</b></span>
                <span>|</span>
                <span className="flex items-center gap-1">
                  Engajamento:
                  <span className="inline-flex text-[#F59E0B]">
                    {Array.from({ length: log.engagement }).map((_, i) => (
                      <span key={i}>⭐</span>
                    ))}
                  </span>
                </span>
              </div>

              {/* Rodapé com Autor */}
              <div className="text-xs text-slate-400 italic pt-1">
                Por: {log.author_name} ({log.author_role})
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}