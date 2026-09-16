import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
  setDoc,
  collection,
  onSnapshot,
  query,
  orderBy,
  limit,
  deleteDoc,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { JojoEmotion } from '@/components/Avatar';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// CRITICAL: The app will break without specifying firestoreDatabaseId
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test connection on app boot
export async function testFirestoreConnection() {
  if (typeof window === 'undefined') return;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

if (typeof window !== 'undefined') {
  testFirestoreConnection();
}

// Auth helpers
export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error('Google Sign-In Error:', error);
    throw error;
  }
}

export async function logOut() {
  await signOut(auth);
}

// Data persistence helpers
export interface UserProfileData {
  userId: string;
  displayName: string;
  email: string;
  photoURL?: string;
  preferredLanguage?: 'Hinglish' | 'Hindi' | 'English';
  preferredVoiceSpeed?: number;
  preferredPitch?: number;
  autoPlayVoice?: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function syncUserProfile(data: Partial<UserProfileData> & { userId: string; email: string; displayName: string }) {
  const userPath = `users/${data.userId}`;
  try {
    const now = new Date().toISOString();
    const payload: UserProfileData = {
      userId: data.userId,
      displayName: (data.displayName || 'Friend').slice(0, 100),
      email: (data.email || '').slice(0, 150),
      photoURL: (data.photoURL || '').slice(0, 500),
      preferredLanguage: data.preferredLanguage || 'Hinglish',
      preferredVoiceSpeed: typeof data.preferredVoiceSpeed === 'number' ? data.preferredVoiceSpeed : 1.0,
      preferredPitch: typeof data.preferredPitch === 'number' ? data.preferredPitch : 1.05,
      autoPlayVoice: data.autoPlayVoice ?? true,
      createdAt: data.createdAt || now,
      updatedAt: now,
    };
    await setDoc(doc(db, 'users', data.userId), payload, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, userPath);
  }
}

export interface FirestoreChatMessage {
  id: string;
  userId: string;
  role: 'user' | 'assistant';
  content: string;
  emotion?: JojoEmotion;
  language?: string;
  createdAt: string;
}

export async function persistChatMessage(userId: string, msg: FirestoreChatMessage) {
  const path = `users/${userId}/messages/${msg.id}`;
  try {
    const payload: FirestoreChatMessage = {
      id: msg.id.slice(0, 128),
      userId,
      role: msg.role,
      content: msg.content.slice(0, 5000),
      emotion: msg.emotion || 'caring',
      language: (msg.language || 'Hinglish').slice(0, 50),
      createdAt: msg.createdAt || new Date().toISOString(),
    };
    await setDoc(doc(db, 'users', userId, 'messages', msg.id), payload);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export interface FirestoreStudyNote {
  id: string;
  userId: string;
  title: string;
  topic?: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export async function persistStudyNote(userId: string, note: FirestoreStudyNote) {
  const path = `users/${userId}/studyNotes/${note.id}`;
  try {
    const payload: FirestoreStudyNote = {
      id: note.id.slice(0, 128),
      userId,
      title: note.title.slice(0, 200),
      topic: (note.topic || 'BAMS').slice(0, 100),
      content: note.content.slice(0, 5000),
      createdAt: note.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'users', userId, 'studyNotes', note.id), payload);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function removeStudyNote(userId: string, noteId: string) {
  const path = `users/${userId}/studyNotes/${noteId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'studyNotes', noteId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export interface FirestoreQuizResult {
  id: string;
  userId: string;
  question: string;
  selectedOption: string;
  correctOption: string;
  isCorrect: boolean;
  explanation?: string;
  createdAt: string;
}

export async function persistQuizResult(userId: string, result: FirestoreQuizResult) {
  const path = `users/${userId}/quizResults/${result.id}`;
  try {
    const payload: FirestoreQuizResult = {
      id: result.id.slice(0, 128),
      userId,
      question: result.question.slice(0, 1000),
      selectedOption: result.selectedOption.slice(0, 200),
      correctOption: result.correctOption.slice(0, 200),
      isCorrect: Boolean(result.isCorrect),
      explanation: (result.explanation || '').slice(0, 2000),
      createdAt: result.createdAt || new Date().toISOString(),
    };
    await setDoc(doc(db, 'users', userId, 'quizResults', result.id), payload);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}
