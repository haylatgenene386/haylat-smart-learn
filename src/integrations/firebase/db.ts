/**
 * Firebase Firestore helpers — drop-in replacements for Supabase query patterns.
 * Collections mirror the original Supabase table names exactly.
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  getCountFromServer,
  QueryConstraint,
  DocumentData,
  WhereFilterOp,
  writeBatch,
  increment,
  arrayUnion,
  arrayRemove,
  Timestamp,
} from "firebase/firestore";
import { db } from "./client";

export {
  collection, doc, getDoc, getDocs, addDoc, setDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit, onSnapshot, serverTimestamp, getCountFromServer,
  writeBatch, increment, arrayUnion, arrayRemove, Timestamp,
  db,
};

// ── Generic helpers ──────────────────────────────────────────────────────────

/** Get all docs from a collection with optional constraints */
export async function getCollection<T = DocumentData>(
  collectionName: string,
  ...constraints: QueryConstraint[]
): Promise<(T & { id: string })[]> {
  const q = constraints.length
    ? query(collection(db, collectionName), ...constraints)
    : query(collection(db, collectionName));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as T & { id: string }));
}

/** Get a single doc by id */
export async function getDocument<T = DocumentData>(
  collectionName: string,
  id: string
): Promise<(T & { id: string }) | null> {
  const snap = await getDoc(doc(db, collectionName, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as T & { id: string };
}

/** Get first doc matching a field value */
export async function getDocumentWhere<T = DocumentData>(
  collectionName: string,
  field: string,
  op: WhereFilterOp,
  value: unknown,
  ...extra: QueryConstraint[]
): Promise<(T & { id: string }) | null> {
  const q = query(collection(db, collectionName), where(field, op, value), ...extra);
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as T & { id: string };
}

/** Add a new doc (auto-id) */
export async function addDocument(
  collectionName: string,
  data: DocumentData
): Promise<string> {
  const ref = await addDoc(collection(db, collectionName), {
    ...data,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });
  return ref.id;
}

/** Set a doc with a specific id */
export async function setDocument(
  collectionName: string,
  id: string,
  data: DocumentData,
  merge = true
): Promise<void> {
  await setDoc(doc(db, collectionName, id), {
    ...data,
    updated_at: serverTimestamp(),
  }, { merge });
}

/** Update specific fields on a doc */
export async function updateDocument(
  collectionName: string,
  id: string,
  data: Partial<DocumentData>
): Promise<void> {
  await updateDoc(doc(db, collectionName, id), {
    ...data,
    updated_at: serverTimestamp(),
  });
}

/** Delete a doc */
export async function deleteDocument(
  collectionName: string,
  id: string
): Promise<void> {
  await deleteDoc(doc(db, collectionName, id));
}

/** Get count of docs matching constraints */
export async function countDocuments(
  collectionName: string,
  ...constraints: QueryConstraint[]
): Promise<number> {
  const q = constraints.length
    ? query(collection(db, collectionName), ...constraints)
    : query(collection(db, collectionName));
  const snap = await getCountFromServer(q);
  return snap.data().count;
}

/** Real-time listener for a collection */
export function subscribeToCollection<T = DocumentData>(
  collectionName: string,
  callback: (docs: (T & { id: string })[]) => void,
  ...constraints: QueryConstraint[]
): () => void {
  const q = constraints.length
    ? query(collection(db, collectionName), ...constraints)
    : query(collection(db, collectionName));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as T & { id: string })));
  });
}

/** Real-time listener for a single doc */
export function subscribeToDocument<T = DocumentData>(
  collectionName: string,
  id: string,
  callback: (doc: (T & { id: string }) | null) => void
): () => void {
  return onSnapshot(doc(db, collectionName, id), (snap) => {
    if (!snap.exists()) { callback(null); return; }
    callback({ id: snap.id, ...snap.data() } as T & { id: string });
  });
}
