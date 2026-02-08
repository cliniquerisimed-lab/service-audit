
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
    <div className="mt-6 no-print">
      <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-amber-800 mb-2 px-1">
        Annotations de l'Auditeur (Sauvegarde automatique)
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Ajoutez vos réflexions critiques ici..."
        className="w-full min-h-[120px] p-4 bg-amber-50/40 border-2 border-dashed border-amber-300 rounded-xl text-sm focus:border-solid focus:border-[#003366] transition-all font-inter shadow-inner focus:bg-white"
      />
    </div>
  );
};

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
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    if (responseHtml) setChatHistory(responseHtml);
  }, [responseHtml]);

  useEffect(() => {
    if (audioBuffer) playAudio();
  }, [audioBuffer]);

  const playAudio = () => {
    if (!audioBuffer) return;
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (audioSourceRef.current) {
      try { audioSourceRef.current.stop(); } catch(e) {}
    }
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);
    source.start(0);
    audioSourceRef.current = source;
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
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = ctx.createBufferSource();
      source.buffer = newAudio;
      source.connect(ctx.destination);
      source.start(0);
    }
  };

  if (!responseHtml && !isLoading) return null;

  return (
    <div className="h-full flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-500 font-inter no-print">
      <div className="bg-[#003366] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-amber-400 p-1.5 rounded-lg">
            <svg className="w-4 h-4 text-[#003366]" fill="currentColor" viewBox="0 0 20 20"><path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z"/></svg>
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Rapport IA d'Expert</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={playAudio} className="p-2 text-blue-200 hover:text-white" title="Réécouter"><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd"/></svg></button>
          <button onClick={onRegenerate} className="p-2 text-blue-200 hover:text-white" title="Régénérer"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg></button>
          <button onClick={onClose} className="p-2 text-blue-200 hover:text-red-400" title="Fermer"><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/></svg></button>
        </div>
      </div>
      <div className="p-7 flex-1 overflow-y-auto">
        {(isLoading || isAsking) ? (
          <div className="flex items-center gap-4 py-6">
            <div className="h-4 w-4 rounded-full bg-blue-600 animate-ping"></div>
            <span className="text-sm font-semibold text-[#003366] italic">Analyse en cours...</span>
          </div>
        ) : (
          <>
            <div className="ai-content text-[15px] text-slate-800 leading-relaxed" dangerouslySetInnerHTML={{ __html: (chatHistory || "").replace(/\n\n/g, '</div><div class="mt-5">') }} />
            <form onSubmit={handleAsk} className="mt-8 pt-6 border-t border-slate-100 flex gap-3">
              <input type="text" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Posez une question à l'IA..." className="flex-1 bg-slate-50 border-none rounded-full px-5 py-3 text-sm focus:ring-2 focus:ring-[#003366] transition-all shadow-inner" />
              <button type="submit" className="bg-[#003366] text-white px-6 py-3 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-black transition-all shadow-lg">Discuter</button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

// --- Données Initiales avec Texte Intégral ---

const INITIAL_DOCUMENTS: Record<string, DocumentData> = {
  sphinx: {
    id: 'sphinx' as DocumentId,
    title: 'Audit Stratégique Sphinx',
    subtitle: 'Cabinet SPHINX Consulting',
    sections: {
      forces: {
        title: 'Analyse de l\'Identité & Forces',
        content: (
          <div className="space-y-4">
            <h3 className="font-bold text-slate-900 uppercase text-xs tracking-wider">Référence Originale</h3>
            <p>SPHINX Consulting est un cabinet de conseil pluridisciplinaire spécialisé dans l’accompagnement stratégique des institutions publiques...</p>
          </div>
        ),
        rawText: "SPHINX Consulting, cabinet de conseil stratégique Cameroun. Vision: Amélioration systèmes sociaux. Excellence, éthique, impact."
      },
      faiblesses: {
        title: 'Domaines & Évaluation des Risques',
        content: (
          <div className="space-y-4">
            <h3 className="font-bold text-slate-900 uppercase text-xs tracking-wider">Référence Originale</h3>
            <p>Intervient en santé publique, économie de la santé et gestion de projets avec une tarification au forfait.</p>
          </div>
        ),
        rawText: "Domaines: Santé publique, Économie santé, Gestion projets. Risques identifiés par l'IA: dépendance consultants."
      },
      propositions: {
        title: 'Propositions & Grille Tarifaire',
        content: (
          <div className="space-y-4">
            <h3 className="font-bold text-slate-900 uppercase text-xs tracking-wider">Référence Originale</h3>
            <p>Grille : Diagnostic sectoriel (1.8M - 6M FCFA), Élaboration projet (900k - 2.4M FCFA).</p>
          </div>
        ),
        rawText: "Grille tarifaire Sphinx Consulting Cameroun. Études stratégiques et montage projets."
      }
    },
    originalRef: (
      <div className="prose prose-slate max-w-none space-y-8 font-inter text-slate-700 leading-relaxed text-sm">
        <header className="text-center border-b pb-8">
            <h1 className="text-3xl font-serif text-[#003366] uppercase">SPHINX CONSULTING</h1>
            <p className="text-[#C0A062] font-bold uppercase tracking-widest text-xs">Cabinet de conseil stratégique, santé publique et développement</p>
        </header>

        <section>
          <h2 className="text-xl font-bold text-[#003366] border-b pb-2">1. PRÉSENTATION GÉNÉRALE</h2>
          <p>SPHINX Consulting est un cabinet de conseil pluridisciplinaire spécialisé dans l’accompagnement stratégique des institutions publiques, organisations internationales, ONG, associations et structures privées à impact social. Le cabinet intervient principalement dans les domaines de la santé publique, du développement humain, de l’économie appliquée et de la gouvernance des projets et politiques publiques.</p>
          <p className="mt-4">Dans un contexte marqué par des ressources limitées, des besoins sociaux croissants et des exigences accrues des partenaires techniques et financiers, SPHINX Consulting se positionne comme un acteur de référence offrant des solutions adaptées, rigoureuses et orientées vers l’impact.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[#003366] border-b pb-2">2. VISION, MISSION ET VALEURS</h2>
          <p><strong>Vision :</strong> Contribuer durablement à l’amélioration des systèmes sociaux et sanitaires par un conseil stratégique fondé sur l’expertise, l’innovation et l’équité.</p>
          <p className="mt-2"><strong>Mission :</strong> Appuyer les décideurs et les organisations dans la conception, la mise en œuvre et l’évaluation de politiques, programmes et projets à fort impact social, en tenant compte des réalités locales et des standards internationaux.</p>
          <p className="mt-2"><strong>Valeurs :</strong> Excellence technique et scientifique, Éthique et intégrité professionnelle, Approche contextuelle et participative, Orientation résultats et impact, Promotion de l’équité et des droits humains.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[#003366] border-b pb-2">3. DOMAINES D’INTERVENTION ET ACTIVITÉS</h2>
          <ul className="list-disc pl-5 space-y-4">
            <li><strong>3.1 Conseil en santé publique :</strong> Diagnostic, politiques sanitaires, planification stratégique, CSU.</li>
            <li><strong>3.2 Économie de la santé :</strong> Coût-efficacité, analyses d’impact, soutenabilité financière.</li>
            <li><strong>3.3 Montage et gestion de projets :</strong> Élaboration, cadres logiques, suivi-évaluation.</li>
            <li><strong>3.4 Recherche appliquée :</strong> Études de faisabilité, recherche opérationnelle.</li>
            <li><strong>3.5 Appui institutionnel :</strong> Audit organisationnel, décentralisation.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[#003366] border-b pb-2">4. ORGANISATION ET RESSOURCES HUMAINES</h2>
          <p>La structure repose sur un Associé Principal (10 ans exp.), des Experts techniques seniors (Médecins, Épidémiologistes), des Chargés de projets S&E, et un support administratif rigoureux.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[#003366] border-b pb-2">6. GRILLE TARIFAIRE INDICATIVE</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs text-left border border-slate-100">
              <thead className="bg-slate-50">
                <tr><th className="p-2">Prestation</th><th className="p-2">Tarif (FCFA)</th></tr>
              </thead>
              <tbody>
                <tr><td className="p-2 border-b">Diagnostic sectoriel / étude stratégique</td><td className="p-2 border-b font-bold">1 800 000 – 6 000 000</td></tr>
                <tr><td className="p-2 border-b">Étude économique (coût-efficacité, impact)</td><td className="p-2 border-b font-bold">3 000 000 – 9 000 000</td></tr>
                <tr><td className="p-2 border-b">Élaboration de projet / note conceptuelle</td><td className="p-2 border-b font-bold">900 000 – 2 400 000</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[#003366] border-b pb-2">9. CODE D’ÉTHIQUE ET DE CONDUITE</h2>
          <p>1. Intégrité : Zéro corruption. 2. Confidentialité : Protection stricte des données. 3. Objectivité : Indépendance scientifique. 4. Équité : Inclusion sociale.</p>
        </section>
      </div>
    )
  },
  'echo-pediatrie': {
    id: 'echo-pediatrie' as DocumentId,
    title: 'Audit Projet Écho-Pédiatrie',
    subtitle: 'Association Aide Médicale x Padre Pio',
    sections: {
      forces: {
        title: 'Pertinence & Objectifs du Projet',
        content: (
          <div className="space-y-4">
            <h3 className="font-bold text-slate-900 uppercase text-xs tracking-wider">Référence Originale</h3>
            <p>Améliorer durablement la prise en charge des urgences pédiatriques grâce à l’utilisation structurée de l’échographie clinique.</p>
          </div>
        ),
        rawText: "Écho-Pédiatrie Padre Pio Douala. 1000 enfants/mois. POCUS, réduction mortalité infantile."
      },
      faiblesses: {
        title: 'Problématique & Risques',
        content: (
          <div className="space-y-4">
            <h3 className="font-bold text-slate-900 uppercase text-xs tracking-wider">Référence Originale</h3>
            <p>Retards diagnostiques, insuffisance de personnel formé et dépendance à des examens coûteux.</p>
          </div>
        ),
        rawText: "Retards diagnostiques, manque de formation échographie pédiatrique, vulnérabilité financière."
      },
      propositions: {
        title: 'Budget & Pérennisation',
        content: (
          <div className="space-y-4">
            <h3 className="font-bold text-slate-900 uppercase text-xs tracking-wider">Référence Originale</h3>
            <p>Budget 12M FCFA. Pérennisation par quote-part symbolique (tarif social) pour la maintenance.</p>
          </div>
        ),
        rawText: "Budget 12M FCFA. Maintenance par tarif social. Formation continue intégrée."
      }
    },
    originalRef: (
      <div className="prose prose-slate max-w-none space-y-8 font-inter text-slate-700 leading-relaxed text-sm">
          <header className="text-center border-b pb-6 mb-8">
              <p className="text-[#C0A062] font-black uppercase tracking-[0.4em] text-[8px] mb-1">PROJET DE SANTÉ HOSPITALIER</p>
              <h1 className="text-2xl md:text-3xl font-serif text-[#003366] uppercase mb-4">Écho-Pédiatrie : Sauver des Vies par l'Innovation</h1>
              <div className="flex flex-wrap justify-center gap-4 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                <span>Porteur : Association Aide Médicale</span>
                <span>Partenaire : Hôpital Padre Pio</span>
                <span>Localisation : Douala</span>
              </div>
          </header>

          <section>
              <h2 className="text-xl font-bold text-[#003366] border-b pb-2">1. PRÉSENTATION DE L’ÉTABLISSEMENT</h2>
              <p>L’Hôpital Catholique Padre Pio accueille en moyenne 1 000 enfants par mois. Les urgences pédiatriques constituent un service stratégique confronté à une forte affluence et à la nécessité de décisions rapides.</p>
          </section>

          <section>
              <h2 className="text-xl font-bold text-[#003366] border-b pb-2">2. CONTEXTE ET JUSTIFICATION</h2>
              <p>Urgences marquées par des pathologies infectieuses et respiratoires. Accès limité à l’imagerie lourde et contraintes financières familiales. L’échographie au lit du patient (POCUS) est la solution clé : rapide, non invasive et peu coûteuse.</p>
          </section>

          <section>
              <h2 className="text-xl font-bold text-[#003366] border-b pb-2">3. PROBLÉMATIQUE</h2>
              <p>Retards diagnostiques, insuffisance de personnel formé, dépendance à des examens coûteux, risque d’hospitalisations inutiles.</p>
          </section>

          <section>
              <h2 className="text-xl font-bold text-[#003366] border-b pb-2">4. OBJECTIFS</h2>
              <p><strong>Général :</strong> Améliorer durablement la prise en charge pédiatrique via POCUS.</p>
              <p className="mt-2"><strong>Spécifiques :</strong> Réduire le délai diagnostique, renforcer les compétences, optimiser le triage, réduire la mortalité évitable.</p>
          </section>

          <section>
              <h2 className="text-xl font-bold text-[#003366] border-b pb-2">7. BUDGET PRÉVISIONNEL</h2>
              <table className="min-w-full text-xs text-left border border-slate-100">
                  <thead className="bg-[#003366] text-white">
                      <tr><th className="p-2">Poste</th><th className="p-2">Description</th><th className="p-2">Montant (FCFA)</th></tr>
                  </thead>
                  <tbody>
                      <tr><td className="p-2 border-b">Équipements</td><td className="p-2 border-b">02 Échographes portables + Sondes</td><td className="p-2 border-b font-bold">9 000 000</td></tr>
                      <tr><td className="p-2 border-b">Formation</td><td className="p-2 border-b">Experts (5 jours)</td><td className="p-2 border-b font-bold">1 500 000</td></tr>
                      <tr><td className="p-2 border-b">Suivi</td><td className="p-2 border-b">Rapports (1 an)</td><td className="p-2 border-b font-bold">1 000 000</td></tr>
                      <tr className="bg-slate-50"><td colSpan={2} className="p-2 font-bold">TOTAL</td><td className="p-2 font-bold text-[#003366]">12 000 000 FCFA</td></tr>
                  </tbody>
              </table>
          </section>

          <section>
              <h2 className="text-xl font-bold text-[#003366] border-b pb-2">9. PÉRENNISATION</h2>
              <p>Quote-part symbolique perçue sur chaque examen pour constituer un fonds de maintenance. Intégration de la formation au cursus d'accueil du personnel.</p>
          </section>

          <section>
              <h2 className="text-xl font-bold text-[#003366] border-b pb-2">10. CONCLUSION</h2>
              <p>Ce projet allie expertise technique et mission humanitaire pour offrir aux enfants les plus vulnérables des soins de standard international.</p>
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

  // Synchronisation LocalStorage
  useEffect(() => {
    const saved = localStorage.getItem('dr_jongwane_audit_data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.aiResponses) setAiResponses(parsed.aiResponses);
        if (parsed.notes) setNotes(parsed.notes);
      } catch (e) { console.error("Error loading data", e); }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('dr_jongwane_audit_data', JSON.stringify({ aiResponses, notes }));
  }, [aiResponses, notes]);

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
    } catch (err) { alert("Erreur d'analyse."); } finally {
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

  const handleNoteChange = (topic: string, val: string) => {
    if (!selectedDoc) return;
    setNotes(prev => ({ ...prev, [`${selectedDoc}-${topic}`]: val }));
  };

  if (!selectedDoc) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-6 font-inter">
        <div className="mb-12 text-center animate-in fade-in slide-in-from-top-4 duration-700">
          <h1 className="text-5xl font-serif text-[#003366] mb-4 uppercase tracking-tighter">SERVICE D'AUDIT Dr JONGWANE</h1>
          <h2 className="text-2xl font-serif text-[#C0A062] uppercase italic">Portail d'Expertise Stratégique</h2>
          <div className="w-24 h-1.5 bg-[#C0A062] mx-auto rounded-full mt-6"></div>
        </div>
        <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-8">
          {Object.values(documents).map((doc) => (
            <div key={doc.id} className="group bg-white p-8 rounded-3xl shadow-xl border-t-8 border-[#003366] flex flex-col items-center text-center transition-all hover:scale-105">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-6 text-3xl">{doc.id === 'sphinx' ? '🏛️' : '🏥'}</div>
              <h2 className="font-serif text-xl text-[#003366] mb-4">{doc.title}</h2>
              <button onClick={() => setSelectedDoc(doc.id)} className="mt-auto w-full bg-[#003366] text-white py-3 rounded-xl font-bold uppercase tracking-widest text-xs">Accéder à l'Audit</button>
            </div>
          ))}
        </div>
        <p className="mt-12 text-[10px] font-bold uppercase tracking-widest text-slate-400">DR JONGWANE • DOUALA 2026</p>
      </div>
    );
  }

  const currentDoc = documents[selectedDoc];
  const currentResponses = aiResponses[selectedDoc] || {};

  return (
    <div className="min-h-screen py-8 md:py-16 px-4 bg-[#f1f5f9] font-inter">
      <button onClick={() => setSelectedDoc(null)} className="no-print fixed bottom-10 left-10 z-50 bg-white text-[#003366] px-6 py-3 rounded-full shadow-2xl font-bold border active:scale-95 transition-all">
        ⬅ Retour Menu
      </button>
      
      <div className="document-container max-w-[210mm] mx-auto bg-white p-6 md:p-[25mm_22mm] shadow-2xl relative border-t-[14px] border-[#003366] rounded-t-2xl overflow-hidden">
        <header className="text-center mb-8 border-b border-slate-50 pb-8">
          <h1 className="font-serif text-[#003366] text-3xl md:text-5xl uppercase tracking-tighter mb-2">{currentDoc.title}</h1>
          <div className="inline-block px-5 py-1.5 bg-slate-50 border rounded-full text-[#C0A062] font-black text-[10px] uppercase tracking-[0.4em]">{currentDoc.subtitle}</div>
        </header>

        <nav className="no-print flex justify-center mb-12 border-b">
          <button onClick={() => setActiveTab('audit')} className={`px-8 py-4 text-xs font-bold uppercase tracking-widest relative ${activeTab === 'audit' ? 'text-[#003366]' : 'text-slate-400'}`}>
            Audit & Comparaison {activeTab === 'audit' && <div className="absolute bottom-0 left-0 w-full h-1 bg-[#003366]"></div>}
          </button>
          <button onClick={() => setActiveTab('original')} className={`px-8 py-4 text-xs font-bold uppercase tracking-widest relative ${activeTab === 'original' ? 'text-[#003366]' : 'text-slate-400'}`}>
            Référence Originale {activeTab === 'original' && <div className="absolute bottom-0 left-0 w-full h-1 bg-[#003366]"></div>}
          </button>
        </nav>

        {activeTab === 'audit' ? (
          <div className="space-y-24">
            {(['forces', 'faiblesses', 'propositions'] as SectionTopic[]).map((topic, index) => {
              const response = currentResponses[topic];
              return (
                <section key={topic}>
                  <div className="flex justify-between items-center mb-6 border-b pb-4">
                    <div className="flex items-center gap-4">
                      <span className="bg-[#003366] text-white w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs">0{index + 1}</span>
                      <h2 className="font-serif text-2xl text-[#003366]">{currentDoc.sections[topic].title}</h2>
                    </div>
                    <div className="flex gap-2">
                        {selectedDoc === 'sphinx' && topic === 'propositions' && (
                          <button onClick={() => handleAIRequest(topic, "Élabore spécifiquement sur les opportunités liées aux appels d'offres CSU pour SPHINX Consulting au Cameroun.")} className="no-print text-[9px] bg-amber-600 text-white px-5 py-2.5 rounded-full hover:bg-black transition-all font-bold uppercase tracking-widest">
                            <span>💡 Stratégie CSU</span>
                          </button>
                        )}
                        <button onClick={() => handleAIRequest(topic)} className="no-print text-[9px] bg-[#003366] text-white px-5 py-2.5 rounded-full hover:bg-black transition-all font-bold uppercase tracking-widest">
                          <span>✨ Avis IA Vocal</span>
                        </button>
                    </div>
                  </div>

                  <div className={`grid gap-8 ${response ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
                    <div className="prose prose-slate max-w-none text-slate-700 text-sm leading-relaxed p-6 bg-slate-50 rounded-2xl border border-slate-100">
                      <h3 className="font-bold text-[#003366] uppercase text-[10px] tracking-widest mb-4 opacity-50 italic">Texte Original</h3>
                      {currentDoc.sections[topic].content}
                    </div>
                    
                    {response && (
                      <div className="h-[500px] overflow-hidden">
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
                  <NoteArea 
                    docId={selectedDoc} 
                    secId={topic} 
                    value={notes[`${selectedDoc}-${topic}`] || ''}
                    onChange={(val) => handleNoteChange(topic, val)}
                  />
                </section>
              );
            })}
          </div>
        ) : (
          <div className="animate-in fade-in duration-700 p-4 border rounded-3xl bg-slate-50">
            {currentDoc.originalRef}
          </div>
        )}

        <footer className="mt-20 pt-10 border-t flex justify-between items-center opacity-40 text-[9px] font-black uppercase tracking-widest no-print">
          <div>Dr JONGWANE • Audit Engine</div>
          <div>Douala 2026</div>
        </footer>
      </div>
    </div>
  );
};

export default App;
