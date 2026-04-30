/**
 * App Store スクショ用：既存コンテンツをwipe → ダミーユーザー＋投稿を生成。
 *
 * - users コレクションにダミー8人作成（auth は作らない、表示用のみ）
 * - tweets / threads / openChats を全てダミーで再生成
 * - 既存の users / auth / categories / follows は保持
 *
 * Run from `functions/`:
 *   npx ts-node src/scripts/seedScreenshotDemo.ts
 *
 * Auth: `gcloud auth application-default login` を一度実行しておく
 */
import * as admin from 'firebase-admin';
import * as readline from 'readline';

const PROJECT_ID = 'glow-38ddf';
admin.initializeApp({ projectId: PROJECT_ID });
const db = admin.firestore();
const NOW = admin.firestore.FieldValue.serverTimestamp();
const BATCH_SIZE = 400;

// アバターは全員 Picsum（風景・食・物などのフリー素材）。seed で決定論的に同じ画像。
// ニックネームは本名っぽくならないようにSNS風に。
const DUMMY_USERS = [
  { id: 'demo_mochi',   displayName: 'もち',         username: 'mochi_mochi', avatarSeed: 'tokyo' },
  { id: 'demo_sora',    displayName: 'そら☁️',       username: 'sora_0708',   avatarSeed: 'ramen' },
  { id: 'demo_neko',    displayName: 'ねこさんぽ',   username: 'nekosan',     avatarSeed: 'sakura' },
  { id: 'demo_yuzu',    displayName: 'ゆず🍋',       username: 'yuzu_pon',    avatarSeed: 'mountain' },
  { id: 'demo_panda',   displayName: 'パンダ部',     username: 'pandabu',     avatarSeed: 'cafe' },
  { id: 'demo_mikan',   displayName: 'みかん🍊',     username: 'mikan_pop',   avatarSeed: 'beach' },
  { id: 'demo_piyo',    displayName: 'ぴよっち',     username: 'piyo_chi',    avatarSeed: 'flower' },
  { id: 'demo_tanuki',  displayName: 'たぬき',       username: 'tanuking',    avatarSeed: 'sunset' },
];

function avatarUrl(seed: string): string {
  return `https://picsum.photos/seed/${seed}/400/400`;
}

interface DummyUserDoc {
  uid: string;
  displayName: string;
  username: string;
  avatarUrl: string;
}

