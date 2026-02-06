import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle, AlertTriangle, MinusCircle, ChevronRight, ChevronLeft, Save, BrainCircuit, RotateCcw, Settings, HardHat, Calendar } from 'lucide-react';

// --- TYPES & ENUMS ---
export type TaskStatus = 'CUMPLIDO' | 'NO_APLICA' | 'DESVIACION';
export type OperationType = 'PERFORACION' | 'WORKOVER';

export interface Task {
  id: string;
  label: string;
  status?: TaskStatus;
  note?: string;
}

export interface Block {
  id: BlockId;
  title: string;
  tasks: Task[];
}

export interface ShiftData {
  wellName: string;
  rig: string;
  companyMan: string;
  date: string;
  blocks: Block[];
  criticalDecisions: string;
  avoidedRisks: string;
  nextShiftAlerts: string;
  isClosed: boolean;
  score: number;
  aiSummary?: string;
  operationType: OperationType;
}

export type BlockId =
  | 'PRE_SHIFT'
  | 'OPERATION'
  | 'TECHNICAL'
  | 'LEADERSHIP'
  | 'CLOSURE';

  export const BlockId = {
    PRE_SHIFT: 'PRE_SHIFT',
    OPERATION: 'OPERATION',
    TECHNICAL: 'TECHNICAL',
    LEADERSHIP: 'LEADERSHIP',
    CLOSURE: 'CLOSURE',
  };

// --- CONSTANTS ---
export const INITIAL_BLOCKS: Block[] = [
  {
    id: BlockId.PRE_SHIFT,
    title: "Bloque 1: Antes del Turno (Riesgo)",
    tasks: [
      { id: "1.1", label: "Charla pre-operacional con foco en peligros del día" },
      { id: "1.2", label: "Validación de permisos de trabajo (PT) críticos" },
      { id: "1.3", label: "Inspección de condiciones de terreno y clima" },
      { id: "1.4", label: "Disponibilidad y estado de EPP específicos" },
      { id: "1.5", label: "Simulacro o validación de rutas de emergencia" }
    ]
  },
  {
    id: BlockId.OPERATION,
    title: "Bloque 2: Durante la Operación (Presencia)",
    tasks: [
      { id: "2.1", label: "Supervisión directa en maniobras críticas/izajes" },
      { id: "2.2", label: "Monitoreo de parámetros (bombeo, RPM, peso)" },
      { id: "2.3", label: "Inspección visual periódica de equipos activos" },
      { id: "2.4", label: "Control de niveles de tanques y fluidos" },
      { id: "2.5", label: "Verificación de cumplimiento de tiempos operativos" }
    ]
  },
  {
    id: BlockId.TECHNICAL,
    title: "Bloque 3: Técnica del Pozo (No Negociables)",
    tasks: [
      { id: "3.1", label: "Integridad de barreras mecánicas y de presión" },
      { id: "3.2", label: "Control de presiones en anular y cabezal" },
      { id: "3.3", label: "Alineación de válvulas y manifolds de superficie" },
      { id: "3.4", label: "Validación de profundidades y pesos de sarta" },
      { id: "3.5", label: "Check de herramientas de fondo (BHA/WL)" }
    ]
  },
  {
    id: BlockId.LEADERSHIP,
    title: "Bloque 4: Personas y Decisiones (Liderazgo)",
    tasks: [
      { id: "4.1", label: "Confirmación de competencias críticas del personal" },
      { id: "4.2", label: "Gestión de cambios (MOC) ante imprevistos" },
      { id: "4.3", label: "Reunión de coordinación de mediodía (Toolbox)" },
      { id: "4.4", label: "Control de ingreso de visitas y terceros" },
      { id: "4.5", label: "Feedback correctivo de seguridad en el sitio" }
    ]
  },
  {
    id: BlockId.CLOSURE,
    title: "Bloque 5: Cierre del Turno (Evidencia)",
    tasks: [
      { id: "5.1", label: "Registro exacto de tiempos no productivos (NPT)" },
      { id: "5.2", label: "Reporte de incidentes o cuasi-accidentes" },
      { id: "5.3", label: "Conciliación de insumos y consumibles usados" },
      { id: "5.4", label: "Actualización de notas de entrega (Handover)" },
      { id: "5.5", label: "Identificación de lecciones aprendidas del día" }
    ]
  }
];

