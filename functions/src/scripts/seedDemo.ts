/**
 * Seed demo content for App Store screenshots.
 * Run: npx ts-node src/scripts/seedDemo.ts
 */
import * as admin from 'firebase-admin';

admin.initializeApp({ projectId: 'glow-38ddf' });
const db = admin.firestore();

const NOW = admin.firestore.FieldValue.serverTimestamp();

interface UserProfile {
  uid: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
}

async function loadUsers(): Promise<UserProfile[]> {
  const snap = await db.collection('users').get();
  return snap.docs.map((d) => {
    const data = d.data() as any;
    return {
      uid: d.id,
      displayName: data.displayName ?? 'ユーザー',
      username: data.username ?? `user_${d.id.slice(0, 6)}`,
      avatarUrl: data.avatarUrl ?? null,
    };
  });
}

async function seedTweets(users: UserProfile[]) {
  const tweetTexts = [
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
  ];

  for (let i = 0; i < tweetTexts.length; i++) {
    const author = users[i % users.length];
    const ref = db.collection('tweets').doc();
    const hashtags = (tweetTexts[i].match(/#(\S+)/g) || []).map((t) => t.slice(1));
    await ref.set({
      author: {
        uid: author.uid,
        displayName: author.displayName,
        username: author.username,
        avatarUrl: author.avatarUrl,
      },
      authorUid: author.uid,
      content: tweetTexts[i],
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
      createdAt: admin.firestore.Timestamp.fromMillis(Date.now() - i * 1000 * 60 * 30),
      updatedAt: NOW,
    });
  }
  console.log(`✓ ${tweetTexts.length} tweets created`);
}

async function seedThreads(users: UserProfile[]) {
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
      replies: [
        'フリーレン2期待ち遠しい',
        '推しの子おすすめ',
        'ダンダダンめっちゃ面白い',
      ],
    },
    {
      title: '初任給の使い道、何にしましたか？',
      replies: [
        '親に焼肉ごちそうした',
        '貯金一択',
      ],
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
      createdAt: admin.firestore.Timestamp.fromMillis(Date.now() - i * 1000 * 60 * 60),
      lastReplyAt: admin.firestore.Timestamp.fromMillis(Date.now() - i * 1000 * 60 * 10),
    });

    for (let j = 0; j < t.replies.length; j++) {
      const replyAuthor = users[(j + 1) % users.length];
      const replyRef = ref.collection('replies').doc();
      await replyRef.set({
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
        createdAt: admin.firestore.Timestamp.fromMillis(Date.now() - (t.replies.length - j) * 1000 * 60 * 5),
      });
    }
  }
  console.log(`✓ ${threads.length} threads with replies created`);
}

async function seedOpenChats(users: UserProfile[]) {
  const chats = [
    {
      name: 'huuwa雑談ルーム',
      description: '気軽に何でも話そう！',
      messages: [
        { uid: 0, text: 'みんなこんにちは〜👋' },
        { uid: 1, text: 'ここ初めて来ました！よろしく' },
        { uid: 2, text: '今日めっちゃ暑いね' },
        { uid: 0, text: 'クーラー全開だわ' },
        { uid: 3, text: '夜ご飯何食べる？' },
      ],
    },
    {
      name: 'プログラマー集まれ',
      description: '技術話・転職話・雑談OK',
      messages: [
        { uid: 1, text: 'ReactとVueどっち派？' },
        { uid: 2, text: 'React派！hooks便利すぎる' },
        { uid: 0, text: '最近Svelte気になってる' },
      ],
    },
    {
      name: '深夜のラジオ',
      description: '夜更かしさん集合',
      messages: [
        { uid: 3, text: '寝れない…' },
        { uid: 0, text: 'あるある' },
      ],
    },
  ];

  for (let i = 0; i < chats.length; i++) {
    const c = chats[i];
    const creator = users[0];
    const ref = db.collection('chatRooms').doc();
    const memberProfiles: Record<string, any> = {};
    users.forEach((u) => {
      memberProfiles[u.uid] = {
        uid: u.uid,
        displayName: u.displayName,
        username: u.username,
        avatarUrl: u.avatarUrl,
      };
    });

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
    });

    for (let j = 0; j < c.messages.length; j++) {
      const m = c.messages[j];
      const sender = users[m.uid % users.length];
      const msgRef = ref.collection('messages').doc();
      await msgRef.set({
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
        createdAt: admin.firestore.Timestamp.fromMillis(Date.now() - (c.messages.length - j) * 1000 * 60),
        readBy: [sender.uid],
      });
    }
  }
  console.log(`✓ ${chats.length} open chats with messages created`);
}

async function main() {
  const users = await loadUsers();
  if (users.length === 0) {
    console.error('ユーザーがいません');
    process.exit(1);
  }
  console.log(`${users.length}人のユーザーで投稿します`);

  await seedTweets(users);
  await seedThreads(users);
  await seedOpenChats(users);

  console.log('\n✅ シード完了！シミュレータでアプリをリロードしてください');
}

main().catch((e) => {
  console.error('エラー:', e);
  process.exit(1);
});
