/**
 * Clean test user-categories and seed demo user-categories.
 * Run: npx ts-node src/scripts/seedCategories.ts
 */
import * as admin from 'firebase-admin';

admin.initializeApp({ projectId: 'glow-38ddf' });
const db = admin.firestore();

async function loadFirstUser(): Promise<{ uid: string } | null> {
  const snap = await db.collection('users').limit(1).get();
  if (snap.empty) return null;
  return { uid: snap.docs[0].id };
}

async function cleanUserCategories() {
  const snap = await db.collection('categories').where('type', '==', 'user').get();
  let count = 0;
  for (const doc of snap.docs) {
    await doc.ref.delete();
    count++;
  }
  // Also delete the gaming__ duplicates
  const dups = await db.collection('categories').get();
  for (const doc of dups.docs) {
    if (doc.id.startsWith('gaming__')) {
      await doc.ref.delete();
      count++;
    }
  }
  console.log(`✓ Cleaned ${count} user/duplicate categories`);
}

async function seedUserCategories(creatorUid: string) {
  const userCats = [
    {
      name: 'カフェ巡り',
      icon: 'cafe',
      color: '#D35400',
      description: '都内のおしゃれカフェ情報共有！',
      hashtags: ['カフェ', 'コーヒー', '東京'],
    },
    {
      name: '猫好き集まれ',
      icon: 'paw',
      color: '#E84393',
      description: '愛猫の写真と日常を投稿しよう🐱',
      hashtags: ['猫', 'ねこ', 'ペット'],
    },
    {
      name: 'プログラミング部',
      icon: 'bulb',
      color: '#3498DB',
      description: 'コード書く人、書きたい人歓迎',
      hashtags: ['プログラミング', 'Web開発', 'JavaScript'],
    },
    {
      name: '深夜のラーメン',
      icon: 'pizza',
      color: '#E74C3C',
      description: '夜中に食べたくなるラーメン情報',
      hashtags: ['ラーメン', '深夜飯'],
    },
    {
      name: '推し活',
      icon: 'heart',
      color: '#9B59B6',
      description: '推しの素晴らしさを語り合う場',
      hashtags: ['推し', 'アイドル', '声優'],
    },
    {
      name: 'フォートナイト',
      icon: 'flash',
      color: '#6C5CE7',
      description: 'フォトナ仲間募集中！',
      hashtags: ['Fortnite', 'ゲーム'],
    },
  ];

  for (const c of userCats) {
    const ref = db.collection('categories').doc();
    await ref.set({
      name: c.name,
      icon: c.icon,
      color: c.color,
      description: c.description,
      imageUrl: null,
      membersCount: Math.floor(Math.random() * 80) + 12,
      type: 'user',
      createdBy: creatorUid,
      hashtags: c.hashtags,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
  console.log(`✓ ${userCats.length} user categories created`);
}

async function main() {
  const user = await loadFirstUser();
  if (!user) {
    console.error('ユーザーがいません');
    process.exit(1);
  }

  await cleanUserCategories();
  await seedUserCategories(user.uid);

  console.log('\n✅ カテゴリー整理完了！');
}

main().catch((e) => {
  console.error('エラー:', e);
  process.exit(1);
});