// --- SERVICES ---
export const generateShiftSummary = async (data: ShiftData): Promise<string> => {
  // ---------------------------------------------------------
  // 1. PEGA AQUÍ LA LLAVE NUEVA (la que termina en ...0HTE)
  // ---------------------------------------------------------
   
  const opLogic = data.operationType === 'PERFORACION' 
    ? "TIPO DE OPERACIÓN: PERFORACIÓN. Se permite incluir parámetros de taladro (RPM, Torque, ROP, Presiones de lodo) ÚNICAMENTE si están detallados en las notas del usuario."
    : "TIPO DE OPERACIÓN: WORKOVER. PROHIBIDO terminantemente mencionar RPM, Torque o ROP. El resumen debe centrarse en: velocidad de viaje, tensión (overpull), asentamiento de herramientas, pruebas de integridad y completamiento.";

  const displayDate = data.date.split('-').reverse().join('/');

  const prompt = `
    Actúa como un arquitecto senior de operaciones de Tecpetrol. 
    Tu tarea es generar el "Reporte Ejecutivo - ${data.wellName}".
    
    IDENTIFICACIÓN DEL REPORTE (USA ESTOS DATOS EXACTOS):
    - Nombre del Pozo: ${data.wellName}
    - Equipo/Rig: ${data.rig}
    - Company Man Responsable: ${data.companyMan}
    - Fecha Operativa: ${displayDate}
    - Gestión de Seguridad (Score): ${data.score}%
    
    LÓGICA DE NEGOCIO:
    ${opLogic}
    
    REGLAS ESTRICTAS DE CONTENIDO:
    1. PROHIBIDO ALUCINAR: No inventes nombres de pozos, equipos o parámetros técnicos que no estén en el input.
    2. Si el usuario no registró notas técnicas, el resumen debe ser exclusivamente sobre el cumplimiento de los bloques de seguridad.
    3. Identifica desviaciones (fallas) y resalta las decisiones críticas del día.
    4. Estilo: Corporativo, sobrio, técnico y de alta gerencia.
    
    CONTENIDO DEL CHECKLIST (DATOS REALES):
    ${data.blocks.map(b => `- ${b.title}: ${b.tasks.map(t => `${t.label} [${t.status || 'SIN REGISTRO'}] ${t.note ? `(Nota técnica: ${t.note})` : ''}`).join(', ')}`).join('\n')}
    
    NOTAS DE CAMPO:
    - Decisiones Tomadas: ${data.criticalDecisions || 'No se registraron decisiones extraordinarias'}
    - Riesgos Mitigados: ${data.avoidedRisks || 'No se reportaron riesgos evitados'}
    - Alertas para el siguiente turno: ${data.nextShiftAlerts || 'Sin alertas pendientes'}
    
    Formato de salida: Markdown estructurado, tono profesional de Tecpetrol, máximo 180 palabras.
  `;

  try {
    const resp = await fetch("/api/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
  
    const raw = await resp.text();

    let json: any = null;
    try {
      json = raw ? JSON.parse(raw) : null;
    } catch {
      // no era JSON
    }
    
    if (!resp.ok) {
      return "ERROR DE CONEXIÓN: " + (json?.error ? JSON.stringify(json.error) : raw || `HTTP ${resp.status}`);
    }
    
    return json?.text || raw || "ERROR: Respuesta vacía del servidor.";   
  
    if (!resp.ok) {
      return "ERROR DE CONEXIÓN: " + (json?.error ? JSON.stringify(json.error) : JSON.stringify(json));
    }
  
    return json?.text || "ERROR: Respuesta vacía del modelo.";
  } catch (error: any) {
    return "ERROR DE CONEXIÓN: " + (error?.message || String(error));
  }
};

// --- MAIN COMPONENT ---
const App: React.FC = () => {
  const [activeBlockIndex, setActiveBlockIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showSetup, setShowSetup] = useState(false);

  const [shiftData, setShiftData] = useState<ShiftData>(() => {
    const saved = localStorage.getItem('current_shift');
    if (saved) return JSON.parse(saved);
    
    const today = new Date().toISOString().split('T')[0];
    
    return {
      wellName: '',
      rig: '',
      companyMan: '',
      date: today,
      blocks: INITIAL_BLOCKS,
      criticalDecisions: '',
      avoidedRisks: '',
      nextShiftAlerts: '',
      isClosed: false,
      score: 0,
      operationType: 'PERFORACION'
    };
  });

  useEffect(() => {
    if (!shiftData.wellName || !shiftData.rig) {
      setShowSetup(true);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('current_shift', JSON.stringify(shiftData));
  }, [shiftData]);

  const updateTaskStatus = (blockId: string, taskId: string, status: TaskStatus) => {
    if (shiftData.isClosed) return;
    setShiftData(prev => ({
      ...prev,
      blocks: prev.blocks.map(block => 
        block.id === blockId 
          ? { ...block, tasks: block.tasks.map(t => t.id === taskId ? { ...t, status } : t) }
          : block
      )
    }));
  };

  const updateTaskNote = (blockId: string, taskId: string, note: string) => {
    if (shiftData.isClosed) return;
    setShiftData(prev => ({
      ...prev,
      blocks: prev.blocks.map(block => 
        block.id === blockId 
          ? { ...block, tasks: block.tasks.map(t => t.id === taskId ? { ...t, note } : t) }
          : block
      )
    }));
  };

  const calculateScore = useCallback(() => {
    let totalTasks = 0;
    let completedTasks = 0;
    shiftData.blocks.forEach(block => {
      block.tasks.forEach(task => {
        if (task.status === 'CUMPLIDO') completedTasks++;
        if (task.status !== 'NO_APLICA' && task.status !== undefined) totalTasks++;
      });
    });
    return totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  }, [shiftData.blocks]);

  const handleCloseShift = async () => {
    const closureBlock = shiftData.blocks.find(b => b.id === BlockId.CLOSURE);
    const allClosureDone = closureBlock?.tasks.every(t => t.status !== undefined);
    
    if (!allClosureDone) {
      alert("⚠️ Error: Complete el Bloque 5 antes de cerrar el turno.");
      return;
    }

    try {
      setLoading(true);
      const score = calculateScore();
      const summary = await generateShiftSummary({ ...shiftData, score });
      
      if (summary.startsWith("ERROR")) {
        alert("⚠️ " + summary);
      } else {
        setShiftData(prev => ({ ...prev, isClosed: true, score, aiSummary: summary }));
      }
    } catch (error: any) {
      alert("ERROR CRÍTICO: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const startNewShift = () => {
    const history = JSON.parse(localStorage.getItem('shift_history') || '[]');
    history.push({ ...shiftData, timestamp: new Date().toISOString() });
    localStorage.setItem('shift_history', JSON.stringify(history));

    setShiftData(prev => ({
      ...prev,
      date: new Date().toISOString().split('T')[0],
      blocks: INITIAL_BLOCKS.map(b => ({ 
        ...b, 
        tasks: b.tasks.map(t => ({ ...t, status: undefined, note: undefined })) 
      })),
      criticalDecisions: '',
      avoidedRisks: '',
      nextShiftAlerts: '',
      isClosed: false,
      score: 0,
      aiSummary: undefined
    }));

    setActiveBlockIndex(0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveSetup = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setShiftData(prev => ({
      ...prev,
      wellName: formData.get('wellName') as string,
      rig: formData.get('rig') as string,
      companyMan: formData.get('companyMan') as string,
      operationType: formData.get('operationType') as OperationType,
      date: formData.get('shiftDate') as string,
    }));
    setShowSetup(false);
  };

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    return dateStr.split('-').reverse().join('/');
  };

  const CorporateLogo = () => (
    <div className="logo-text text-white font-extrabold text-2xl uppercase tracking-wider leading-none select-none">
      TECPETROL
    </div>
  );

  if (showSetup) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-6 font-sans">
        <div className="w-full max-w-md bg-[#1e293b] rounded-2xl p-8 shadow-2xl border border-[#4169E1]/30">
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-2">
              <CorporateLogo />
              <h2 className="text-xl font-bold text-white tracking-tight border-l border-white/20 pl-4">Inicio de Turno</h2>
            </div>
            <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
              Configure los parámetros operativos y de seguridad para la jornada de hoy.
            </p>
          </div>
          
          <form onSubmit={handleSaveSetup} className="space-y-5">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 tracking-widest">Nombre del Pozo *</label>
              <input name="wellName" defaultValue={shiftData.wellName} required className="w-full bg-[#0f172a] border border-[#4169E1]/30 rounded-xl p-3 text-lg font-medium text-white focus:border-[#4169E1] focus:outline-none" placeholder="Ej: Shushufindi-45" />
            </div>
            
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 tracking-widest">Equipo / Rig *</label>
              <input name="rig" defaultValue={shiftData.rig} required className="w-full bg-[#0f172a] border border-[#4169E1]/30 rounded-xl p-3 text-lg font-medium text-white focus:border-[#4169E1] focus:outline-none" placeholder="Ej: WO-12" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 tracking-widest">Fecha Operativa</label>
                <input type="date" name="shiftDate" defaultValue={shiftData.date} required className="w-full bg-[#0f172a] border border-[#4169E1]/30 rounded-xl p-3 text-sm font-medium text-white focus:border-[#4169E1] focus:outline-none" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 tracking-widest">Operación</label>
                <select name="operationType" defaultValue={shiftData.operationType} className="w-full bg-[#0f172a] border border-[#4169E1]/30 rounded-xl p-3 text-sm font-medium text-white focus:border-[#4169E1] focus:outline-none appearance-none cursor-pointer">
                  <option value="PERFORACION">Perforación</option>
                  <option value="WORKOVER">Workover</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 tracking-widest">Company Man</label>
              <input name="companyMan" defaultValue={shiftData.companyMan} className="w-full bg-[#0f172a] border border-[#4169E1]/30 rounded-xl p-3 text-sm font-medium text-white focus:border-[#4169E1] focus:outline-none" placeholder="Nombre completo" />
            </div>

            <button type="submit" className="w-full py-4 bg-[#FACC15] text-slate-900 font-black rounded-2xl shadow-xl hover:bg-[#eab308] transition-all mt-4 transform active:scale-95 uppercase text-xs tracking-[0.2em]">
              INICIAR SUPERVISIÓN
            </button>
          </form>
        </div>
      </div>
    );
  }

  const currentBlock = shiftData.blocks[activeBlockIndex];
  const progress = Math.round((shiftData.blocks.reduce((acc, b) => acc + b.tasks.filter(t => t.status).length, 0) / 25) * 100);

  return (
    <div className="min-h-screen pb-24 max-w-lg mx-auto bg-[#0f172a] border-x border-slate-800 shadow-2xl relative font-sans">
      {/* Header Tecpetrol Blue */}
      <header className="sticky top-0 z-30 bg-[#4169E1] text-white p-4 shadow-xl border-b border-white/10">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-4">
            <CorporateLogo />
            <div className="border-l border-white/30 pl-3">
              <h1 className="text-[10px] font-black tracking-widest uppercase leading-none text-white/80">Gestión Crítica</h1>
              <div className="flex items-center gap-1.5 mt-1.5">
                <p className="text-[10px] text-white font-black uppercase tracking-tighter truncate max-w-[120px]">
                  {shiftData.wellName} | {shiftData.rig}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <div className="text-right">
              <div className="text-xs font-black text-white leading-none">
                {calculateScore()}%
              </div>
              <p className="text-[7px] uppercase font-bold text-white/70 mt-0.5 tracking-widest">Score</p>
            </div>
            <button onClick={() => setShowSetup(true)} className="p-2 bg-white/10 rounded-xl hover:bg-white/20 transition-colors">
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-widest text-white/70 mb-2 px-1">
          <span className="bg-black/20 px-2 py-0.5 rounded">MODO: {shiftData.operationType}</span>
          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {formatDateDisplay(shiftData.date)}</span>
        </div>

        <div className="w-full bg-black/20 h-1.5 rounded-full overflow-hidden shadow-inner">
          <div className="bg-[#FACC15] h-full transition-all duration-500 ease-out shadow-[0 0 10px rgba(250,204,21,0.5)]" style={{ width: `${progress}%` }} />
        </div>
      </header>

      <main className="p-4 space-y-6">
        {shiftData.isClosed ? (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-700">
            <div className="bg-[#1e293b] border-l-4 border-green-500 p-5 rounded-2xl shadow-xl border border-green-500/10">
              <h2 className="text-green-400 font-black flex items-center gap-2 text-xs uppercase tracking-widest">
                <CheckCircle className="w-4 h-4" /> REPORTE FINALIZADO
              </h2>
              <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider">Turno operativo registrado y procesado exitosamente.</p>
            </div>

            <section className="bg-[#1e293b] rounded-3xl p-6 shadow-2xl border border-[#4169E1]/30">
              <h3 className="text-[11px] font-black text-white mb-5 flex items-center gap-2 border-b border-slate-700 pb-4 uppercase tracking-widest">
                <BrainCircuit className="text-[#4169E1] w-5 h-5" /> Reporte Ejecutivo - {shiftData.wellName}
              </h3>
              <div className="prose prose-invert prose-sm max-w-none text-slate-300 leading-relaxed font-sans text-xs">
                {shiftData.aiSummary}
              </div>
            </section>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#1e293b] rounded-2xl p-5 shadow-xl border border-[#4169E1]/20 text-center">
                <p className="text-[8px] text-slate-500 uppercase font-black tracking-widest mb-1">Score Turno</p>
                <p className="text-3xl font-black text-[#FACC15] tracking-tighter">{shiftData.score}%</p>
              </div>
              <div className="bg-[#1e293b] rounded-2xl p-5 shadow-xl border border-red-500/20 text-center">
                <p className="text-[8px] text-slate-500 uppercase font-black tracking-widest mb-1">Desviaciones</p>
                <p className="text-3xl font-black text-red-500 tracking-tighter">
                  {shiftData.blocks.reduce((acc, b) => acc + b.tasks.filter(t => t.status === 'DESVIACION').length, 0)}
                </p>
              </div>
            </div>

            <button 
              onClick={startNewShift}
              className="w-full flex items-center justify-center gap-3 py-5 bg-[#4169E1] text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#3458c7] transition-all shadow-xl active:scale-95 border-b-4 border-black/20"
            >
              <RotateCcw className="w-4 h-4 text-[#FACC15]" /> INICIAR NUEVO TURNO
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between bg-[#1e293b] p-3 rounded-2xl shadow-xl border border-[#4169E1]/30 sticky top-[108px] z-20">
              <button onClick={() => setActiveBlockIndex(Math.max(0, activeBlockIndex - 1))} disabled={activeBlockIndex === 0} className="p-2 disabled:opacity-20 text-slate-400">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="text-center">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">BLOQUE {activeBlockIndex + 1} / 5</span>
                <h2 className="text-[10px] font-black text-white truncate max-w-[180px] uppercase tracking-wider">{currentBlock.title}</h2>
              </div>
              <button onClick={() => setActiveBlockIndex(Math.min(4, activeBlockIndex + 1))} disabled={activeBlockIndex === 4} className="p-2 disabled:opacity-20 text-slate-400">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {currentBlock.tasks.map(task => (
                <div key={task.id} className="bg-[#1e293b] rounded-2xl p-5 shadow-lg border border-[#4169E1]/10 hover:border-[#4169E1]/40 transition-colors">
                  <div className="flex items-start gap-4 mb-5">
                    <span className="bg-[#4169E1] text-white text-[9px] px-2.5 py-1 rounded-lg font-black mt-0.5 shadow-md shadow-[#4169E1]/20">{task.id}</span>
                    <p className="text-[13px] font-bold text-slate-100 leading-snug tracking-tight">{task.label}</p>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3">
                    <button onClick={() => updateTaskStatus(currentBlock.id, task.id, 'CUMPLIDO')}
                      className={`flex flex-col items-center gap-1.5 py-3.5 px-1 rounded-xl border text-[8px] font-black transition-all ${task.status === 'CUMPLIDO' ? 'bg-[#4169E1] border-white/20 text-white shadow-lg' : 'bg-[#0f172a] border-slate-700 text-slate-500'}`}>
                      <CheckCircle className="w-5 h-5 mb-0.5" /> OK
                    </button>
                    <button onClick={() => updateTaskStatus(currentBlock.id, task.id, 'NO_APLICA')}
                      className={`flex flex-col items-center gap-1.5 py-3.5 px-1 rounded-xl border text-[8px] font-black transition-all ${task.status === 'NO_APLICA' ? 'bg-slate-700 border-white/20 text-white shadow-lg' : 'bg-[#0f172a] border-slate-700 text-slate-500'}`}>
                      <MinusCircle className="w-5 h-5 mb-0.5" /> N/A
                    </button>
                    <button onClick={() => updateTaskStatus(currentBlock.id, task.id, 'DESVIACION')}
                      className={`flex flex-col items-center gap-1.5 py-3.5 px-1 rounded-xl border text-[8px] font-black transition-all ${task.status === 'DESVIACION' ? 'bg-red-600 border-white/20 text-white shadow-lg' : 'bg-[#0f172a] border-slate-700 text-slate-500'}`}>
                      <AlertTriangle className="w-5 h-5 mb-0.5" /> FALLA
                    </button>
                  </div>

                  {task.status === 'DESVIACION' && (
                    <div className="mt-4 animate-in slide-in-from-top-3 duration-300">
                      <textarea placeholder="Reporte técnico de la falla..." value={task.note || ''} onChange={(e) => updateTaskNote(currentBlock.id, task.id, e.target.value)}
                        className="w-full text-[11px] p-4 bg-[#0f172a] border border-red-500/30 rounded-xl focus:outline-none focus:border-red-500 text-red-100" rows={2} />
                    </div>
                  )}
                </div>
              ))}
            </div>

            <section className="bg-gradient-to-b from-[#1e293b] to-[#0f172a] text-white rounded-3xl p-6 space-y-6 shadow-2xl border border-[#4169E1]/30">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-[#4169E1] flex items-center gap-3 border-b border-white/5 pb-5">
                <HardHat className="w-4 h-4 text-[#FACC15]" /> Bitácora Operativa
              </h3>
              
              <div className="space-y-5">
                <div>
                  <label className="block text-[9px] font-black mb-1.5 uppercase text-slate-500 tracking-widest">Decisiones Críticas</label>
                  <textarea value={shiftData.criticalDecisions} onChange={(e) => setShiftData(prev => ({ ...prev, criticalDecisions: e.target.value }))}
                    className="w-full bg-[#0f172a] border border-slate-700 rounded-xl p-4 text-[11px] focus:outline-none focus:border-[#4169E1] text-slate-200" placeholder="Ej: Ajuste de parámetros por inestabilidad..." rows={2} />
                </div>
                <div>
                  <label className="block text-[9px] font-black mb-1.5 uppercase text-slate-500 tracking-widest">Riesgos Mitigados</label>
                  <textarea value={shiftData.avoidedRisks} onChange={(e) => setShiftData(prev => ({ ...prev, avoidedRisks: e.target.value }))}
                    className="w-full bg-[#0f172a] border border-slate-700 rounded-xl p-4 text-[11px] focus:outline-none focus:border-[#4169E1] text-slate-200" placeholder="Ej: Suspensión de izaje por ráfagas..." rows={2} />
                </div>
                <div>
                  <label className="block text-[9px] font-black mb-1.5 uppercase text-slate-500 tracking-widest">Handover Siguiente Turno</label>
                  <textarea value={shiftData.nextShiftAlerts} onChange={(e) => setShiftData(prev => ({ ...prev, nextShiftAlerts: e.target.value }))}
                    className="w-full bg-[#0f172a] border border-slate-700 rounded-xl p-4 text-[11px] focus:outline-none focus:border-[#4169E1] text-slate-200" placeholder="Ej: Verificar integridad de conexión #7..." rows={2} />
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      {!shiftData.isClosed && (
        <footer className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-[#0f172a]/95 backdrop-blur-lg border-t border-slate-800 p-4 flex gap-4 z-40 shadow-[0 -10px 20px rgba(0,0,0,0.4)]">
          <button onClick={() => setActiveBlockIndex(prev => Math.min(4, prev + 1))}
            className="flex-[0.4] py-4.5 bg-slate-800 text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-white/5 active:bg-slate-700">
            SIGUIENTE
          </button>
          <button onClick={handleCloseShift} disabled={loading}
            className={`flex-1 py-4.5 ${loading ? 'bg-slate-700' : 'bg-[#FACC15]'} text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-[#FACC15]/5 transform active:scale-95 transition-all`}>
            {loading ? <><BrainCircuit className="w-4 h-4 animate-pulse" /> Sincronizando...</> : <><Save className="w-4 h-4" /> CERRAR TURNO</>}
          </button>
        </footer>
      )}
    </div>
  );
};

export default App;