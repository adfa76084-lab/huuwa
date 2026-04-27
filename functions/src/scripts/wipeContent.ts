/**
 * One-time cleanup script: wipes all user content before App Store launch.
 *
 * Removes:
 *   - tweets, threads (+ replies subcollection), shorts
 *   - chatRooms with type === 'open' (+ all subcollections)
 *   - All reaction docs (likes, bookmarks, threadLikes)
 *   - notifications, tweetViews, polls, hashtags, reports
 *
 * Keeps:
 *   - users, userPrivate, categories, follows
 *   - Firebase Auth accounts
 *   - Storage files (run separately if needed)
 *
 * Run from project root:
 *   cd functions
 *   npx ts-node src/scripts/wipeContent.ts
 *
 * Auth: requires `gcloud auth application-default login` once beforehand.
 */

import * as admin from 'firebase-admin';
import * as readline from 'readline';

const PROJECT_ID = 'glow-38ddf';
const STORAGE_BUCKET = `${PROJECT_ID}.firebasestorage.app`;

admin.initializeApp({
  projectId: PROJECT_ID,
  storageBucket: STORAGE_BUCKET,
});
const db = admin.firestore();
const bucket = admin.storage().bucket();

const BATCH_SIZE = 400;

async function deleteCollection(path: string): Promise<number> {
  let total = 0;
  while (true) {
    const snap = await db.collection(path).limit(BATCH_SIZE).get();
    if (snap.empty) break;
    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    total += snap.size;
    process.stdout.write(`  ${path}: ${total} deleted\r`);
  }
  process.stdout.write(`  ${path}: ${total} deleted\n`);
  return total;
}

async function deleteCollectionWithSubcollections(
  path: string,
  subcollections: string[],
): Promise<number> {
  let total = 0;
  while (true) {
    const snap = await db.collection(path).limit(BATCH_SIZE).get();
    if (snap.empty) break;

    for (const doc of snap.docs) {
      // Delete subcollections first
      for (const sub of subcollections) {
        const subPath = `${path}/${doc.id}/${sub}`;
        await deleteCollectionInner(subPath);
      }
      await doc.ref.delete();
      total += 1;
    }
    process.stdout.write(`  ${path}: ${total} deleted\r`);
  }
  process.stdout.write(`  ${path}: ${total} deleted\n`);
  return total;
}

async function deleteCollectionInner(path: string): Promise<void> {
  while (true) {
    const snap = await db.collection(path).limit(BATCH_SIZE).get();
    if (snap.empty) return;
    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
}

async function deleteOpenChatRooms(): Promise<number> {
  let total = 0;
  while (true) {
    const snap = await db
      .collection('chatRooms')
      .where('type', '==', 'open')
      .limit(BATCH_SIZE)
      .get();
    if (snap.empty) break;

    for (const doc of snap.docs) {
      // Delete all known subcollections of an open chat room
      for (const sub of ['messages', 'notes', 'events', 'files']) {
        await deleteCollectionInner(`chatRooms/${doc.id}/${sub}`);
      }
      await doc.ref.delete();
      total += 1;
    }
    process.stdout.write(`  chatRooms (open): ${total} deleted\r`);
  }
  process.stdout.write(`  chatRooms (open): ${total} deleted\n`);
  return total;
}

async function confirm(): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(
      `\n⚠️  Project "${PROJECT_ID}" の全ツイート・スレッド・オープンチャット・関連データを削除します。\n` +
        `   この操作は取り消せません。続行するには "WIPE" と入力してください: `,
      (ans) => {
        rl.close();
        resolve(ans.trim() === 'WIPE');
      },
    );
  });
}

async function deleteStoragePrefix(prefix: string): Promise<number> {
  const [files] = await bucket.getFiles({ prefix });
  if (files.length === 0) {
    process.stdout.write(`  storage/${prefix}: 0 deleted\n`);
    return 0;
  }
  let deleted = 0;
  // Delete in batches of 100 to avoid timeouts
  const chunkSize = 100;
  for (let i = 0; i < files.length; i += chunkSize) {
    const chunk = files.slice(i, i + chunkSize);
    await Promise.all(chunk.map((f) => f.delete().catch(() => {})));
    deleted += chunk.length;
    process.stdout.write(`  storage/${prefix}: ${deleted}/${files.length}\r`);
  }
  process.stdout.write(`  storage/${prefix}: ${deleted} deleted\n`);
  return deleted;
}

async function main() {
  const ok = await confirm();
  if (!ok) {
    console.log('キャンセルしました。');
    return;
  }

  console.log('\n🧹 Firestoreを削除します...\n');

  // Subcollection-bearing collections
  await deleteCollectionWithSubcollections('threads', ['replies']);
  await deleteOpenChatRooms();

  // Flat collections
  await deleteCollection('tweets');
  await deleteCollection('shorts');
  await deleteCollection('likes');
  await deleteCollection('bookmarks');
  await deleteCollection('threadLikes');
  await deleteCollection('notifications');
  await deleteCollection('tweetViews');
  await deleteCollection('polls');
  await deleteCollection('hashtags');
  await deleteCollection('reports');

  console.log('\n📦 Storageファイルを削除します...\n');
  await deleteStoragePrefix('tweets/');
  await deleteStoragePrefix('thread-images/');
  await deleteStoragePrefix('thread-videos/');
  await deleteStoragePrefix('thread-voice/');
  await deleteStoragePrefix('thread-files/');
  await deleteStoragePrefix('shorts/');
  await deleteStoragePrefix('short_thumbs/');
  await deleteStoragePrefix('chat_images/');
  await deleteStoragePrefix('chat_videos/');
  await deleteStoragePrefix('chat_files/');
  await deleteStoragePrefix('chat_voice/');
  await deleteStoragePrefix('openchat-images/');

  console.log('\n✅ 完了しました。');
}

main().catch((e) => {
  console.error('エラー:', e);
  process.exit(1);
});