// ─── Wipe helpers ───
async function deleteCollectionInner(path: string): Promise<void> {
  while (true) {
    const snap = await db.collection(path).limit(BATCH_SIZE).get();
    if (snap.empty) return;
    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
}

async function deleteCollection(path: string): Promise<number> {
  let total = 0;
  while (true) {
    const snap = await db.collection(path).limit(BATCH_SIZE).get();
    if (snap.empty) break;
    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    total += snap.size;
  }
  return total;
}

async function deleteCollectionWithSubs(path: string, subs: string[]): Promise<number> {
  let total = 0;
  while (true) {
    const snap = await db.collection(path).limit(BATCH_SIZE).get();
    if (snap.empty) break;
    for (const doc of snap.docs) {
      for (const sub of subs) await deleteCollectionInner(`${path}/${doc.id}/${sub}`);
      await doc.ref.delete();
      total++;
    }
  }
  return total;
}

async function deleteAllChatRooms(): Promise<number> {
  let total = 0;
  while (true) {
    const snap = await db.collection('chatRooms').limit(BATCH_SIZE).get();
    if (snap.empty) break;
    for (const doc of snap.docs) {
      for (const sub of ['messages', 'notes', 'events', 'files']) {
        await deleteCollectionInner(`chatRooms/${doc.id}/${sub}`);
      }
      await doc.ref.delete();
      total++;
    }
  }
  return total;
}

async function wipeContent() {
  console.log('🧹 既存コンテンツを削除中...');
  console.log(`  threads: ${await deleteCollectionWithSubs('threads', ['replies'])} 削除`);
  console.log(`  chatRooms (open+dm+group): ${await deleteAllChatRooms()} 削除`);
  console.log(`  tweets: ${await deleteCollection('tweets')} 削除`);
  console.log(`  shorts: ${await deleteCollection('shorts')} 削除`);
  console.log(`  likes: ${await deleteCollection('likes')} 削除`);
  console.log(`  bookmarks: ${await deleteCollection('bookmarks')} 削除`);
  console.log(`  threadLikes: ${await deleteCollection('threadLikes')} 削除`);
  console.log(`  notifications: ${await deleteCollection('notifications')} 削除`);
  console.log(`  tweetViews: ${await deleteCollection('tweetViews')} 削除`);
  console.log(`  polls: ${await deleteCollection('polls')} 削除`);
  console.log(`  hashtags: ${await deleteCollection('hashtags')} 削除`);
  console.log(`  chatNotificationPrefs: ${await deleteCollection('chatNotificationPrefs')} 削除`);
}

// ─── Create dummy users ───
async function createDummyUsers(): Promise<DummyUserDoc[]> {
  console.log('\n👥 ダミーユーザーを作成中...');
  const results: DummyUserDoc[] = [];
  for (const u of DUMMY_USERS) {
    const url = avatarUrl(u.avatarSeed);
    await db.collection('users').doc(u.id).set({
      uid: u.id,
      email: `${u.id}@demo.huuwa.app`,
      displayName: u.displayName,
      username: u.username,
      avatarUrl: url,
      headerImageUrl: null,
      bio: '',
      statusMessage: '',
      hobbies: [],
      followersCount: Math.floor(Math.random() * 50) + 10,
      followingCount: Math.floor(Math.random() * 30) + 5,
      tweetsCount: 0,
      isPrivate: false,
      dmPolicy: 'everyone',
      isDemo: true,
      createdAt: admin.firestore.Timestamp.fromMillis(
        Date.now() - Math.floor(Math.random() * 30) * 86400000,
      ),
      updatedAt: NOW,
    });
    results.push({ uid: u.id, displayName: u.displayName, username: u.username, avatarUrl: url });
  }
  console.log(`  ✓ ${results.length}人作成`);
  return results;
}

// ─── Seed tweets ───
async function seedTweets(users: DummyUserDoc[]) {
  console.log('\n📝 ツイート投稿中...');
  const tweets = [
    '今日めっちゃ眠い…昨日Netflix見すぎた #寝不足',
    'huuwa使い始めて3日目、めちゃ良いSNS見つけたかも 🌟',
    'コーヒー一杯目から幸せ。みんな朝のルーティーンって何してる？',
    '新作の映画、想像の100倍良かった。ネタバレなしで言うと序盤から泣ける',
    '#ゲーム 友達募集中！マルチで遊べる人いたらDMください',
    '今日のラーメン至高でした 🍜',
    'プログラミング勉強始めたんだけど、何から手付ければいいか分からん',
    'ペットの猫がさっきから箱に入って動かない…可愛すぎる',
    '#音楽 最近のお気に入りプレイリスト共有したい！',
    'huuwaのボイスメッセージ機能めっちゃ便利だな',
    '雨降ってきた☔ 傘忘れた…',
    '今夜も22時就寝目指す！夜更かし卒業',
    '今日のお弁当、自分で作ったけど結構美味しくできた 🍱',
    'カフェで作業中。集中できる場所って大事だね',
    '推しのライブのチケット当たった！🎫',
    '朝活始めて1週間、意外と続いてる',
  ];

  const counts = new Map<string, number>();
  for (let i = 0; i < tweets.length; i++) {
    const author = users[i % users.length];
    const text = tweets[i];
    const hashtags = (text.match(/#(\S+)/g) || []).map((t) => t.slice(1));
    await db.collection('tweets').add({
      author: {
        uid: author.uid,
        displayName: author.displayName,
        username: author.username,
        avatarUrl: author.avatarUrl,
      },
      authorUid: author.uid,
      content: text,
      imageUrls: [],
      categoryId: null,
      categoryIds: [],
      parentTweetId: null,
      pollId: null,
      hashtags,
      mentions: [],
      likesCount: Math.floor(Math.random() * 30) + 1,
      repliesCount: Math.floor(Math.random() * 5),
      bookmarksCount: Math.floor(Math.random() * 8),
      viewsCount: Math.floor(Math.random() * 200) + 20,
      authorIsPrivate: false,
      isDemo: true,
      createdAt: admin.firestore.Timestamp.fromMillis(Date.now() - i * 1000 * 60 * 30),
      updatedAt: NOW,
    });
    counts.set(author.uid, (counts.get(author.uid) ?? 0) + 1);
  }
  for (const [uid, count] of counts) {
    await db.collection('users').doc(uid).update({ tweetsCount: count });
  }
  console.log(`  ✓ ${tweets.length}件投稿`);
}

// ─── Seed threads ───
async function seedThreads(users: DummyUserDoc[]) {
  console.log('\n💬 スレッド作成中...');
  const threads = [
    {
      title: '一人暮らし、自炊する派？しない派？',
      replies: [
        '断然自炊派！節約にもなるし健康的',
        '俺は逆。コンビニとUberに頼り切ってる',
        '週末まとめて作り置きするのオススメ',
        '料理苦手だから自炊難しい…',
      ],
    },
    {
      title: '最近ハマってるアニメ教えて！',
      replies: ['フリーレン2期待ち遠しい', '推しの子おすすめ', 'ダンダダンめっちゃ面白い'],
    },
    {
      title: '初任給の使い道、何にしましたか？',
      replies: ['親に焼肉ごちそうした', '貯金一択', 'ずっと欲しかった時計買った'],
    },
    {
      title: 'おすすめのカフェ知りたい！',
      replies: ['ブルーボトル安定', '個人経営の隠れ家系が好き', 'チェーンならドトール派'],
    },
  ];

  for (let i = 0; i < threads.length; i++) {
    const author = users[i % users.length];
    const t = threads[i];
    const ref = db.collection('threads').doc();
    await ref.set({
      title: t.title,
      imageUrl: null,
      author: {
        uid: author.uid,
        displayName: author.displayName,
        username: author.username,
        avatarUrl: author.avatarUrl,
      },
      authorUid: author.uid,
      categoryId: null,
      repliesCount: t.replies.length,
      likesCount: Math.floor(Math.random() * 20) + 5,
      authorIsPrivate: false,
      isDemo: true,
      createdAt: admin.firestore.Timestamp.fromMillis(Date.now() - i * 1000 * 60 * 60),
      lastReplyAt: admin.firestore.Timestamp.fromMillis(Date.now() - i * 1000 * 60 * 10),
    });
    for (let j = 0; j < t.replies.length; j++) {
      const replyAuthor = users[(i + j + 1) % users.length];
      await ref.collection('replies').add({
        threadId: ref.id,
        author: {
          uid: replyAuthor.uid,
          displayName: replyAuthor.displayName,
          username: replyAuthor.username,
          avatarUrl: replyAuthor.avatarUrl,
        },
        authorUid: replyAuthor.uid,
        content: t.replies[j],
        imageUrls: [],
        attachments: [],
        mentions: [],
        createdAt: admin.firestore.Timestamp.fromMillis(
          Date.now() - (t.replies.length - j) * 1000 * 60 * 5,
        ),
      });
    }
  }
  console.log(`  ✓ ${threads.length}スレッド + 返信作成`);
}

// ─── Seed open chats ───
async function seedOpenChats(users: DummyUserDoc[]) {
  console.log('\n🌐 オープンチャット作成中...');
  const chats = [
    {
      name: 'huuwa雑談ルーム',
      description: '気軽に何でも話そう！',
      messages: [
        { uid: 0, text: 'みんなこんにちは〜👋' },
        { uid: 1, text: 'ここ初めて来ました！よろしく' },
        { uid: 2, text: '今日めっちゃ暑いね' },
        { uid: 3, text: 'クーラー全開だわ' },
        { uid: 4, text: '夜ご飯何食べる？' },
      ],
    },
    {
      name: 'プログラマー集まれ',
      description: '技術話・転職話・雑談OK',
      messages: [
        { uid: 1, text: 'ReactとVueどっち派？' },
        { uid: 2, text: 'React派！hooks便利すぎる' },
        { uid: 5, text: '最近Svelte気になってる' },
      ],
    },
    {
      name: '深夜のラジオ',
      description: '夜更かしさん集合',
      messages: [
        { uid: 3, text: '寝れない…' },
        { uid: 6, text: 'あるある' },
        { uid: 7, text: '何時まで起きてる予定？' },
      ],
    },
    {
      name: '推し活同好会',
      description: 'みんなの推しを語ろう',
      messages: [
        { uid: 4, text: '今日ライブ行ってきた！最高だった' },
        { uid: 0, text: 'いいなー！どこの？' },
        { uid: 4, text: 'TIFだよ' },
      ],
    },
  ];

  for (let i = 0; i < chats.length; i++) {
    const c = chats[i];
    const creator = users[0];
    const memberProfiles: Record<string, any> = {};
    users.forEach((u) => {
      memberProfiles[u.uid] = {
        uid: u.uid,
        displayName: u.displayName,
        username: u.username,
        avatarUrl: u.avatarUrl,
      };
    });

    const ref = db.collection('chatRooms').doc();
    await ref.set({
      type: 'open',
      name: c.name,
      description: c.description,
      imageUrl: null,
      categoryId: null,
      members: users.map((u) => u.uid),
      membersCount: users.length,
      memberProfiles,
      lastMessage: c.messages[c.messages.length - 1].text,
      lastMessageAt: admin.firestore.Timestamp.fromMillis(Date.now() - i * 1000 * 60),
      createdBy: creator.uid,
      createdAt: admin.firestore.Timestamp.fromMillis(Date.now() - (i + 1) * 1000 * 60 * 60),
      status: 'active',
      requestSenderUid: null,
      isDemo: true,
    });

    for (let j = 0; j < c.messages.length; j++) {
      const m = c.messages[j];
      const sender = users[m.uid % users.length];
      await ref.collection('messages').add({
        roomId: ref.id,
        senderUid: sender.uid,
        sender: {
          uid: sender.uid,
          displayName: sender.displayName,
          username: sender.username,
          avatarUrl: sender.avatarUrl,
        },
        content: m.text,
        imageUrl: null,
        attachments: [],
        createdAt: admin.firestore.Timestamp.fromMillis(
          Date.now() - (c.messages.length - j) * 1000 * 60,
        ),
        readBy: [sender.uid],
      });
    }
  }
  console.log(`  ✓ ${chats.length}オープンチャット作成`);
}

// ─── Find existing user (the one logged in for screenshots) ───
async function findUserByUsername(username: string): Promise<DummyUserDoc | null> {
  const snap = await db.collection('users').where('username', '==', username).limit(1).get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  const data = doc.data();
  return {
    uid: doc.id,
    displayName: data.displayName ?? username,
    username: data.username ?? username,
    avatarUrl: data.avatarUrl ?? '',
  };
}

// ─── Seed DMs (between logged-in user and dummies) ───
async function seedDirectMessages(self: DummyUserDoc, others: DummyUserDoc[]) {
  console.log('\n📨 DM作成中...');
  const conversations: { partnerIdx: number; messages: { from: 'self' | 'partner'; text: string }[] }[] = [
    {
      partnerIdx: 0,
      messages: [
        { from: 'partner', text: 'やっほー！元気？' },
        { from: 'self',    text: 'おひさ！元気だよ〜' },
        { from: 'partner', text: '今度カフェ行かない？☕' },
        { from: 'self',    text: 'いいね！週末空いてる？' },
        { from: 'partner', text: '土曜の午後OK！' },
        { from: 'self',    text: '了解、楽しみにしてる😊' },
      ],
    },
    {
      partnerIdx: 2,
      messages: [
        { from: 'partner', text: 'huuwaの使い方ちょっと教えてほしい！' },
        { from: 'self',    text: 'もちろん〜何が分からない？' },
        { from: 'partner', text: 'オープンチャットの参加の仕方' },
        { from: 'self',    text: '一覧から好きなルーム選んで参加ボタン押すだけ！' },
        { from: 'partner', text: 'なるほど、ありがとう🙏' },
      ],
    },
    {
      partnerIdx: 3,
      messages: [
        { from: 'self',    text: '昨日言ってた映画見た？' },
        { from: 'partner', text: '見た見た！めちゃ良かった' },
        { from: 'self',    text: 'でしょ？ラストのシーン泣けるよね😭' },
        { from: 'partner', text: 'ほんとそれ。原作も読みたくなった' },
      ],
    },
    {
      partnerIdx: 5,
      messages: [
        { from: 'partner', text: 'お疲れさまー！' },
        { from: 'self',    text: 'お疲れ様！今日も忙しかった？' },
        { from: 'partner', text: 'うん、夜から飲みに行く🍻' },
        { from: 'self',    text: 'いいなー、楽しんできて！' },
      ],
    },
    {
      partnerIdx: 1,
      messages: [
        { from: 'self',    text: '写真送るね📷' },
        { from: 'partner', text: 'ありがと！綺麗な景色だね' },
        { from: 'self',    text: '昨日撮ったやつ。海が最高だった' },
        { from: 'partner', text: '今度連れてって！' },
      ],
    },
  ];

  for (let i = 0; i < conversations.length; i++) {
    const conv = conversations[i];
    const partner = others[conv.partnerIdx % others.length];
    const ref = db.collection('chatRooms').doc();

    const memberProfiles = {
      [self.uid]: {
        uid: self.uid,
        displayName: self.displayName,
        username: self.username,
        avatarUrl: self.avatarUrl,
      },
      [partner.uid]: {
        uid: partner.uid,
        displayName: partner.displayName,
        username: partner.username,
        avatarUrl: partner.avatarUrl,
      },
    };
    const lastMsg = conv.messages[conv.messages.length - 1];

    await ref.set({
      type: 'dm',
      name: null,
      description: null,
      imageUrl: null,
      categoryId: null,
      members: [self.uid, partner.uid],
      membersCount: 2,
      memberProfiles,
      lastMessage: lastMsg.text,
      lastMessageAt: admin.firestore.Timestamp.fromMillis(Date.now() - i * 1000 * 60 * 30),
      createdBy: self.uid,
      createdAt: admin.firestore.Timestamp.fromMillis(Date.now() - (i + 1) * 1000 * 60 * 60 * 6),
      status: 'active',
      requestSenderUid: null,
      isDemo: true,
    });

    for (let j = 0; j < conv.messages.length; j++) {
      const m = conv.messages[j];
      const sender = m.from === 'self' ? self : partner;
      await ref.collection('messages').add({
        roomId: ref.id,
        senderUid: sender.uid,
        sender: {
          uid: sender.uid,
          displayName: sender.displayName,
          username: sender.username,
          avatarUrl: sender.avatarUrl,
        },
        content: m.text,
        imageUrl: null,
        attachments: [],
        createdAt: admin.firestore.Timestamp.fromMillis(
          Date.now() - i * 1000 * 60 * 30 - (conv.messages.length - j) * 1000 * 60 * 2,
        ),
        readBy: [sender.uid],
      });
    }
  }
  console.log(`  ✓ ${conversations.length}件のDM作成`);
}

// ─── Confirmation ───
async function confirm(): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(
      `\n⚠️  Project "${PROJECT_ID}" の全ツイート/スレッド/オープンチャット/関連データを削除し、ダミーで再生成します。\n` +
        `   既存ユーザー（auth + users doc）は保持されます。\n` +
        `   続行するには "SEED" と入力してください: `,
      (ans) => {
        rl.close();
        resolve(ans.trim() === 'SEED');
      },
    );
  });
}

async function main() {
  if (!(await confirm())) {
    console.log('キャンセルしました。');
    return;
  }
  await wipeContent();
  const users = await createDummyUsers();
  await seedTweets(users);
  await seedThreads(users);
  await seedOpenChats(users);

  // DM はログイン中のテストアカウント（@aaa）と各ダミー間で作る
  const self = await findUserByUsername('aaa');
  if (self) {
    await seedDirectMessages(self, users);
  } else {
    console.log('\n⚠️ ログイン中のテストアカウント @aaa が見つからずDM作成をスキップ');
    console.log('   別のusernameを使っている場合は seedScreenshotDemo.ts の findUserByUsername("aaa") を変更');
  }

  console.log('\n✅ 完了！シミュレーターでアプリをリロードしてスクショを撮ってください。');
}

main().catch((e) => {
  console.error('エラー:', e);
  process.exit(1);
});
