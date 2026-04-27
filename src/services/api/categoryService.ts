import { serverTimestamp, increment, deleteDoc } from 'firebase/firestore';
import { Category } from '@/types/category';
import { Collections } from '@/constants/firestore';
import {
  getDocument,
  setDocument,
  deleteDocument,
  updateDocument,
  queryDocuments,
  getCollectionRef,
  getDocRef,
  createBatch,
  where,
  orderBy,
  doc,
} from '@/services/firebase/firestore';
import { DEFAULT_CATEGORIES } from '@/constants/categories';

export function getDefaultCategories(): Category[] {
  return DEFAULT_CATEGORIES.map((c) => ({
    ...c,
    imageUrl: null,
    membersCount: 0,
  }));
}

export async function getCategories(): Promise<Category[]> {
  const defaults = getDefaultCategories();

  // Firestoreからmemberscount等の最新データがあればマージ
  try {
    const result = await queryDocuments<Category>(
      Collections.CATEGORIES,
      [orderBy('name', 'asc')],
      50
    );
    const firestoreMap = new Map(result.items.map((item) => [item.id, item]));
    return defaults.map((d) => firestoreMap.get(d.id) ?? d);
  } catch {
    return defaults;
  }
}

export async function getUserCategories(): Promise<Category[]> {
  const result = await queryDocuments<Category>(
    Collections.CATEGORIES,
    [where('type', '==', 'user')],
    50
  );
  return result.items.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
}

export async function createUserCategory(
  uid: string,
  form: { name: string; icon: string; color: string; description: string; imageUrl?: string | null; hashtags?: string[] },
): Promise<Category> {
  const ref = doc(getCollectionRef(Collections.CATEGORIES));
  const data = {
    name: form.name,
    icon: form.icon,
    color: form.color,
    description: form.description,
    imageUrl: form.imageUrl ?? null,
    hashtags: form.hashtags ?? [],
    membersCount: 0,
    type: 'user' as const,
    createdBy: uid,
    createdAt: serverTimestamp(),
  };
  await setDocument(Collections.CATEGORIES, ref.id, data);
  return { id: ref.id, ...data } as unknown as Category;
}

export async function getCategory(categoryId: string): Promise<Category | null> {
  return getDocument<Category>(Collections.CATEGORIES, categoryId);
}

export async function seedCategories(): Promise<void> {
  for (const cat of DEFAULT_CATEGORIES) {
    const existing = await getDocument<Category>(Collections.CATEGORIES, cat.id);
    if (!existing) {
      await setDocument(Collections.CATEGORIES, cat.id, {
        ...cat,
        imageUrl: null,
        membersCount: 0,
        type: 'default',
      });
    }
  }
}

// Group membership helpers

const MEMBERS_SUBCOLLECTION = 'members';

function getMemberDocId(groupId: string, userId: string): string {
  return `${groupId}_${userId}`;
}

export async function isGroupMember(groupId: string, userId: string): Promise<boolean> {
  const doc = await getDocument<{ userId: string }>(
    `${Collections.CATEGORIES}/${groupId}/${MEMBERS_SUBCOLLECTION}` as any,
    userId
  );
  return doc !== null;
}

export async function joinGroup(groupId: string, userId: string): Promise<void> {
  const batch = createBatch();
  const memberRef = getDocRef(
    `${Collections.CATEGORIES}/${groupId}/${MEMBERS_SUBCOLLECTION}` as any,
    userId
  );
  batch.set(memberRef, { userId, joinedAt: serverTimestamp() });
  batch.update(getDocRef(Collections.CATEGORIES, groupId), {
    membersCount: increment(1),
  });
  await batch.commit();
}

export async function leaveGroup(groupId: string, userId: string): Promise<void> {
  const batch = createBatch();
  const memberRef = getDocRef(
    `${Collections.CATEGORIES}/${groupId}/${MEMBERS_SUBCOLLECTION}` as any,
    userId
  );
  batch.delete(memberRef);
  batch.update(getDocRef(Collections.CATEGORIES, groupId), {
    membersCount: increment(-1),
  });
  await batch.commit();
}

export async function deleteGroup(groupId: string): Promise<void> {
  await deleteDocument(Collections.CATEGORIES, groupId);
}
