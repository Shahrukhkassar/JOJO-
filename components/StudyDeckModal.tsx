'use client';

import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  X,
  Sparkles,
  HelpCircle,
  Bookmark,
  Trash2,
  LogIn,
  Layers,
} from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, removeStudyNote, FirestoreStudyNote, handleFirestoreError, OperationType } from '@/lib/firebase';
import { useFirebase } from '@/components/FirebaseProvider';

interface StudyDeckProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTopic: (topicPrompt: string) => void;
}

interface BamsTopic {
  title: string;
  category: 'Kriya Sharir' | 'Dravyaguna' | 'Rachana' | 'English & Lang';
  description: string;
  keyPoints: string[];
  samplePrompt: string;
  quizPrompt: string;
}

const TOPICS: BamsTopic[] = [
  {
    title: 'Tridosha Siddhanta (Vata, Pitta, Kapha)',
    category: 'Kriya Sharir',
    description: 'The foundation of Ayurvedic physiology governing movement, metabolism, and structure.',
    keyPoints: [
      'Vata: Akasha + Vayu (Movement, nervous system)',
      'Pitta: Agni + Jala (Digestion, heat, metabolism)',
      'Kapha: Prithvi + Jala (Lubrication, stability, immunity)',
    ],
    samplePrompt: 'Jojo, please explain the Tridosha Siddhanta (Vata, Pitta, Kapha) with practical daily life examples in simple Hinglish.',
    quizPrompt: 'Jojo, please quiz me on Tridosha characteristics and their sub-types (Upadoshas).',
  },
  {
    title: 'Sapta Dhatu (The 7 Tissue Layers)',
    category: 'Kriya Sharir',
    description: 'Sequential nourishment of bodily tissues: Rasa, Rakta, Mamsa, Meda, Asthi, Majja, Shukra.',
    keyPoints: [
      'Rasa (Plasma/Lymph) -> Preenana (Nourishment)',
      'Rakta (Blood cells) -> Jeevana (Life vigor)',
      'Mamsa (Muscle) -> Lepana (Covering/Movement)',
      'Ojas is the supreme essence of all 7 Dhatus',
    ],
    samplePrompt: 'Jojo, can you teach me the sequence of Sapta Dhatus and how Dhatu Poshan Nyaya works?',
    quizPrompt: 'Jojo, give me a BAMS quiz question on Sapta Dhatus and Upadhatus.',
  },
  {
    title: 'Agni (The Metabolic Digestive Fire)',
    category: 'Kriya Sharir',
    description: 'The core bio-fire determining longevity, health, and disease resistance (Mandagni, Tikshnagni, Vishamagni, Samagni).',
    keyPoints: [
      'Jatharagni: Main digestive fire in stomach/duodenum',
      '7 Dhatvagnis: Tissue level metabolism',
      '5 Bhutagnis: Elemental level conversion',
    ],
    samplePrompt: 'Jojo, explain the 4 states of Agni (Samagni, Vishamagni, Tikshnagni, Mandagni) and how to identify them in clinical practice.',
    quizPrompt: 'Jojo, quiz me on Agni classification in Charaka Samhita.',
  },
  {
    title: 'Dravyaguna: Rasa, Guna, Virya, Vipaka',
    category: 'Dravyaguna',
    description: 'Pharmacological pillars of Ayurvedic medicinal herbs.',
    keyPoints: [
      'Shad Rasa: Madhura, Amla, Lavana, Tikta, Katu, Kashaya',
      'Virya: Sheeta (cooling) vs Ushna (heating)',
      'Vipaka: Post-digestive taste (Madhura, Amla, Katu)',
    ],
    samplePrompt: 'Jojo, explain how Shad Rasa (6 tastes) affect Vata, Pitta, and Kapha with an easy-to-remember cheat sheet.',
    quizPrompt: 'Jojo, test my knowledge of Dravyaguna (Virya and Vipaka of common herbs like Ashwagandha and Tulsi).',
  },
  {
    title: 'Rachana Sharir: Srotas & Marmas',
    category: 'Rachana',
    description: 'Micro/macro channels of circulation and vital points of human anatomy.',
    keyPoints: [
      '107 Marmas categorized by location and injury consequence',
      'Pranavaha, Annavaha, Udakavaha, Rasavaha Srotas',
      'Mula Sthana (root sources) of channels',
    ],
    samplePrompt: 'Jojo, describe the clinical significance of Marma points and their classifications in Sushruta Samhita.',
    quizPrompt: 'Jojo, quiz me on Srotomula (root organs of Srotas) for my BAMS exam.',
  },
  {
    title: 'English Fluency & Gentle Grammar Practice',
    category: 'English & Lang',
    description: 'Conversational confidence, medical consultation phrasing, and spoken practice.',
    keyPoints: [
      'Doctor-patient conversation templates in English',
      'Clear phrasing without fear of mistakes',
      'Expressing diagnosis and wellness advice naturally',
    ],
    samplePrompt: 'Jojo, let us practice a mock doctor-patient consultation in English. You pretend to be a patient feeling fatigue, and I will consult you!',
    quizPrompt: 'Jojo, give me a quick English speaking/grammar exercise to polish my fluency.',
  },
];

