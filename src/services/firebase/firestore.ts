import {
  collection,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  updateDoc,
  query,
  getDocs,
  writeBatch,
  onSnapshot,
  where,
  orderBy,
  limit as firestoreLimit,
  startAfter,
  QueryConstraint,
  DocumentSnapshot,
  DocumentReference,
  CollectionReference,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from './config';

export { where, orderBy, doc, firestoreLimit as limit };

export function getCollectionRef(collectionName: string): CollectionReference {
  return collection(db, collectionName);
}

export function getDocRef(collectionName: string, docId: string): DocumentReference {
  return doc(db, collectionName, docId);
}

export async function getDocument<T>(
  collectionName: string,
  docId: string
): Promise<T | null> {
  const docRef = doc(db, collectionName, docId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() } as T;
}

export async function setDocument(
  collectionName: string,
  docId: string,
  data: Record<string, unknown>
): Promise<void> {
  const docRef = doc(db, collectionName, docId);
  await setDoc(docRef, data);
}

export async function deleteDocument(
  collectionName: string,
  docId: string
): Promise<void> {
  const docRef = doc(db, collectionName, docId);
  await deleteDoc(docRef);
}

export async function updateDocument(
  collectionName: string,
  docId: string,
  data: Record<string, unknown>
): Promise<void> {
  const docRef = doc(db, collectionName, docId);
  await updateDoc(docRef, data);
}

export async function queryDocuments<T>(
  collectionName: string,
  constraints: QueryConstraint[],
  pageSize: number,
  startAfterDoc?: DocumentSnapshot
): Promise<{ items: T[]; lastDoc: DocumentSnapshot | null; hasMore: boolean }> {
  const collectionRef = collection(db, collectionName);

  const queryConstraints: QueryConstraint[] = [
    ...constraints,
    firestoreLimit(pageSize + 1),
  ];

  if (startAfterDoc) {
    queryConstraints.push(startAfter(startAfterDoc));
  }

  const q = query(collectionRef, ...queryConstraints);
  const snapshot = await getDocs(q);

  const hasMore = snapshot.docs.length > pageSize;
  const docs = hasMore ? snapshot.docs.slice(0, pageSize) : snapshot.docs;

  const items = docs.map((d) => ({ id: d.id, ...d.data() } as T));
  const lastDoc = docs.length > 0 ? docs[docs.length - 1] : null;

  return { items, lastDoc, hasMore };
}

export function createBatch() {
  return writeBatch(db);
}

function silenceAuthErrors(err: unknown) {
  const code = (err as { code?: string } | undefined)?.code;
  if (code === 'permission-denied' || code === 'unauthenticated') return;
  console.warn('[firestore subscription error]', err);
}

export function subscribeToQuery<T>(
  collectionName: string,
  constraints: QueryConstraint[],
  callback: (items: T[], lastDoc: DocumentSnapshot | null) => void
): Unsubscribe {
  const collectionRef = collection(db, collectionName);
  const q = query(collectionRef, ...constraints);

  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as T));
      const lastDoc = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;
      callback(items, lastDoc);
    },
    silenceAuthErrors,
  );
}

export function subscribeToDocument<T>(
  collectionName: string,
  docId: string,
  callback: (doc: T | null) => void
): Unsubscribe {
  const docRef = doc(db, collectionName, docId);

  return onSnapshot(
    docRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        callback(null);
        return;
      }
      callback({ id: snapshot.id, ...snapshot.data() } as T);
    },
    silenceAuthErrors,
  );
}

export async function querySubcollection<T>(
  parentCollection: string,
  parentDocId: string,
  subcollectionName: string,
  constraints: QueryConstraint[],
  pageSize: number,
  startAfterDoc?: DocumentSnapshot
): Promise<{ items: T[]; lastDoc: DocumentSnapshot | null; hasMore: boolean }> {
  const subcollectionRef = collection(
    db,
    parentCollection,
    parentDocId,
    subcollectionName
  );

  const queryConstraints: QueryConstraint[] = [
    ...constraints,
    firestoreLimit(pageSize + 1),
  ];

  if (startAfterDoc) {
    queryConstraints.push(startAfter(startAfterDoc));
  }

  const q = query(subcollectionRef, ...queryConstraints);
  const snapshot = await getDocs(q);

  const hasMore = snapshot.docs.length > pageSize;
  const docs = hasMore ? snapshot.docs.slice(0, pageSize) : snapshot.docs;

  const items = docs.map((d) => ({ id: d.id, ...d.data() } as T));
  const lastDoc = docs.length > 0 ? docs[docs.length - 1] : null;

  return { items, lastDoc, hasMore };
}

export function subscribeToSubcollection<T>(
  parentCollection: string,
  parentDocId: string,
  subcollectionName: string,
  constraints: QueryConstraint[],
  callback: (items: T[]) => void
): Unsubscribe {
  const subcollectionRef = collection(
    db,
    parentCollection,
    parentDocId,
    subcollectionName
  );
  const q = query(subcollectionRef, ...constraints);

  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as T));
      callback(items);
    },
    silenceAuthErrors,
  );
}

export function getSubcollectionRef(
  parentCollection: string,
  parentDocId: string,
  subcollectionName: string
): CollectionReference {
  return collection(db, parentCollection, parentDocId, subcollectionName);
}

export function getSubcollectionDocRef(
  parentCollection: string,
  parentDocId: string,
  subcollectionName: string,
  docId: string
): DocumentReference {
  return doc(db, parentCollection, parentDocId, subcollectionName, docId);
}
