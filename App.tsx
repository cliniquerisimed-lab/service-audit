
import React, { useState, useEffect, useRef } from 'react';
import { SectionTopic, DocumentId, DocumentData } from './types';
import { askGeminiExpert, generateSpeech } from './services/geminiService';

// --- Composants UI ---

const NoteArea: React.FC<{ 
  docId: string; 
  secId: string; 
  value: string; 
  onChange: (val: string) => void 
}> = ({ value, onChange }) => {
  return (
    <div className="mt-8 no-print group">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-2 h-2 rounded-full bg-[#002147]"></span>
        <label className="text-xs font-black uppercase tracking-[0.2em] text-[#002147] opacity-70 group-hover:opacity-100 transition-all">
          Annotations Critiques de l'Auditeur
        </label>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Inscrivez ici vos réflexions d'expert..."
        className="w-full min-h-[130px] p-6 bg-white border-2 border-[#002147]/20 rounded-2xl text-sm focus:border-[#002147] focus:ring-4 focus:ring-[#002147]/5 transition-all font-inter shadow-md outline-none resize-none placeholder:text-slate-400 placeholder:text-base"
      />
    </div>
  );
};

const LoadingOverlay: React.FC = () => (
  <div className="absolute inset-0 z-50 bg-white/95 backdrop-blur-md flex flex-col items-center justify-center rounded-[2rem] animate-in fade-in duration-500">
    <div className="scan-line"></div>
    <div className="relative w-20 h-20 mb-6">
      <div className="absolute inset-0 border-2 border-slate-100 rounded-full"></div>
      <div className="absolute inset-0 border-t-2 border-orange-500 rounded-full animate-spin"></div>
      <div className="absolute inset-4 bg-orange-100/30 rounded-full animate-pulse flex items-center justify-center">
        <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
      </div>
    </div>
    <h3 className="text-[#002147] font-serif text-xl font-bold">Expertise Dr JONGWANE</h3>
    <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">Intelligence Artificielle en action</p>
  </div>
);

interface AIProps {
  docId: string;
  topic: SectionTopic;
  baseText: string;
  onRegenerate: () => void;
  onClose: () => void;
  responseHtml: string;
  isLoading: boolean;
  audioBuffer: AudioBuffer | null;
}

const AIResponseBox: React.FC<AIProps> = ({ docId, topic, baseText, onRegenerate, onClose, responseHtml, isLoading, audioBuffer }) => {
  const [question, setQuestion] = useState('');
  const [chatHistory, setChatHistory] = useState<string>(responseHtml || '');
  const [isAsking, setIsAsking] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    if (responseHtml) setChatHistory(responseHtml);
  }, [responseHtml]);

  useEffect(() => {
    if (audioBuffer && !isLoading) playAudio();
    return () => stopAudio();
  }, [audioBuffer, isLoading]);

  const stopAudio = () => {
    if (audioSourceRef.current) {
      try { audioSourceRef.current.stop(); } catch (e) {}
      audioSourceRef.current = null;
    }
    if (audioContextRef.current) {
      try { audioContextRef.current.close(); } catch (e) {}
      audioContextRef.current = null;
    }
  };

  const playAudio = () => {
    stopAudio();
    if (!audioBuffer) return;
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    audioContextRef.current = ctx;
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);
    source.start(0);
    audioSourceRef.current = source;
  };

  const handleClose = () => {
    stopAudio();
    onClose();
  };

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    setIsAsking(true);
    const result = await askGeminiExpert(docId, topic, baseText, question);
    setChatHistory(result.text);
    setQuestion('');
    setIsAsking(false);
    
    const newAudio = await generateSpeech(result.text.replace(/<[^>]*>/g, ''));
    if (newAudio) {
      stopAudio();
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = ctx;
      const source = ctx.createBufferSource();
      source.buffer = newAudio;
      source.connect(ctx.destination);
      source.start(0);
      audioSourceRef.current = source;
    }
  };

  if (!responseHtml && !isLoading) return null;

  return (
    <div className="h-full flex flex-col overflow-hidden rounded-[2.5rem] border border-orange-100 bg-white shadow-2xl animate-in fade-in slide-in-from-right-10 duration-500 font-inter no-print relative">
      {isLoading && <LoadingOverlay />}
      <div className="bg-orange-600 px-6 py-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="bg-white p-1 rounded-lg shadow-sm">
            <svg className="w-4 h-4 text-orange-600" fill="currentColor" viewBox="0 0 20 20"><path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z"/></svg>
          </div>
          <span className="text-xs font-black uppercase tracking-widest text-white">Diagnostic IA Expert Vocal</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={playAudio} className="p-1.5 text-orange-50 hover:text-white transition-colors" title="Réécouter l'analyse"><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd"/></svg></button>
          <button onClick={handleClose} className="p-1.5 text-orange-50 hover:text-white transition-colors" title="Fermer l'interface"><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/></svg></button>
        </div>
      </div>
      <div className="p-8 flex-1 overflow-y-auto min-h-[350px]">
        {!isLoading && (
          <>
            <div className="ai-content text-[15px] text-slate-700 leading-relaxed font-inter" dangerouslySetInnerHTML={{ __html: (chatHistory || "").replace(/\n\n/g, '</div><div class="mt-5">') }} />
            <form onSubmit={handleAsk} className="mt-10 pt-6 border-t border-slate-50 flex gap-3 no-print">
              <input type="text" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Précisez votre demande d'audit..." className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-5 py-3 text-sm focus:ring-2 focus:ring-orange-500 transition-all shadow-inner outline-none font-inter" />
              <button type="submit" disabled={isAsking} className="bg-orange-600 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-orange-700 transition-all shadow-lg disabled:opacity-50">Analyser</button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

// --- Données Initiales (MAINTIEN DU TEXTE INTÉGRAL D'ORIGINE) ---

const INITIAL_DOCUMENTS: Record<string, DocumentData> = {
  sphinx: {
    id: 'sphinx' as DocumentId,
    title: 'Audit Stratégique Sphinx',
    subtitle: 'Cabinet SPHINX Consulting',
    sections: {
      forces: {
        title: 'Validation de l\'Identité',
        content: <p>Cabinet pluridisciplinaire spécialisé dans l'accompagnement stratégique des institutions publiques et structures privées à impact social.</p>,
        rawText: "SPHINX Consulting est un cabinet de conseil pluridisciplinaire spécialisé dans l’accompagnement stratégique des institutions publiques, organisations internationales, ONG, associations et structures privées à impact social. Le cabinet intervient principalement dans les domaines de la santé publique, du développement humain, de l’économie appliquée et de la gouvernance des projets et politiques publiques."
      },
      faiblesses: {
        title: 'Évaluation des Risques',
        content: <p>Analyse des menaces liées à la dépendance aux experts seniors et à la forte concurrence locale.</p>,
        rawText: "Risques identifiés: Dépendance consultants seniors, concurrence locale forte, contexte ressources limitées, exigences élevées des partenaires financiers, risque de dispersion des expertises."
      },
      propositions: {
        title: 'Orientations Tarifaires',
        content: <p>Étude des forfaits entre 1.8M et 9M FCFA selon la complexité des missions stratégiques.</p>,
        rawText: "Tarification indicative: Diagnostic stratégique (1.8M-6M), Étude économique (3M-9M), Audit organisationnel (1.8M-4.8M). Focus sur l'appui à la CSU."
      }
    },
    originalRef: (
      <div className="prose prose-slate max-w-none space-y-6 font-inter text-slate-700 leading-relaxed text-[13px] p-8 bg-white rounded-[2.5rem] shadow-inner border border-slate-100">
        <header className="text-center border-b border-slate-100 pb-8 mb-8">
            <h1 className="text-3xl font-serif text-[#002147] uppercase mb-1 tracking-tight">SPHINX CONSULTING</h1>
            <p className="text-amber-600 font-black uppercase tracking-[0.3em] text-[10px]">Cabinet de conseil stratégique, santé publique et développement</p>
        </header>
        <section>
            <h2 className="text-base font-bold text-[#002147] mb-3 border-l-4 border-amber-500 pl-4">1. PRÉSENTATION GÉNÉRALE</h2>
            <p>SPHINX Consulting est un cabinet de conseil pluridisciplinaire spécialisé dans l’accompagnement stratégique des institutions publiques, organisations internationales, ONG, associations et structures privées à impact social. Le cabinet intervient principalement dans les domaines de la santé publique, du développement humain, de l’économie appliquée et de la gouvernance des projets et politiques publiques.</p>
            <p className="mt-2">Dans un contexte marqué par des ressources limitées, des besoins sociaux croissants et des exigences accrues des partenaires techniques et financiers, SPHINX Consulting se positionne comme un acteur de référence offrant des solutions adaptées, rigoureuses et orientées vers l’impact.</p>
        </section>
        <section>
            <h2 className="text-base font-bold text-[#002147] mb-3 border-l-4 border-amber-500 pl-4">2. VISION, MISSION ET VALEURS</h2>
            <p><strong>Vision:</strong> Contribuer durablement à l’amélioration des systèmes sociaux et sanitaires par un conseil stratégique fondé sur l’expertise, l’innovation et l’équité.</p>
            <p className="mt-2"><strong>Mission:</strong> Appuyer les décideurs et les organisations dans la conception, la mise en œuvre et l’évaluation de politiques, programmes et projets à fort impact social, en tenant compte des réalités locales et des standards internationaux.</p>
            <p className="mt-2"><strong>Valeurs:</strong> Excellence technique et scientifique, Éthique et intégrité professionnelle, Approche contextuelle et participative, Orientation résultats et impact, Équité et inclusion.</p>
        </section>
        <section>
            <h2 className="text-base font-bold text-[#002147] mb-3 border-l-4 border-amber-500 pl-4">3. DOMAINES D’INTERVENTION</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Conseil en santé publique et systèmes de santé (Appui CSU).</li>
              <li>Économie de la santé et études socio-économiques.</li>
              <li>Montage, gestion et évaluation de projets.</li>
              <li>Recherche appliquée et études stratégiques.</li>
              <li>Appui institutionnel et gouvernance (Audit organisationnel).</li>
            </ul>
        </section>
        <section>
            <h2 className="text-base font-bold text-[#002147] mb-3 border-l-4 border-amber-500 pl-4">6. GRILLE TARIFAIRE INDICATIVE</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[11px]">
                  <thead className="bg-[#002147] text-white"><tr><th className="p-3 border border-slate-100 text-left">Prestation</th><th className="p-3 border border-slate-100">Tarif (FCFA)</th></tr></thead>
                  <tbody>
                      <tr><td className="p-3 border border-slate-100">Diagnostic sectoriel / étude stratégique</td><td className="p-3 border border-slate-100 font-bold">1 800 000 – 6 000 000</td></tr>
                      <tr><td className="p-3 border border-slate-100">Étude économique (coût-efficacité, impact)</td><td className="p-3 border border-slate-100 font-bold">3 000 000 – 9 000 000</td></tr>
                      <tr><td className="p-3 border border-slate-100">Élaboration de projet / note conceptuelle</td><td className="p-3 border border-slate-100 font-bold">900 000 – 2 400 000</td></tr>
                      <tr><td className="p-3 border border-slate-100">Audit organisationnel et institutionnel</td><td className="p-3 border border-slate-100 font-bold">1 800 000 – 4 800 000</td></tr>
                  </tbody>
              </table>
            </div>
        </section>
        <section>
            <h2 className="text-base font-bold text-[#002147] mb-3 border-l-4 border-amber-500 pl-4">9. CODE D’ÉTHIQUE ET DE CONDUITE</h2>
            <p>Intégrité (tolérance zéro corruption), Confidentialité (protection stricte des données), Objectivité (indépendance des analyses), Équité (promotion active de l'approche genre).</p>
        </section>
      </div>
    )
  },
  'echo-pediatrie': {
    id: 'echo-pediatrie' as DocumentId,
    title: 'Audit Écho-Pédiatrie',
    subtitle: 'Padre Pio x Aide Médicale',
    sections: {
      forces: {
        title: 'Pertinence du Projet',
        content: <p>Optimisation des urgences pédiatriques via l'échographie clinique (POCUS) à Padre Pio.</p>,
        rawText: "L’Hôpital Catholique Padre Pio accueille en moyenne 1 000 enfants par mois. Objectif: Améliorer durablement la prise en charge des urgences pédiatriques grâce à l’utilisation structurée de l’échographie clinique au lit du patient (POCUS)."
      },
      faiblesses: {
        title: 'Zones Critiques',
        content: <p>Risques liés au manque de personnel formé et aux retards de triage pédiatrique.</p>,
        rawText: "Retards diagnostiques dans les urgences vitales. Difficultés de triage rapide des nouveau-nés graves. Dépendance à des examens coûteux ou indisponibles. Insuffisance de personnel formé à l’échographie pédiatrique."
      },
      propositions: {
        title: 'Optimisation Budgétaire',
        content: <p>Budget de 12M FCFA incluant deux échographes portables et formation experte du staff.</p>,
        rawText: "Budget prévisionnel : 12 000 000 FCFA. Acquisition matériel (9M), Formation experts (1.5M), Aménagement (0.5M), Suivi-Évaluation (1M). Maintenance par quote-part symbolique (tarif social)."
      }
    },
    originalRef: (
      <div className="prose prose-slate max-w-none space-y-6 font-inter text-slate-700 leading-relaxed text-[13px] p-8 bg-white rounded-[2.5rem] shadow-inner border border-slate-100">
        <header className="text-center border-b border-slate-100 pb-8 mb-8">
            <p className="text-amber-600 font-black uppercase tracking-[0.3em] text-[8px] mb-1">PROJET DE SANTÉ HOSPITALIER 2026</p>
            <h1 className="text-2xl font-serif text-[#002147] uppercase tracking-tight italic">Écho-Pédiatrie : Sauver des Vies</h1>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-[8px] mt-1">Hôpital Catholique Padre Pio • Douala • Association Aide Médicale</p>
        </header>
        <section>
            <h2 className="text-base font-bold text-[#002147] mb-3 border-l-4 border-amber-500 pl-4">1. PRÉSENTATION DE L’ÉTABLISSEMENT</h2>
            <p>L’Hôpital Catholique Padre Pio est une structure sanitaire à forte vocation sociale et humanitaire, accueillant en moyenne 1 000 enfants par mois. Les urgences pédiatriques constituent un service stratégique de l’hôpital.</p>
        </section>
        <section>
            <h2 className="text-base font-bold text-[#002147] mb-3 border-l-4 border-amber-500 pl-4">2. CONTEXTE ET JUSTIFICATION</h2>
            <p>Urgences marquées par une charge élevée de pathologies infectieuses et respiratoires. Accès limité à l’imagerie lourde. L’échographie clinique au lit du patient (POCUS) est non invasive, sans irradiation, rapide et peu coûteuse.</p>
        </section>
        <section>
            <h2 className="text-base font-bold text-[#002147] mb-3 border-l-4 border-amber-500 pl-4">3. PROBLÉMATIQUE</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Retards diagnostiques dans les urgences vitales.</li>
              <li>Difficultés de triage rapide des nouveau-nés graves.</li>
              <li>Dépendance à des examens coûteux ou indisponibles.</li>
              <li>Insuffisance de personnel formé à l’échographie pédiatrique.</li>
            </ul>
        </section>
        <section>
            <h2 className="text-base font-bold text-[#002147] mb-3 border-l-4 border-amber-500 pl-4">4. OBJECTIFS DU PROJET</h2>
            <p><strong>Objectif général :</strong> Améliorer durablement la prise en charge des urgences pédiatriques via POCUS.</p>
            <p className="mt-1"><strong>Objectifs spécifiques :</strong> Réduire le délai diagnostique, renforcer les compétences cliniques, optimiser le triage, réduire la mortalité infantile évitable.</p>
        </section>
        <section>
            <h2 className="text-base font-bold text-[#002147] mb-3 border-l-4 border-amber-500 pl-4">7. BUDGET PRÉVISIONNEL</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse border border-slate-100 text-[11px]">
                  <thead className="bg-[#002147] text-white">
                    <tr><th className="p-2 border">Poste</th><th className="p-2 border">Description</th><th className="p-2 border">Montant (FCFA)</th></tr>
                  </thead>
                  <tbody>
                    <tr><td className="p-2 border">Équipements</td><td className="p-2 border">02 Échographes portables + Sondes</td><td className="p-2 border font-bold">9 000 000</td></tr>
                    <tr><td className="p-2 border">Formation</td><td className="p-2 border">Experts formateurs (5 jours)</td><td className="p-2 border font-bold">1 500 000</td></tr>
                    <tr><td className="p-2 border">Aménagement</td><td className="p-2 border">Sécurisation et stockage</td><td className="p-2 border font-bold">500 000</td></tr>
                    <tr><td className="p-2 border">Suivi-Éval</td><td className="p-2 border">Collecte de données (1 an)</td><td className="p-2 border font-bold">1 000 000</td></tr>
                    <tr className="bg-slate-50 font-bold"><td colSpan={2} className="p-2 border text-right">TOTAL GÉNÉRAL</td><td className="p-2 border text-[#002147]">12 000 000 FCFA</td></tr>
                  </tbody>
              </table>
            </div>
        </section>
        <section>
            <h2 className="text-base font-bold text-[#002147] mb-3 border-l-4 border-amber-500 pl-4">9. PÉRENNISATION</h2>
            <p>Une quote-part symbolique par examen (tarif social) sera perçue pour constituer un fonds de maintenance des appareils. La formation sera intégrée au cursus d'accueil de tout nouveau personnel.</p>
        </section>
      </div>
    )
  }
};

const App: React.FC = () => {
  const [documents, setDocuments] = useState<Record<string, DocumentData>>(INITIAL_DOCUMENTS);
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'audit' | 'original'>('audit');
  const [aiResponses, setAiResponses] = useState<Record<string, Record<string, string>>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [audioBuffers, setAudioBuffers] = useState<Record<string, AudioBuffer | null>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDocData, setNewDocData] = useState({ title: '', subtitle: '', text: '' });

  // Persistence
  useEffect(() => {
    const saved = localStorage.getItem('dr_jongwane_studio_v8');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.aiResponses) setAiResponses(parsed.aiResponses);
        if (parsed.notes) setNotes(parsed.notes);
        if (parsed.customDocs) setDocuments(prev => ({ ...prev, ...parsed.customDocs }));
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    const customDocs = Object.fromEntries(
      Object.entries(documents).filter(([key]) => key !== 'sphinx' && key !== 'echo-pediatrie')
    );
    localStorage.setItem('dr_jongwane_studio_v8', JSON.stringify({ aiResponses, notes, customDocs }));
  }, [aiResponses, notes, documents]);

  const handleAIRequest = async (topic: SectionTopic, customPrompt?: string) => {
    if (!selectedDoc || loading[topic]) return;
    setLoading(prev => ({ ...prev, [topic]: true }));
    const doc = documents[selectedDoc];
    const baseText = doc.sections[topic].rawText;
    try {
      const result = await askGeminiExpert(selectedDoc, topic, baseText, customPrompt);
      setAiResponses(prev => ({
        ...prev,
        [selectedDoc]: { ...(prev[selectedDoc] || {}), [topic]: result.text }
      }));
      const audio = await generateSpeech(result.text.replace(/<[^>]*>/g, ''));
      setAudioBuffers(prev => ({ ...prev, [topic]: audio }));
    } catch (err) { 
      alert("Analyse interrompue."); 
    } finally {
      setLoading(prev => ({ ...prev, [topic]: false }));
    }
  };

  const closeAI = (topic: string) => {
    if (!selectedDoc) return;
    setAiResponses(prev => {
      const docResps = { ...(prev[selectedDoc] || {}) };
      delete docResps[topic];
      return { ...prev, [selectedDoc]: docResps };
    });
    setAudioBuffers(prev => {
      const copy = { ...prev };
      delete copy[topic];
      return copy;
    });
  };

  const handleAddDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocData.title || !newDocData.text) return;
    const newId = `custom-${Date.now()}` as any;
    const created: DocumentData = {
      id: newId,
      title: newDocData.title,
      subtitle: newDocData.subtitle || 'Audit Strategique',
      sections: {
        forces: { title: 'Points Forts', content: <p className="italic text-slate-400">Diagnostic requis...</p>, rawText: newDocData.text },
        faiblesses: { title: 'Risques Critiques', content: <p className="italic text-slate-400">Diagnostic requis...</p>, rawText: newDocData.text },
        propositions: { title: 'Stratégie & Optimisation', content: <p className="italic text-slate-400">Diagnostic requis...</p>, rawText: newDocData.text }
      },
      originalRef: (
        <div className="p-10 bg-white border border-slate-100 rounded-[3rem] shadow-inner font-inter text-sm leading-relaxed text-slate-700">
            <h2 className="text-2xl font-serif text-[#002147] mb-6 uppercase italic border-b pb-4 tracking-tight">{newDocData.title}</h2>
            <div className="whitespace-pre-wrap">{newDocData.text}</div>
        </div>
      )
    };
    setDocuments(prev => ({ ...prev, [newId]: created }));
    setSelectedDoc(newId);
    setShowAddForm(false);
    setNewDocData({ title: '', subtitle: '', text: '' });
  };

  if (!selectedDoc) {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-6 overflow-hidden bg-[radial-gradient(circle_at_top,#ffffff,#fdfdfd)]">
        <div className="text-center mb-10 animate-in fade-in zoom-in-95 duration-1000">
          <h1 className="text-4xl md:text-5xl font-serif text-[#002147] mb-1 uppercase tracking-tighter italic font-black">STUDIO Dr JONGWANE</h1>
          <h2 className="text-xs font-black text-amber-600 uppercase tracking-[0.6em]">Intelligence Artificielle & Audit Stratégique</h2>
          <div className="w-16 h-1 bg-amber-500 mx-auto rounded-full mt-4 shadow-sm"></div>
        </div>
        
        <div className="max-w-7xl w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 px-4 overflow-hidden">
          {Object.values(documents).map((doc) => (
            <div key={doc.id} className="group glass p-10 rounded-[2.5rem] shadow-xl flex flex-col items-center text-center transition-all hover:translate-y-[-8px] hover:shadow-2xl cursor-default border border-slate-200/50">
              <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mb-6 text-4xl shadow-inner group-hover:scale-110 group-hover:bg-orange-50 transition-all duration-300">
                {doc.id.toString().includes('custom') ? '📄' : (doc.id === 'sphinx' ? '🏛️' : '🏥')}
              </div>
              <h2 className="font-serif text-2xl text-[#002147] mb-3 h-16 overflow-hidden leading-tight font-black">{doc.title}</h2>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-600 mb-8 opacity-60 truncate w-full px-6">{doc.subtitle}</p>
              <button onClick={() => setSelectedDoc(doc.id)} className="w-full bg-orange-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-orange-700 hover:scale-[1.05] transition-all shadow-xl active:scale-95 group-hover:shadow-orange-200/50">Lancer l'Expertise IA</button>
            </div>
          ))}
          
          <button onClick={() => setShowAddForm(true)} className="group glass border-4 border-dashed border-slate-200 p-10 rounded-[2.5rem] flex flex-col items-center justify-center text-center transition-all hover:border-orange-400 hover:bg-white hover:shadow-2xl">
            <div className="text-6xl mb-6 text-slate-200 group-hover:text-orange-500 transition-all duration-300 group-hover:scale-125">＋</div>
            <span className="font-black text-slate-400 group-hover:text-[#002147] text-sm uppercase tracking-[0.2em]">Nouveau Dossier d'Audit</span>
          </button>
        </div>

        {showAddForm && (
          <div className="fixed inset-0 bg-slate-900/60 z-[200] flex items-center justify-center p-6 backdrop-blur-md">
            <div className="bg-white w-full max-w-6xl rounded-[3.5rem] p-16 lg:p-20 shadow-2xl relative animate-in zoom-in-95 duration-500 border border-slate-100">
              <button onClick={() => setShowAddForm(false)} className="absolute top-10 right-10 text-slate-300 hover:text-orange-600 text-5xl transition-colors">✕</button>
              <h2 className="text-4xl font-serif text-[#002147] mb-12 font-black italic border-b pb-8">Nouveau Dossier d'Audit Stratégique</h2>
              <form onSubmit={handleAddDocument} className="grid grid-cols-1 md:grid-cols-2 gap-16">
                <div className="space-y-10">
                  <div>
                    <label className="block text-sm font-black uppercase tracking-[0.2em] text-slate-500 mb-4">Titre du Projet / Nom du Client</label>
                    <input required placeholder="Ex: Plan Stratégique SPHINX 2026" className="w-full p-6 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none text-lg font-inter transition-all" value={newDocData.title} onChange={e => setNewDocData({...newDocData, title: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-black uppercase tracking-[0.2em] text-slate-500 mb-4">Sous-titre ou Organisation (Optionnel)</label>
                    <input placeholder="Ex: Audit de performance Direction Médicale" className="w-full p-6 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none text-lg font-inter transition-all" value={newDocData.subtitle} onChange={e => setNewDocData({...newDocData, subtitle: e.target.value})} />
                  </div>
                  <button type="submit" className="w-full bg-[#002147] text-white py-8 rounded-2xl font-black uppercase tracking-widest text-base hover:bg-black transition-all shadow-2xl font-inter flex items-center justify-center gap-6 group">
                    Initialiser l'Audit IA
                    <svg className="w-6 h-6 group-hover:translate-x-3 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 5l7 7-7 7M5 5l7 7-7 7"/></svg>
                  </button>
                </div>
                <div>
                  <label className="block text-sm font-black uppercase tracking-[0.2em] text-slate-500 mb-4">Contenu intégral à analyser pour le diagnostic</label>
                  <textarea required placeholder="Collez ici l'intégralité du texte source du projet pour un audit complet et précis..." rows={14} className="w-full p-8 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none font-inter text-base leading-relaxed resize-none shadow-inner transition-all" value={newDocData.text} onChange={e => setNewDocData({...newDocData, text: e.target.value})}></textarea>
                </div>
              </form>
            </div>
          </div>
        )}
        
        <div className="mt-14 text-[11px] font-black uppercase tracking-[0.6em] text-slate-300 flex items-center gap-5">
          <span>Dr JONGWANE STUDIO</span>
          <span className="w-2 h-2 rounded-full bg-orange-500 shadow-sm shadow-orange-500/50"></span>
          <span>EST. 2026</span>
        </div>
      </div>
    );
  }

  const currentDoc = documents[selectedDoc];
  const currentResponses = aiResponses[selectedDoc] || {};

  return (
    <div className="min-h-screen py-16 px-4 flex flex-col items-center font-inter bg-[radial-gradient(circle_at_top,#ffffff,#fdfdfd)]">
      <button onClick={() => setSelectedDoc(null)} className="no-print fixed bottom-12 left-12 z-[150] bg-[#002147] text-white px-10 py-5 rounded-full shadow-2xl font-black uppercase tracking-widest text-[11px] hover:bg-black active:scale-95 transition-all flex items-center gap-4 font-inter border border-white/20">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
        Studio Principal
      </button>
      
      <div className="w-full max-w-[210mm] bg-white p-10 md:p-20 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.15)] relative border-t-[18px] border-[#002147] rounded-t-[4.5rem] overflow-hidden">
        <header className="text-center mb-16 border-b border-slate-50 pb-16">
          <h1 className="font-serif text-[#002147] text-5xl md:text-7xl uppercase tracking-tighter mb-4 leading-none font-black italic">{currentDoc.title}</h1>
          <div className="inline-block px-8 py-2.5 bg-slate-50 border border-slate-100 rounded-full text-orange-600 font-black text-[11px] uppercase tracking-[0.5em] shadow-sm font-inter">{currentDoc.subtitle}</div>
        </header>

        <nav className="no-print flex justify-center mb-20 space-x-5">
          <button onClick={() => setActiveTab('audit')} className={`px-12 py-6 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all font-inter shadow-md ${activeTab === 'audit' ? 'bg-[#002147] text-white' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}>
            Audit Strategy & AI
          </button>
          <button onClick={() => setActiveTab('original')} className={`px-12 py-6 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all font-inter shadow-md ${activeTab === 'original' ? 'bg-[#002147] text-white' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}>
            Texte d'Origine
          </button>
        </nav>

        {activeTab === 'audit' ? (
          <div className="space-y-40">
            {(['forces', 'faiblesses', 'propositions'] as SectionTopic[]).map((topic, index) => {
              const response = currentResponses[topic];
              return (
                <section key={topic} className="relative group">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-8 border-b border-slate-50 pb-8">
                    <div className="flex items-center gap-6">
                      <span className="bg-orange-100 text-orange-700 w-14 h-14 rounded-2xl flex items-center justify-center font-serif text-2xl font-black italic shadow-inner">0{index + 1}</span>
                      <h2 className="font-serif text-4xl text-[#002147] font-bold italic tracking-tight">{currentDoc.sections[topic].title}</h2>
                    </div>
                    <button onClick={() => handleAIRequest(topic)} className="no-print text-[11px] bg-orange-600 text-white px-10 py-4.5 rounded-xl hover:bg-orange-700 transition-all font-black uppercase tracking-widest shadow-xl flex items-center gap-4 font-inter border border-white/10 active:scale-95">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z"/></svg>
                      Diagnostic Expert IA
                    </button>
                  </div>

                  <div className={`grid gap-20 relative ${response || loading[topic] ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
                    <div className="prose prose-slate max-w-none text-slate-600 text-[16px] leading-relaxed p-12 bg-slate-50/40 rounded-[3.5rem] border border-slate-100/60 shadow-inner font-inter">
                      <div className="font-inter">
                        {currentDoc.sections[topic].content}
                      </div>
                    </div>
                    {(response || loading[topic]) && (
                      <div className="h-[650px] overflow-hidden">
                        <AIResponseBox 
                          docId={selectedDoc}
                          topic={topic} 
                          baseText={currentDoc.sections[topic].rawText} 
                          responseHtml={response} 
                          isLoading={loading[topic]} 
                          audioBuffer={audioBuffers[topic] || null}
                          onRegenerate={() => handleAIRequest(topic)}
                          onClose={() => closeAI(topic)}
                        />
                      </div>
                    )}
                  </div>
                  <NoteArea docId={selectedDoc} secId={topic} value={notes[`${selectedDoc}-${topic}`] || ''} onChange={(val) => setNotes(p => ({...p, [`${selectedDoc}-${topic}`]: val}))} />
                </section>
              );
            })}
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-5 duration-700">
            {currentDoc.originalRef}
          </div>
        )}

        <footer className="mt-40 pt-16 border-t border-slate-100 flex justify-between items-center opacity-40 text-[10px] font-black uppercase tracking-[0.5em] no-print font-inter">
          <div>CABINET Dr JONGWANE • AUDIT & STRATÉGIE CONSEIL</div>
          <div>DOUALA • CAMEROUN • 2026</div>
        </footer>
      </div>
    </div>
  );
};

export default App;