export default function StudyDeckModal({ isOpen, onClose, onSelectTopic }: StudyDeckProps) {
  const { user, signIn } = useFirebase();
  const [activeTab, setActiveTab] = useState<string>('All');
  const [savedNotes, setSavedNotes] = useState<FirestoreStudyNote[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);

  useEffect(() => {
    if (!isOpen || !user) {
      return;
    }

    const notesPath = `users/${user.uid}/studyNotes`;
    const notesCollection = collection(db, 'users', user.uid, 'studyNotes');

    const unsubscribe = onSnapshot(
      notesCollection,
      (snapshot) => {
        const notes: FirestoreStudyNote[] = [];
        snapshot.forEach((docSnap) => {
          notes.push(docSnap.data() as FirestoreStudyNote);
        });
        setSavedNotes(notes.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')));
        setLoadingNotes(false);
      },
      (error) => {
        setLoadingNotes(false);
        handleFirestoreError(error, OperationType.LIST, notesPath);
      }
    );

    return () => unsubscribe();
  }, [isOpen, user]);

  const handleDeleteNote = async (noteId: string) => {
    if (!user) return;
    try {
      await removeStudyNote(user.uid, noteId);
    } catch (err) {
      console.error('Failed to delete note:', err);
    }
  };

  if (!isOpen) return null;

  const filteredTopics =
    activeTab === 'All'
      ? TOPICS
      : TOPICS.filter((t) => t.category.toLowerCase().includes(activeTab.toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div
        id="study-deck-modal"
        className="relative w-full max-w-2xl max-h-[85vh] bg-white rounded-2xl shadow-xl flex flex-col overflow-hidden border border-slate-200"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-rose-50/60 via-amber-50/40 to-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-800">
                BAMS &amp; Language Study Hub
              </h2>
              <p className="text-xs text-slate-500">
                Syllabus modules &amp; your synced Firebase study notes
              </p>
            </div>
          </div>
          <button
            id="close-study-deck-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category Filters */}
        <div className="px-5 py-2.5 border-b border-slate-100 flex items-center gap-2 overflow-x-auto text-xs">
          {['All', 'Kriya Sharir', 'Dravyaguna', 'Rachana', 'English & Lang', 'Saved Notes'].map((tab) => (
            <button
              key={tab}
              id={`study-tab-${tab.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-full font-medium transition-colors shrink-0 flex items-center gap-1.5 ${
                activeTab === tab
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab === 'Saved Notes' ? (
                <>
                  <Bookmark className="w-3.5 h-3.5" />
                  <span>Saved Notes ({savedNotes.length})</span>
                </>
              ) : (
                tab
              )}
            </button>
          ))}
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {activeTab === 'Saved Notes' ? (
            <div>
              {!user ? (
                <div className="text-center py-8 px-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <Bookmark className="w-8 h-8 text-rose-400 mx-auto mb-2" />
                  <h4 className="text-sm font-semibold text-slate-800 mb-1">
                    Sign in to save and sync your study notes
                  </h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                    Your saved BAMS mnemonics, concepts, and Jojo insights will be securely saved to Firebase Firestore.
                  </p>
                  <button
                    id="signin-deck-btn"
                    onClick={signIn}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold shadow-xs transition-colors"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    Sign In with Google
                  </button>
                </div>
              ) : loadingNotes ? (
                <div className="text-center py-8 text-xs text-slate-400">Loading saved notes from Firebase...</div>
              ) : savedNotes.length === 0 ? (
                <div className="text-center py-8 px-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <Bookmark className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <h4 className="text-sm font-semibold text-slate-700 mb-1">No saved notes yet</h4>
                  <p className="text-xs text-slate-500">
                    When Jojo shares a study insight or concept during chat, click &quot;Save Note&quot; to keep it here!
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {savedNotes.map((note) => (
                    <div
                      key={note.id}
                      className="p-4 rounded-xl border border-amber-200/80 bg-amber-50/40 hover:bg-white transition-all shadow-2xs"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div>
                          <span className="inline-block px-2 py-0.5 text-[10px] font-semibold rounded bg-amber-100 text-amber-800 mb-1">
                            {note.topic || 'Ayurveda'}
                          </span>
                          <h4 className="text-sm font-semibold text-slate-900">{note.title}</h4>
                        </div>
                        <button
                          onClick={() => handleDeleteNote(note.id)}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete note"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed mb-3">
                        {note.content}
                      </p>
                      <button
                        onClick={() => {
                          onSelectTopic(`Jojo, let's review this concept together: ${note.title}. ${note.content}`);
                          onClose();
                        }}
                        className="text-xs font-medium text-rose-600 hover:text-rose-700 inline-flex items-center gap-1"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        Review with Jojo in chat
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            filteredTopics.map((topic, i) => (
              <div
                key={i}
                className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-rose-200 hover:shadow-xs transition-all"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <span className="inline-block px-2 py-0.5 text-[11px] font-medium rounded bg-rose-100/70 text-rose-700 mb-1">
                      {topic.category}
                    </span>
                    <h3 className="text-sm font-semibold text-slate-900">{topic.title}</h3>
                  </div>
                </div>

                <p className="text-xs text-slate-600 mb-2 leading-relaxed">{topic.description}</p>

                <div className="mb-3 pl-2 border-l-2 border-amber-300 space-y-0.5">
                  {topic.keyPoints.map((pt, idx) => (
                    <div key={idx} className="text-[11px] text-slate-500">
                      • {pt}
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
                  <button
                    onClick={() => {
                      onSelectTopic(topic.samplePrompt);
                      onClose();
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Explain Topic</span>
                  </button>
                  <button
                    onClick={() => {
                      onSelectTopic(topic.quizPrompt);
                      onClose();
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-50 text-amber-800 hover:bg-amber-100 transition-colors flex items-center gap-1.5"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>Quiz Me</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
