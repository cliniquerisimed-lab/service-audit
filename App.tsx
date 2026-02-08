
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

// --- Données Initiales ---

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
            <h3 className="font-bold text-slate-900 uppercase text-xs tracking-wider">Texte de référence</h3>
            <p>Le document SPHINX présente un cabinet pluridisciplinaire spécialisé dans l'accompagnement stratégique institutions publiques au Cameroun.</p>
          </div>
        ),
        rawText: "SPHINX Consulting, cabinet de conseil stratégique santé publique Cameroun. Vision: Amélioration systèmes sociaux. Mission: Appui décideurs projets fort impact. Forfaits 3-9M FCFA."
      },
      faiblesses: {
        title: 'Domaines & Évaluation des Risques',
        content: (
          <div className="space-y-4">
            <h3 className="font-bold text-slate-900 uppercase text-xs tracking-wider">Texte de référence</h3>
            <p>Le cabinet cible la santé publique et l'économie appliquée mais fait face à une concurrence locale forte.</p>
          </div>
        ),
        rawText: "Domaines: Santé publique, Économie santé, Gestion projets. Risques: Dépendance consultants externes, concurrence locale forte, taux de survie cabinets 40%."
      },
      propositions: {
        title: 'Propositions & Grille Tarifaire',
        content: (
          <div className="space-y-4">
            <h3 className="font-bold text-slate-900 uppercase text-xs tracking-wider">Texte de référence</h3>
            <p>Grille tarifaire flexible entre 1.8M et 6M FCFA pour les études stratégiques.</p>
          </div>
        ),
        rawText: "Matrice activités: Contrats consulting ONG, Ministères. Grille: 1.8M-9M FCFA selon études. Opportunité majeure: Couverture Santé Universelle (CSU)."
      }
    },
    originalRef: (
      <div className="prose prose-slate max-w-none space-y-8 font-inter text-slate-700 leading-relaxed text-sm">
        <header className="text-center border-b pb-8 mb-10">
          <h1 className="text-3xl font-serif text-[#003366] uppercase mb-1">SPHINX CONSULTING</h1>
          <p className="text-[#C0A062] font-bold uppercase tracking-widest text-xs">Cabinet de conseil stratégique, santé publique et développement</p>
        </header>

        <section>
          <h2 className="text-lg font-bold text-[#003366] border-b pb-2 mb-4">1. PRÉSENTATION GÉNÉRALE</h2>
          <p>SPHINX Consulting est un cabinet de conseil pluridisciplinaire spécialisé dans l’accompagnement stratégique des institutions publiques, organisations internationales, ONG, associations et structures privées à impact social. Le cabinet intervient principalement dans les domaines de la santé publique, du développement humain, de l’économie appliquée et de la gouvernance des projets et politiques publiques.</p>
          <p className="mt-4">Dans un contexte marqué par des ressources limitées, des besoins sociaux croissants et des exigences accrues des partenaires techniques et financiers, SPHINX Consulting se positionne comme un actor de référence offrant des solutions adaptées, rigoureuses et orientées vers l’impact.</p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[#003366] border-b pb-2 mb-4">2. VISION, MISSION ET VALEURS</h2>
          <h3 className="font-bold text-slate-900 mb-1">Vision</h3>
          <p>Contribuer durablement à l’amélioration des systèmes sociaux et sanitaires par un conseil stratégique fondé sur l’expertise, l’innovation et l’équité.</p>
          
          <h3 className="font-bold text-slate-900 mt-4 mb-1">Mission</h3>
          <p>Appuyer les décideurs et les organisations dans la conception, la mise en œuvre et l’évaluation de politiques, programmes et projets à fort impact social, en tenant compte des réalités locales et des standards internationaux.</p>
          
          <h3 className="font-bold text-slate-900 mt-4 mb-1">Valeurs</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>Excellence technique et scientifique</li>
            <li>Éthique et intégrité professionnelle</li>
            <li>Approche contextuelle et participative</li>
            <li>Orientation résultats et impact</li>
            <li>Promotion de l’équité et des droits humains</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[#003366] border-b pb-2 mb-4">3. DOMAINES D’INTERVENTION ET ACTIVITÉS</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-bold text-slate-900">3.1 Conseil en santé publique et systèmes de santé</h3>
              <ul className="list-disc pl-5 text-xs">
                <li>Diagnostic et analyse des systèmes de santé.</li>
                <li>Élaboration et appui aux politiques sanitaires.</li>
                <li>Planification stratégique sanitaire.</li>
                <li>Renforcement des soins de santé primaires.</li>
                <li>Programmes de santé maternelle, infantile et adolescente.</li>
                <li>Appui à la Couverture Santé Universelle (CSU).</li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-slate-900">3.2 Économie de la santé et études socio-économiques</h3>
              <ul className="list-disc pl-5 text-xs">
                <li>Études coût-efficacité et coût-bénéfice.</li>
                <li>Analyses d’impact économique des programmes de santé.</li>
                <li>Évaluations économiques des technologies et innovations médicales.</li>
                <li>Appui à la prise de décision budgétaire.</li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-slate-900">3.3 Montage, gestion et évaluation de projets</h3>
              <ul className="list-disc pl-5 text-xs">
                <li>Élaboration de projets et notes conceptuelles.</li>
                <li>Développement de cadres logiques et théories du changement.</li>
                <li>Appui à la mobilisation des financements.</li>
                <li>Suivi-évaluation des projets et programmes.</li>
              </ul>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[#003366] border-b pb-2 mb-4">4. ORGANISATION ET RESSOURCES HUMAINES</h2>
          <p>Le cabinet repose sur une structure d'experts hautement qualifiés :</p>
          <ol className="list-decimal pl-5 space-y-2 mt-2">
            <li><strong>Direction et coordination :</strong> Un Associé Principal (10 ans d'expérience min.) assurant le leadership et le réseau institutionnel.</li>
            <li><strong>Experts techniques seniors :</strong> Médecins, épidémiologistes et économistes de la santé (niveau Master/Doctorat).</li>
            <li><strong>Chargés de projets et S&E :</strong> Spécialistes des cadres logiques et des exigences bailleurs.</li>
            <li><strong>Chargés de recherche :</strong> Experts en méthodes quantitatives et qualitatives.</li>
            <li><strong>Support administratif et communication :</strong> Gestion financière rigoureuse et plaidoyer institutionnel.</li>
          </ol>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[#003366] border-b pb-2 mb-4">5. MATRICE DES ACTIVITÉS ET REVENUS</h2>
          <table className="min-w-full text-xs border border-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="border p-2">Domaines</th>
                <th className="border p-2">Activités clés</th>
                <th className="border p-2">Clients cibles</th>
                <th className="border p-2">Revenus</th>
              </tr>
            </thead>
            <tbody>
              <tr><td className="border p-2 font-bold">Santé publique</td><td className="border p-2">Diagnostics, Stratégies</td><td className="border p-2">Ministères, ONG, PTF</td><td className="border p-2">Consulting</td></tr>
              <tr><td className="border p-2 font-bold">Économie santé</td><td className="border p-2">Études impact & coût</td><td className="border p-2">Agences, ONG</td><td className="border p-2">Études</td></tr>
              <tr><td className="border p-2 font-bold">Gestion projets</td><td className="border p-2">Montage, S&E</td><td className="border p-2">Associations, Bailleurs</td><td className="border p-2">Honoraires</td></tr>
            </tbody>
          </table>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[#003366] border-b pb-2 mb-4">6. GRILLE TARIFAIRE INDICATIVE</h2>
          <table className="min-w-full text-xs border border-slate-200 mb-4">
            <thead className="bg-slate-50 font-bold uppercase text-[8px]">
              <tr><th className="border p-2 text-left">Type de prestation</th><th className="border p-2">Tarif (FCFA)</th></tr>
            </thead>
            <tbody>
              <tr><td className="border p-2">Diagnostic / étude stratégique</td><td className="border p-2 font-bold">1 800 000 – 6 000 000</td></tr>
              <tr><td className="border p-2">Étude économique (coût, impact)</td><td className="border p-2 font-bold">3 000 000 – 9 000 000</td></tr>
              <tr><td className="border p-2">Évaluation finale ou mi-parcours</td><td className="border p-2 font-bold">2 400 000 – 6 000 000</td></tr>
            </tbody>
          </table>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[#003366] border-b pb-2 mb-4">7. PLAN DE RECRUTEMENT PROGRESSIF</h2>
          <p>SPHINX Consulting adopte une croissance organique pour maîtriser ses coûts fixes :</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong>Phase 1 (Démarrage) :</strong> Équipe cœur de 4-5 personnes (Directeur, RAF, Responsable Technique, Chargé de projet).</li>
            <li><strong>Phase 2 (Consolidation) :</strong> Extension à 6-8 personnes avec l'ajout de chargés de recherche et communication.</li>
            <li><strong>Phase 3 (Expansion) :</strong> 9-12 personnes avec des profils de développement de partenariats "Grands Comptes".</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[#003366] border-b pb-2 mb-4">8. POLITIQUE DE RÉMUNÉRATION (ÉQUIPE PERMANENTE)</h2>
          <table className="min-w-full text-xs border border-slate-200">
            <thead className="bg-slate-50">
              <tr><th className="border p-2">Poste</th><th className="border p-2">Rémunération mensuelle (FCFA)</th></tr>
            </thead>
            <tbody>
              <tr><td className="border p-2">RAF</td><td className="border p-2 font-bold">480 000 – 900 000</td></tr>
              <tr><td className="border p-2">Responsable technique</td><td className="border p-2 font-bold">720 000 – 1 200 000</td></tr>
              <tr><td className="border p-2">Chargé(e) de projets</td><td className="border p-2 font-bold">420 000 – 720 000</td></tr>
            </tbody>
          </table>
          <p className="mt-4 text-[10px] italic">Note : La tarification journalière des consultants associés varie entre 90 000 FCFA et 300 000 FCFA.</p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[#003366] border-b pb-2 mb-4">9. CODE D’ÉTHIQUE ET DE CONDUITE</h2>
          <ol className="list-decimal pl-5 space-y-2 font-bold text-[#003366]">
            <li>Intégrité : Tolérance zéro envers la corruption.</li>
            <li>Confidentialité : Protection stricte des données clients.</li>
            <li>Objectivité : Indépendance totale des analyses.</li>
            <li>Équité : Promotion active de l'approche genre.</li>
          </ol>
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
                <h3 className="font-bold text-slate-900 uppercase text-xs tracking-wider">Texte de référence</h3>
                <p>Projet innovant axé sur l'échographie au lit du patient (POCUS) pour 1000 enfants/mois.</p>
            </div>
        ),
        rawText: "POCUS pour 1000 enfants/mois à Padre Pio Douala. Réduire délai diagnostique. Innovation pédiatrique Douala."
      },
      faiblesses: {
        title: 'Problématique & Risques',
        content: (
            <div className="space-y-4">
                <h3 className="font-bold text-slate-900 uppercase text-xs tracking-wider">Texte de référence</h3>
                <p>Dépendance aux examens coûteux et manque de personnel qualifié pour l'imagerie.</p>
            </div>
        ),
        rawText: "Problématique: Retards diagnostiques, insuffisance personnel formé, contraintes financières familles."
      },
      propositions: {
        title: 'Budget & Pérennisation',
        content: (
            <div className="space-y-4">
                <h3 className="font-bold text-slate-900 uppercase text-xs tracking-wider">Texte de référence</h3>
                <p>Budget de 12M FCFA incluant équipements et formation certifiante.</p>
            </div>
        ),
        rawText: "Budget: 12M FCFA. Pérennisation: Quote-part maintenance, formation continue certificante."
      }
    },
    originalRef: (
        <div className="prose prose-slate max-w-none space-y-8 font-inter text-slate-700 leading-relaxed text-sm">
            <header className="text-center border-b pb-6 mb-8">
                <p className="text-[#C0A062] font-black uppercase tracking-[0.4em] text-[8px] mb-1">PROJET DE SANTÉ HOSPITALIER</p>
                <h1 className="text-2xl md:text-3xl font-serif text-[#003366] uppercase mb-4">Écho-Pédiatrie : Sauver des Vies par l'Innovation</h1>
                <div className="flex flex-wrap justify-center gap-4 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                  <span>Porteur : Aide Médicale (Douala)</span>
                  <span>Partenaire : Padre Pio</span>
                  <span>Février 2026</span>
                </div>
            </header>

            <section>
              <h2 className="text-lg font-bold text-[#003366] border-b pb-2 mb-4">1. PRÉSENTATION DE L’ÉTABLISSEMENT</h2>
              <p>L’Hôpital Catholique Padre Pio est une structure sanitaire à forte vocation sociale et humanitaire, accueillant en moyenne 1 000 enfants par mois, répartis entre nouveaux-nés, nourrissons et enfants. Les urgences pédiatriques constituent un service stratégique de l’hôpital, confronté à une forte affluence, à la diversité des pathologies aiguës et à la nécessité de décisions rapides pour des patients particulièrement vulnérables.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#003366] border-b pb-2 mb-4">2. CONTEXTE ET JUSTIFICATION</h2>
              <p>Les urgences pédiatriques à Douala sont marquées par :</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Une charge élevée de pathologies infectieuses, respiratoires et digestives.</li>
                <li>Des urgences néonatales nécessitant des décisions immédiates.</li>
                <li>Un accès limité à l’imagerie lourde (scanner) et des contraintes financières pour les familles.</li>
              </ul>
              <p className="mt-4">L’échographie clinique au lit du patient (POCUS) représente une solution clé : non invasive, sans irradiation, rapide et peu coûteuse. Son intégration systématique permettra d’améliorer la sécurité et l’équité des soins.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#003366] border-b pb-2 mb-4">3. PROBLÉMATIQUE</h2>
              <ul className="list-disc pl-5 space-y-2">
                <li>Retards diagnostiques dans les urgences vitales.</li>
                <li>Difficultés de triage rapide des nouveau-nés graves.</li>
                <li>Dépendance à des examens coûteux ou indisponibles.</li>
                <li>Insuffisance de personnel formé à l’échographie pédiatrique.</li>
                <li>Risque d’hospitalisations inutiles ou de transferts tardifs.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#003366] border-b pb-2 mb-4">4. OBJECTIFS DU PROJET</h2>
              <p><strong>4.1 Objectif général :</strong> Améliorer durablement la prise en charge des urgences pédiatriques à l’Hôpital Catholique Padre Pio grâce à l’utilisation structurée de l’échographie clinique.</p>
              <p className="mt-4"><strong>4.2 Objectifs spécifiques :</strong></p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Réduire le délai diagnostique des urgences vitales.</li>
                <li>Renforcer les compétences techniques du personnel soignant.</li>
                <li>Optimiser le triage et l'orientation des patients.</li>
                <li>Réduire la mortalité infantile évitable.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#003366] border-b pb-2 mb-4">5. BÉNÉFICIAIRES</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Directs :</strong> Environ 1 000 enfants/mois et le personnel médical formé.</li>
                <li><strong>Indirects :</strong> Familles (réduction des coûts) et la communauté locale de Douala.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#003366] border-b pb-2 mb-4">6. DESCRIPTION DES ACTIVITÉS</h2>
              <div className="space-y-4">
                <p><strong>Activité 1 : Diagnostic organisationnel :</strong> Analyse des flux et identification des besoins prioritaires des équipes cibles.</p>
                <p><strong>Activité 2 : Acquisition des équipements :</strong> Achat de deux (02) échographes portables de type POCUS avec sondes pédiatriques et néonatales haute résolution.</p>
                <p><strong>Activité 3 : Formation et renforcement des capacités :</strong> Ateliers théoriques et pratiques certifiants pour les médecins et infirmiers spécialisés.</p>
                <p><strong>Activité 4 : Mise en œuvre opérationnelle :</strong> Intégration de l’échographie dans les protocoles de soins quotidiens de l'hôpital.</p>
                <p><strong>Activité 5 : Suivi, Évaluation et Capitalisation :</strong> Suivi hebdomadaire (collecte de données), Audit mensuel (revue des dossiers cliniques) et Rapport final (analyse de réduction des transferts).</p>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#003366] border-b pb-2 mb-4">7. BUDGET PRÉVISIONNEL ESTIMATIF</h2>
              <table className="min-w-full text-[10px] border border-slate-200">
                <thead className="bg-[#003366] text-white uppercase">
                  <tr><th className="border p-2 text-left">Poste</th><th className="border p-2">Description</th><th className="border p-2">Montant (FCFA)</th></tr>
                </thead>
                <tbody className="divide-y">
                  <tr><td className="border p-2 font-bold">Équipements</td><td className="border p-2">02 Échographes portables + Sondes</td><td className="border p-2 text-right">9 000 000</td></tr>
                  <tr><td className="border p-2 font-bold">Formation</td><td className="border p-2">Experts formateurs (5 jours)</td><td className="border p-2 text-right">1 500 000</td></tr>
                  <tr><td className="border p-2 font-bold">Aménagement</td><td className="border p-2">Sécurisation et stockage</td><td className="border p-2 text-right">500 000</td></tr>
                  <tr><td className="border p-2 font-bold">Suivi-Éval</td><td className="border p-2">Collecte de données (1 an)</td><td className="border p-2 text-right">1 000 000</td></tr>
                  <tr className="bg-slate-50 font-bold"><td colSpan={2} className="border p-2">TOTAL GÉNÉRAL</td><td className="border p-2 text-right text-[#003366]">12 000 000 FCFA</td></tr>
                </tbody>
              </table>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#003366] border-b pb-2 mb-4">8. CHRONOGRAMME (6 MOIS)</h2>
              <ol className="list-decimal pl-5 space-y-1">
                <li>Mois 1 : Diagnostic et commande du matériel.</li>
                <li>Mois 2 : Réception des équipements et installation.</li>
                <li>Mois 3 : Formation intensive du personnel.</li>
                <li>Mois 4-5 : Phase pilote avec mentorat clinique.</li>
                <li>Mois 6 : Évaluation de la phase initiale et ajustements.</li>
              </ol>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#003366] border-b pb-2 mb-4">9. PÉRENNISATION DU PROJET</h2>
              <p>Pour garantir la survie du projet après le financement initial, une quote-part symbolique sur chaque examen (tarif social) sera perçue pour constituer un fonds de maintenance des appareils. De plus, la formation sera intégrée au cursus d'accueil de tout nouveau personnel soignant de l'hôpital.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#003366] border-b pb-2 mb-4">10. CONCLUSION</h2>
              <p>L’intégration de l’échographie aux urgences pédiatriques de l’Hôpital Padre Pio est une avancée majeure pour la santé infantile à Douala. Ce projet, porté par l'Association Aide Médicale, allie expertise technique et mission humanitaire pour offrir aux enfants les plus vulnérables des soins de standard international.</p>
            </section>
        </div>
    )
  }
};

// --- Application Principale ---

const App: React.FC = () => {
  const [documents, setDocuments] = useState<Record<string, DocumentData>>(INITIAL_DOCUMENTS);
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'audit' | 'original'>('audit');
  
  const [aiResponses, setAiResponses] = useState<Record<string, Record<string, string>>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  
  const [audioBuffers, setAudioBuffers] = useState<Record<string, AudioBuffer | null>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [showDataSettings, setShowDataSettings] = useState(false);

  const [newDoc, setNewDoc] = useState({ title: '', subtitle: '', content: '' });

  // Persistence logic...
  useEffect(() => {
    const savedData = localStorage.getItem('dr_jongwane_audit_data');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        if (parsed.documents) setDocuments(prev => ({ ...prev, ...parsed.documents }));
        if (parsed.aiResponses) setAiResponses(parsed.aiResponses);
        if (parsed.notes) setNotes(parsed.notes);
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    const customDocs = Object.fromEntries(
      Object.entries(documents).filter(([id]) => id.toString().startsWith('custom-'))
    );
    const dataToSave = { documents: customDocs, aiResponses, notes };
    localStorage.setItem('dr_jongwane_audit_data', JSON.stringify(dataToSave));
  }, [documents, aiResponses, notes]);

  const handleExport = () => {
    const dataStr = JSON.stringify({ documents, aiResponses, notes }, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `audit_expert_${new Date().toISOString().split('T')[0]}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (imported.documents) setDocuments(prev => ({ ...prev, ...imported.documents }));
        if (imported.aiResponses) setAiResponses(prev => ({ ...prev, ...imported.aiResponses }));
        if (imported.notes) setNotes(prev => ({ ...prev, ...imported.notes }));
        alert("Importation réussie !");
      } catch (err) { alert("Format JSON invalide."); }
    };
    reader.readAsText(file);
  };

  const handleClearAll = () => {
    if (window.confirm("Tout effacer ?")) {
      localStorage.removeItem('dr_jongwane_audit_data');
      window.location.reload();
    }
  };

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

  const handleSubmitNewDoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDoc.title || !newDoc.content) return;
    const id = 'custom-' + Date.now();
    const createdDoc: DocumentData = {
      id: id as any,
      title: newDoc.title,
      subtitle: newDoc.subtitle || "Soumis par l'utilisateur",
      sections: {
        forces: { title: "Forces", content: <p className="italic text-slate-500">Audit requis.</p>, rawText: newDoc.content },
        faiblesses: { title: "Risques", content: <p className="italic text-slate-500">Audit requis.</p>, rawText: newDoc.content },
        propositions: { title: "Stratégie", content: <p className="italic text-slate-500">Audit requis.</p>, rawText: newDoc.content }
      },
      originalRef: <div className="p-8 border rounded-2xl bg-slate-50 leading-relaxed whitespace-pre-wrap text-sm text-slate-700 font-inter">{newDoc.content}</div>
    };
    setDocuments(prev => ({ ...prev, [id]: createdDoc }));
    setSelectedDoc(id);
    setShowSubmitForm(false);
  };

  if (!selectedDoc) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-6 font-inter">
        {showDataSettings && (
          <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
            <div className="bg-white max-w-md w-full rounded-3xl p-8 shadow-2xl animate-in zoom-in-95 duration-200">
              <h3 className="text-xl font-serif text-[#003366] mb-6 flex items-center gap-2"><span>⚙️</span> Données</h3>
              <div className="space-y-4">
                <button onClick={handleExport} className="w-full flex items-center justify-between p-4 bg-slate-50 rounded-2xl"><span>Exporter JSON</span><span>📤</span></button>
                <label className="w-full flex items-center justify-between p-4 bg-slate-50 rounded-2xl cursor-pointer"><span>Importer JSON</span><span>📥</span><input type="file" accept=".json" onChange={handleImport} className="hidden" /></label>
                <button onClick={handleClearAll} className="w-full flex items-center justify-between p-4 bg-red-50 text-red-600 rounded-2xl"><span>Réinitialiser</span><span>🗑️</span></button>
              </div>
              <button onClick={() => setShowDataSettings(false)} className="mt-8 w-full py-3 bg-[#003366] text-white rounded-xl font-bold uppercase tracking-widest text-xs">Fermer</button>
            </div>
          </div>
        )}
        <div className="mb-12 text-center">
          <h1 className="text-5xl font-serif text-[#003366] mb-4 uppercase tracking-tighter">SERVICE D'AUDIT Dr JONGWANE</h1>
          <h2 className="text-2xl font-serif text-[#C0A062] uppercase italic">Portail d'Expertise Stratégique</h2>
          <div className="w-24 h-1.5 bg-[#C0A062] mx-auto rounded-full mt-6"></div>
        </div>
        <div className="max-w-5xl w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {Object.values(documents).map((doc) => (
            <div key={doc.id} className="group bg-white p-8 rounded-3xl shadow-xl border-t-8 border-[#003366] flex flex-col items-center text-center transition-all hover:scale-105">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-6 text-3xl">{doc.id === 'sphinx' ? '🏛️' : doc.id === 'echo-pediatrie' ? '🏥' : '📝'}</div>
              <h2 className="font-serif text-xl text-[#003366] mb-4 h-14 overflow-hidden">{doc.title}</h2>
              <button onClick={() => setSelectedDoc(doc.id)} className="mt-auto w-full bg-[#003366] text-white py-3 rounded-xl font-bold uppercase tracking-widest text-xs">Auditer</button>
            </div>
          ))}
          <div className="bg-slate-50 p-8 rounded-3xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center cursor-pointer" onClick={() => setShowSubmitForm(true)}>
            <div className="text-3xl mb-2">➕</div>
            <h2 className="font-bold text-slate-700">Nouveau Dossier</h2>
          </div>
        </div>
        <div className="mt-12 flex gap-6 text-[10px] font-bold uppercase tracking-widest text-slate-400 no-print">
            <button onClick={() => setShowDataSettings(true)}>Gérer Données</button>
            <span>DR JONGWANE • 2026</span>
        </div>
        {showSubmitForm && (
          <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4">
             <div className="bg-white max-w-2xl w-full p-8 rounded-3xl">
                <form onSubmit={handleSubmitNewDoc} className="space-y-4">
                  <h2 className="text-2xl font-serif text-[#003366] mb-6">Nouveau Document</h2>
                  <input required type="text" value={newDoc.title} onChange={e => setNewDoc({...newDoc, title: e.target.value})} className="w-full p-4 border rounded-2xl" placeholder="Titre" />
                  <textarea required rows={8} value={newDoc.content} onChange={e => setNewDoc({...newDoc, content: e.target.value})} className="w-full p-4 border rounded-2xl" placeholder="Texte complet..." />
                  <div className="flex gap-4">
                    <button type="submit" className="flex-1 bg-amber-600 text-white py-4 rounded-xl font-bold uppercase">Lancer l'Audit</button>
                    <button type="button" onClick={() => setShowSubmitForm(false)} className="px-8 bg-slate-100 rounded-xl">Annuler</button>
                  </div>
                </form>
             </div>
          </div>
        )}
      </div>
    );
  }

  const currentDoc = documents[selectedDoc];
  const currentResponses = aiResponses[selectedDoc] || {};

  return (
    <div className="min-h-screen py-8 md:py-16 px-4 bg-[#f1f5f9] font-inter">
      <button onClick={() => { setSelectedDoc(null); setAudioBuffers({}); }} className="no-print fixed bottom-10 left-10 z-50 bg-white text-[#003366] px-6 py-3 rounded-full shadow-2xl font-bold border active:scale-90 transition-all">
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
                          <button onClick={() => handleAIRequest(topic, "Élabore spécifiquement sur les opportunités liées aux appels d'offres CSU pour SPHINX Consulting au Cameroun. Propose des stratégies d'approche concrètes (lobbying, expertise technique, partenariats).")} className="no-print text-[9px] bg-amber-600 text-white px-5 py-2.5 rounded-full hover:bg-black transition-all font-bold uppercase tracking-widest flex items-center gap-2">
                            <span>💡 Stratégie CSU Expert</span>
                          </button>
                        )}
                        <button onClick={() => handleAIRequest(topic)} className="no-print text-[9px] bg-[#003366] text-white px-5 py-2.5 rounded-full hover:bg-black transition-all font-bold uppercase tracking-widest">
                          <span>✨ Avis IA Vocal</span>
                        </button>
                    </div>
                  </div>

                  <div className={`grid gap-8 ${response ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
                    <div className="prose prose-slate max-w-none text-slate-700 text-sm leading-relaxed p-6 bg-slate-50 rounded-2xl border border-slate-100">
                      <h3 className="font-bold text-[#003366] uppercase text-[10px] tracking-widest mb-4 opacity-50">Texte Original / Référence</h3>
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
          <div className="animate-in fade-in duration-700 p-8 border rounded-3xl bg-slate-50">
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
