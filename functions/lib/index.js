"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.moderateTweetImages = exports.migrateMyEmailToPrivate = exports.rateLimitChatRoom = exports.rateLimitThread = exports.rateLimitTweet = exports.propagatePrivacyChange = exports.moderateThread = exports.moderateTweet = exports.purgeDisabledAccounts = exports.verifyPhoneCode = exports.sendPhoneCode = exports.verifySignupAndCreate = exports.sendSignupCode = exports.verifyPasswordResetCode = exports.sendPasswordResetCode = exports.verifyEmailChangeCode = exports.sendEmailChangeCode = void 0;
const https_1 = require("firebase-functions/v2/https");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const firestore_1 = require("firebase-functions/v2/firestore");
const params_1 = require("firebase-functions/params");
const admin = require("firebase-admin");
const crypto_1 = require("crypto");
const resend_1 = require("resend");
const generative_ai_1 = require("@google/generative-ai");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const twilio = require('twilio');
admin.initializeApp();
const db = admin.firestore();
const RESEND_API_KEY = (0, params_1.defineSecret)('RESEND_API_KEY');
const EMAIL_FROM = (0, params_1.defineSecret)('EMAIL_FROM');
const TWILIO_ACCOUNT_SID = (0, params_1.defineSecret)('TWILIO_ACCOUNT_SID');
const TWILIO_AUTH_TOKEN = (0, params_1.defineSecret)('TWILIO_AUTH_TOKEN');
const TWILIO_FROM_NUMBER = (0, params_1.defineSecret)('TWILIO_FROM_NUMBER');
const GEMINI_API_KEY = (0, params_1.defineSecret)('GEMINI_API_KEY');
const CODE_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const sha256 = (s) => (0, crypto_1.createHash)('sha256').update(s).digest('hex');
exports.sendEmailChangeCode = (0, https_1.onCall)({ region: 'us-central1', secrets: [RESEND_API_KEY, EMAIL_FROM] }, async (request) => {
    const uid = request.auth?.uid;
    if (!uid)
        throw new https_1.HttpsError('unauthenticated', 'ログインが必要です');
    const newEmail = String(request.data?.newEmail ?? '').trim().toLowerCase();
    if (!EMAIL_RE.test(newEmail)) {
        throw new https_1.HttpsError('invalid-argument', '有効なメールアドレスを入力してください');
    }
    const userRecord = await admin.auth().getUser(uid);
    if (userRecord.email?.toLowerCase() === newEmail) {
        throw new https_1.HttpsError('already-exists', '現在と同じメールアドレスです');
    }
    try {
        await admin.auth().getUserByEmail(newEmail);
        throw new https_1.HttpsError('already-exists', 'このメールアドレスは既に使用されています');
    }
    catch (e) {
        if (e instanceof https_1.HttpsError)
            throw e;
        if (e?.code !== 'auth/user-not-found') {
            throw new https_1.HttpsError('internal', 'メールアドレスの確認に失敗しました');
        }
    }
    const docRef = db.collection('emailChangeCodes').doc(uid);
    const existing = await docRef.get();
    if (existing.exists) {
        const last = existing.data()?.createdAt?.toMillis?.() ?? 0;
        if (Date.now() - last < RESEND_COOLDOWN_MS) {
            throw new https_1.HttpsError('resource-exhausted', '再送信は1分後にお試しください');
        }
    }
    const code = String((0, crypto_1.randomInt)(0, 1_000_000)).padStart(6, '0');
    await docRef.set({
        newEmail,
        codeHash: sha256(code),
        attempts: 0,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + CODE_TTL_MS),
    });
    const resend = new resend_1.Resend(RESEND_API_KEY.value());
    const { error } = await resend.emails.send({
        from: EMAIL_FROM.value(),
        to: newEmail,
        subject: 'huuwaメールアドレス変更の認証コード',
        text: `huuwaの認証コードは ${code} です。\n\n10分以内にアプリで入力してください。\n心当たりがない場合はこのメールを無視してください。`,
        html: `<p>huuwaの認証コードは <strong style="font-size:20px;letter-spacing:2px">${code}</strong> です。</p><p>10分以内にアプリで入力してください。</p><p style="color:#888;font-size:12px">心当たりがない場合はこのメールを無視してください。</p>`,
    });
    if (error) {
        await docRef.delete().catch(() => { });
        throw new https_1.HttpsError('internal', 'メール送信に失敗しました');
    }
    return { ok: true };
});
exports.verifyEmailChangeCode = (0, https_1.onCall)({ region: 'us-central1' }, async (request) => {
    const uid = request.auth?.uid;
    if (!uid)
        throw new https_1.HttpsError('unauthenticated', 'ログインが必要です');
    const code = String(request.data?.code ?? '').trim();
    if (!/^\d{6}$/.test(code)) {
        throw new https_1.HttpsError('invalid-argument', '6桁のコードを入力してください');
    }
    const docRef = db.collection('emailChangeCodes').doc(uid);
    const snap = await docRef.get();
    if (!snap.exists) {
        throw new https_1.HttpsError('not-found', '認証コードが見つかりません。再送信してください');
    }
    const data = snap.data();
    const expiresAt = data.expiresAt;
    if (expiresAt.toMillis() < Date.now()) {
        await docRef.delete().catch(() => { });
        throw new https_1.HttpsError('deadline-exceeded', '認証コードの有効期限が切れました');
    }
    const attempts = (data.attempts ?? 0);
    if (attempts >= MAX_ATTEMPTS) {
        await docRef.delete().catch(() => { });
        throw new https_1.HttpsError('resource-exhausted', '試行回数の上限に達しました。再送信してください');
    }
    if (sha256(code) !== data.codeHash) {
        await docRef.update({ attempts: attempts + 1 });
        throw new https_1.HttpsError('permission-denied', '認証コードが正しくありません');
    }
    const newEmail = data.newEmail;
    await admin.auth().updateUser(uid, { email: newEmail, emailVerified: true });
    await db.collection('userPrivate').doc(uid).set({
        email: newEmail,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true }).catch(() => { });
    await db.collection('users').doc(uid).update({
        email: admin.firestore.FieldValue.delete(),
    }).catch(() => { });
    await docRef.delete().catch(() => { });
    return { ok: true, email: newEmail };
});
// ─── Password Reset (code-based) ───
exports.sendPasswordResetCode = (0, https_1.onCall)({ region: 'us-central1', secrets: [RESEND_API_KEY, EMAIL_FROM] }, async (request) => {
    const email = String(request.data?.email ?? '').trim().toLowerCase();
    if (!EMAIL_RE.test(email)) {
        throw new https_1.HttpsError('invalid-argument', '有効なメールアドレスを入力してください');
    }
    let userRecord;
    try {
        userRecord = await admin.auth().getUserByEmail(email);
    }
    catch (e) {
        if (e?.code === 'auth/user-not-found') {
            // Don't leak whether the email exists; pretend success
            return { ok: true };
        }
        throw new https_1.HttpsError('internal', 'エラーが発生しました');
    }
    const docRef = db.collection('passwordResetCodes').doc(userRecord.uid);
    const existing = await docRef.get();
    if (existing.exists) {
        const last = existing.data()?.createdAt?.toMillis?.() ?? 0;
        if (Date.now() - last < RESEND_COOLDOWN_MS) {
            throw new https_1.HttpsError('resource-exhausted', '再送信は1分後にお試しください');
        }
    }
    const code = String((0, crypto_1.randomInt)(0, 1_000_000)).padStart(6, '0');
    await docRef.set({
        email,
        codeHash: sha256(code),
        attempts: 0,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + CODE_TTL_MS),
    });
    const resend = new resend_1.Resend(RESEND_API_KEY.value());
    const { error } = await resend.emails.send({
        from: EMAIL_FROM.value(),
        to: email,
        subject: 'huuwa パスワードリセットの認証コード',
        text: `huuwaのパスワードリセット用コードは ${code} です。\n\n10分以内にアプリで入力してください。\n心当たりがない場合はこのメールを無視してください。`,
        html: `<p>huuwaのパスワードリセット用コードは <strong style="font-size:20px;letter-spacing:2px">${code}</strong> です。</p><p>10分以内にアプリで入力してください。</p><p style="color:#888;font-size:12px">心当たりがない場合はこのメールを無視してください。</p>`,
    });
    if (error) {
        await docRef.delete().catch(() => { });
        throw new https_1.HttpsError('internal', 'メール送信に失敗しました');
    }
    return { ok: true };
});
exports.verifyPasswordResetCode = (0, https_1.onCall)({ region: 'us-central1' }, async (request) => {
    const email = String(request.data?.email ?? '').trim().toLowerCase();
    const code = String(request.data?.code ?? '').trim();
    const newPassword = String(request.data?.newPassword ?? '');
    if (!EMAIL_RE.test(email)) {
        throw new https_1.HttpsError('invalid-argument', '無効なメールアドレスです');
    }
    if (!/^\d{6}$/.test(code)) {
        throw new https_1.HttpsError('invalid-argument', '6桁のコードを入力してください');
    }
    if (newPassword.length < 6) {
        throw new https_1.HttpsError('invalid-argument', 'パスワードは6文字以上で入力してください');
    }
    let userRecord;
    try {
        userRecord = await admin.auth().getUserByEmail(email);
    }
    catch {
        throw new https_1.HttpsError('not-found', '認証コードが正しくありません');
    }
    const docRef = db.collection('passwordResetCodes').doc(userRecord.uid);
    const snap = await docRef.get();
    if (!snap.exists) {
        throw new https_1.HttpsError('not-found', '認証コードが見つかりません。再送信してください');
    }
    const data = snap.data();
    const expiresAt = data.expiresAt;
    if (expiresAt.toMillis() < Date.now()) {
        await docRef.delete().catch(() => { });
        throw new https_1.HttpsError('deadline-exceeded', '認証コードの有効期限が切れました');
    }
    const attempts = (data.attempts ?? 0);
    if (attempts >= MAX_ATTEMPTS) {
        await docRef.delete().catch(() => { });
        throw new https_1.HttpsError('resource-exhausted', '試行回数の上限に達しました。再送信してください');
    }
    if (sha256(code) !== data.codeHash) {
        await docRef.update({ attempts: attempts + 1 });
        throw new https_1.HttpsError('permission-denied', '認証コードが正しくありません');
    }
    await admin.auth().updateUser(userRecord.uid, { password: newPassword });
    await docRef.delete().catch(() => { });
    return { ok: true };
});
// ─── Signup with email verification (code-based) ───
// To prevent registration with someone else's email, we send a 6-digit code
// first, then create the Firebase Auth user only after the code is verified.
exports.sendSignupCode = (0, https_1.onCall)({ region: 'us-central1', secrets: [RESEND_API_KEY, EMAIL_FROM] }, async (request) => {
    const email = String(request.data?.email ?? '').trim().toLowerCase();
    if (!EMAIL_RE.test(email)) {
        throw new https_1.HttpsError('invalid-argument', '有効なメールアドレスを入力してください');
    }
    try {
        await admin.auth().getUserByEmail(email);
        throw new https_1.HttpsError('already-exists', 'このメールアドレスは既に登録されています');
    }
    catch (e) {
        if (e instanceof https_1.HttpsError)
            throw e;
        if (e?.code !== 'auth/user-not-found') {
            throw new https_1.HttpsError('internal', 'メールアドレスの確認に失敗しました');
        }
    }
    const docId = sha256(email);
    const docRef = db.collection('signupCodes').doc(docId);
    const existing = await docRef.get();
    if (existing.exists) {
        const last = existing.data()?.createdAt?.toMillis?.() ?? 0;
        if (Date.now() - last < RESEND_COOLDOWN_MS) {
            throw new https_1.HttpsError('resource-exhausted', '再送信は1分後にお試しください');
        }
    }
    const code = String((0, crypto_1.randomInt)(0, 1_000_000)).padStart(6, '0');
    await docRef.set({
        email,
        codeHash: sha256(code),
        attempts: 0,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + CODE_TTL_MS),
    });
    const resend = new resend_1.Resend(RESEND_API_KEY.value());
    const { error } = await resend.emails.send({
        from: EMAIL_FROM.value(),
        to: email,
        subject: 'huuwa 新規登録の認証コード',
        text: `huuwaへようこそ!\n\n認証コードは ${code} です。\n\n10分以内にアプリで入力してください。\n心当たりがない場合はこのメールを無視してください。`,
        html: `<p>huuwaへようこそ!</p><p>認証コードは <strong style="font-size:20px;letter-spacing:2px">${code}</strong> です。</p><p>10分以内にアプリで入力してください。</p><p style="color:#888;font-size:12px">心当たりがない場合はこのメールを無視してください。</p>`,
    });
    if (error) {
        await docRef.delete().catch(() => { });
        throw new https_1.HttpsError('internal', 'メール送信に失敗しました');
    }
    return { ok: true };
});
exports.verifySignupAndCreate = (0, https_1.onCall)({ region: 'us-central1' }, async (request) => {
    const email = String(request.data?.email ?? '').trim().toLowerCase();
    const code = String(request.data?.code ?? '').trim();
    const password = String(request.data?.password ?? '');
    const displayName = String(request.data?.displayName ?? '').trim();
    const username = String(request.data?.username ?? '').trim();
    if (!EMAIL_RE.test(email)) {
        throw new https_1.HttpsError('invalid-argument', '有効なメールアドレスを入力してください');
    }
    if (!/^\d{6}$/.test(code)) {
        throw new https_1.HttpsError('invalid-argument', '6桁のコードを入力してください');
    }
    if (password.length < 6) {
        throw new https_1.HttpsError('invalid-argument', 'パスワードは6文字以上で入力してください');
    }
    if (!displayName || displayName.length > 30) {
        throw new https_1.HttpsError('invalid-argument', '表示名を入力してください (30文字以内)');
    }
    if (!/^[a-zA-Z0-9_]{3,15}$/.test(username)) {
        throw new https_1.HttpsError('invalid-argument', 'ユーザー名は3〜15文字の英数字またはアンダースコアで入力してください');
    }
    const docId = sha256(email);
    const docRef = db.collection('signupCodes').doc(docId);
    const snap = await docRef.get();
    if (!snap.exists) {
        throw new https_1.HttpsError('not-found', '認証コードが見つかりません。再送信してください');
    }
    const data = snap.data();
    const expiresAt = data.expiresAt;
    if (expiresAt.toMillis() < Date.now()) {
        await docRef.delete().catch(() => { });
        throw new https_1.HttpsError('deadline-exceeded', '認証コードの有効期限が切れました');
    }
    const attempts = (data.attempts ?? 0);
    if (attempts >= MAX_ATTEMPTS) {
        await docRef.delete().catch(() => { });
        throw new https_1.HttpsError('resource-exhausted', '試行回数の上限に達しました。再送信してください');
    }
    if (sha256(code) !== data.codeHash) {
        await docRef.update({ attempts: attempts + 1 });
        throw new https_1.HttpsError('permission-denied', '認証コードが正しくありません');
    }
    // Race-condition guard: re-check the email isn't taken now that we hold a verified code.
    try {
        await admin.auth().getUserByEmail(email);
        await docRef.delete().catch(() => { });
        throw new https_1.HttpsError('already-exists', 'このメールアドレスは既に登録されています');
    }
    catch (e) {
        if (e instanceof https_1.HttpsError)
            throw e;
        if (e?.code !== 'auth/user-not-found') {
            throw new https_1.HttpsError('internal', 'メールアドレスの確認に失敗しました');
        }
    }
    const usernameQuery = await db.collection('users')
        .where('username', '==', username)
        .limit(1)
        .get();
    if (!usernameQuery.empty) {
        throw new https_1.HttpsError('already-exists', 'このユーザー名は既に使用されています');
    }
    let userRecord;
    try {
        userRecord = await admin.auth().createUser({
            email,
            password,
            displayName,
            emailVerified: true,
        });
    }
    catch (e) {
        if (e?.code === 'auth/email-already-exists') {
            throw new https_1.HttpsError('already-exists', 'このメールアドレスは既に登録されています');
        }
        throw new https_1.HttpsError('internal', 'アカウントの作成に失敗しました');
    }
    const uid = userRecord.uid;
    try {
        await db.collection('users').doc(uid).set({
            uid,
            displayName,
            username,
            avatarUrl: null,
            headerImageUrl: null,
            bio: '',
            statusMessage: '',
            hobbies: [],
            followersCount: 0,
            followingCount: 0,
            tweetsCount: 0,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        await db.collection('userPrivate').doc(uid).set({
            email,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    }
    catch {
        await admin.auth().deleteUser(uid).catch(() => { });
        throw new https_1.HttpsError('internal', 'プロフィールの作成に失敗しました');
    }
    await docRef.delete().catch(() => { });
    const customToken = await admin.auth().createCustomToken(uid);
    return { ok: true, customToken, uid };
});
// ─── Phone number sign-in (via Twilio + custom tokens) ───
const PHONE_RE = /^\+[1-9]\d{6,14}$/; // E.164
exports.sendPhoneCode = (0, https_1.onCall)({ region: 'us-central1', secrets: [TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER] }, async (request) => {
    const phone = String(request.data?.phone ?? '').trim();
    if (!PHONE_RE.test(phone)) {
        throw new https_1.HttpsError('invalid-argument', '有効な電話番号を国際表記で入力してください (例: +818012345678)');
    }
    const docId = sha256(phone);
    const docRef = db.collection('phoneAuthCodes').doc(docId);
    const existing = await docRef.get();
    if (existing.exists) {
        const last = existing.data()?.createdAt?.toMillis?.() ?? 0;
        if (Date.now() - last < RESEND_COOLDOWN_MS) {
            throw new https_1.HttpsError('resource-exhausted', '再送信は1分後にお試しください');
        }
    }
    const code = String((0, crypto_1.randomInt)(0, 1_000_000)).padStart(6, '0');
    await docRef.set({
        phone,
        codeHash: sha256(code),
        attempts: 0,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + CODE_TTL_MS),
    });
    const client = twilio(TWILIO_ACCOUNT_SID.value(), TWILIO_AUTH_TOKEN.value());
    try {
        await client.messages.create({
            from: TWILIO_FROM_NUMBER.value(),
            to: phone,
            body: `huuwa 認証コード: ${code}\n10分以内にアプリで入力してください。`,
        });
    }
    catch (e) {
        await docRef.delete().catch(() => { });
        console.error('[sendPhoneCode] Twilio error:', e);
        throw new https_1.HttpsError('internal', 'SMSの送信に失敗しました');
    }
    return { ok: true };
});
exports.verifyPhoneCode = (0, https_1.onCall)({ region: 'us-central1' }, async (request) => {
    const phone = String(request.data?.phone ?? '').trim();
    const code = String(request.data?.code ?? '').trim();
    if (!PHONE_RE.test(phone)) {
        throw new https_1.HttpsError('invalid-argument', '無効な電話番号です');
    }
    if (!/^\d{6}$/.test(code)) {
        throw new https_1.HttpsError('invalid-argument', '6桁のコードを入力してください');
    }
    const docRef = db.collection('phoneAuthCodes').doc(sha256(phone));
    const snap = await docRef.get();
    if (!snap.exists) {
        throw new https_1.HttpsError('not-found', '認証コードが見つかりません。再送信してください');
    }
    const data = snap.data();
    const expiresAt = data.expiresAt;
    if (expiresAt.toMillis() < Date.now()) {
        await docRef.delete().catch(() => { });
        throw new https_1.HttpsError('deadline-exceeded', '認証コードの有効期限が切れました');
    }
    const attempts = (data.attempts ?? 0);
    if (attempts >= MAX_ATTEMPTS) {
        await docRef.delete().catch(() => { });
        throw new https_1.HttpsError('resource-exhausted', '試行回数の上限に達しました。再送信してください');
    }
    if (sha256(code) !== data.codeHash) {
        await docRef.update({ attempts: attempts + 1 });
        throw new https_1.HttpsError('permission-denied', '認証コードが正しくありません');
    }
    // Find or create user with this phone number
    let uid;
    try {
        const existing = await admin.auth().getUserByPhoneNumber(phone);
        uid = existing.uid;
    }
    catch (e) {
        if (e?.code === 'auth/user-not-found') {
            const created = await admin.auth().createUser({ phoneNumber: phone });
            uid = created.uid;
        }
        else {
            throw new https_1.HttpsError('internal', 'ユーザー情報の取得に失敗しました');
        }
    }
    await docRef.delete().catch(() => { });
    const customToken = await admin.auth().createCustomToken(uid);
    return { ok: true, customToken, uid };
});
// ─── Scheduled deletion of accounts disabled for 30+ days ───
const ACCOUNT_DELETION_GRACE_DAYS = 30;
exports.purgeDisabledAccounts = (0, scheduler_1.onSchedule)({ region: 'us-central1', schedule: 'every day 03:00', timeZone: 'Asia/Tokyo' }, async () => {
    const cutoff = admin.firestore.Timestamp.fromMillis(Date.now() - ACCOUNT_DELETION_GRACE_DAYS * 24 * 60 * 60 * 1000);
    const snap = await db
        .collection('users')
        .where('disabled', '==', true)
        .where('disabledAt', '<=', cutoff)
        .limit(100)
        .get();
    for (const doc of snap.docs) {
        const uid = doc.id;
        try {
            await admin.auth().deleteUser(uid);
        }
        catch (e) {
            if (e?.code !== 'auth/user-not-found') {
                console.error(`[purgeDisabledAccounts] auth delete failed for ${uid}:`, e);
                continue;
            }
        }
        try {
            await doc.ref.delete();
        }
        catch (e) {
            console.error(`[purgeDisabledAccounts] firestore delete failed for ${uid}:`, e);
        }
    }
    console.log(`[purgeDisabledAccounts] purged ${snap.size} accounts`);
});
const MODERATION_PROMPT = `あなたはSNSの投稿モデレーターです。以下の投稿内容を評価してください。

判定カテゴリー:
- scam: 詐欺・投資勧誘・怪しいリンク・マルチ商法・偽ブランド販売
- sexual: 性的・アダルト・ポルノ
- violence: 暴力・殺害の示唆・武器販売
- hate: 差別・ヘイトスピーチ・特定個人への誹謗中傷
- self_harm: 自傷・自殺の助長
- illegal: 違法薬物・違法行為の勧誘
- spam: 無意味な広告の繰り返し

必ず以下のJSON形式のみで回答してください(説明文不要):
{
  "flagged": true/false,
  "categories": ["scam","sexual",...],
  "severity": "low" | "medium" | "high",
  "reason": "短い理由(任意)"
}

severity基準:
- high: 削除対象(性的・違法・詐欺・重度ヘイト)
- medium: 警告対象
- low: 軽微 or 問題なし

投稿内容:
"""
{CONTENT}
"""`;
async function moderateText(content) {
    if (!content || content.trim().length === 0)
        return null;
    try {
        const genAI = new generative_ai_1.GoogleGenerativeAI(GEMINI_API_KEY.value());
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        const prompt = MODERATION_PROMPT.replace('{CONTENT}', content.slice(0, 2000));
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        // Extract JSON (Gemini sometimes wraps in ```json)
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch)
            return null;
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed;
    }
    catch (e) {
        console.error('[moderateText] error:', e);
        return null;
    }
}
exports.moderateTweet = (0, firestore_1.onDocumentCreated)({
    region: 'us-central1',
    document: 'tweets/{tweetId}',
    secrets: [GEMINI_API_KEY],
}, async (event) => {
    const snap = event.data;
    if (!snap)
        return;
    const data = snap.data();
    const content = data?.content ?? '';
    if (!content || content.length < 3)
        return;
    const result = await moderateText(content);
    if (!result || !result.flagged)
        return;
    console.log(`[moderateTweet] Flagged tweet ${event.params.tweetId}:`, result);
    if (result.severity === 'high') {
        // Delete the tweet
        await snap.ref.delete().catch(() => { });
        // Notify the author
        if (data?.authorUid) {
            await db.collection('notifications').add({
                type: 'moderation',
                recipientUid: data.authorUid,
                actor: { uid: 'system', displayName: 'huuwa', username: 'huuwa', avatarUrl: null },
                actorUid: 'system',
                targetId: event.params.tweetId,
                message: `投稿がガイドライン違反(${result.categories.join(', ')})で自動削除されました。`,
                read: false,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            }).catch(() => { });
        }
    }
    else if (result.severity === 'medium') {
        // Flag for review
        await snap.ref.update({
            moderationFlagged: true,
            moderationCategories: result.categories,
            moderationReason: result.reason ?? null,
        }).catch(() => { });
    }
});
exports.moderateThread = (0, firestore_1.onDocumentCreated)({
    region: 'us-central1',
    document: 'threads/{threadId}',
    secrets: [GEMINI_API_KEY],
}, async (event) => {
    const snap = event.data;
    if (!snap)
        return;
    const data = snap.data();
    const title = data?.title ?? '';
    if (!title || title.length < 3)
        return;
    const result = await moderateText(title);
    if (!result || !result.flagged)
        return;
    console.log(`[moderateThread] Flagged thread ${event.params.threadId}:`, result);
    if (result.severity === 'high') {
        await snap.ref.delete().catch(() => { });
        if (data?.authorUid) {
            await db.collection('notifications').add({
                type: 'moderation',
                recipientUid: data.authorUid,
                actor: { uid: 'system', displayName: 'huuwa', username: 'huuwa', avatarUrl: null },
                actorUid: 'system',
                targetId: event.params.threadId,
                message: `スレッドがガイドライン違反(${result.categories.join(', ')})で自動削除されました。`,
                read: false,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            }).catch(() => { });
        }
    }
    else if (result.severity === 'medium') {
        await snap.ref.update({
            moderationFlagged: true,
            moderationCategories: result.categories,
            moderationReason: result.reason ?? null,
        }).catch(() => { });
    }
});
// ─── Propagate user.isPrivate to their tweets / threads / shorts ───
async function bulkSetPrivacy(collection, authorUid, isPrivate) {
    const PAGE = 400;
    let updated = 0;
    let lastSnap = null;
    // eslint-disable-next-line no-constant-condition
    while (true) {
        let q = db
            .collection(collection)
            .where("authorUid", "==", authorUid)
            .limit(PAGE);
        if (lastSnap)
            q = q.startAfter(lastSnap);
        const snap = await q.get();
        if (snap.empty)
            break;
        const batch = db.batch();
        snap.docs.forEach((d) => batch.update(d.ref, { authorIsPrivate: isPrivate }));
        await batch.commit();
        updated += snap.size;
        if (snap.size < PAGE)
            break;
        lastSnap = snap.docs[snap.size - 1];
    }
    return updated;
}
exports.propagatePrivacyChange = (0, firestore_1.onDocumentUpdated)({ region: "us-central1", document: "users/{uid}" }, async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after)
        return;
    const wasPrivate = before.isPrivate === true;
    const nowPrivate = after.isPrivate === true;
    if (wasPrivate === nowPrivate)
        return;
    const uid = event.params.uid;
    const [t, th, s] = await Promise.all([
        bulkSetPrivacy("tweets", uid, nowPrivate),
        bulkSetPrivacy("threads", uid, nowPrivate),
        bulkSetPrivacy("shorts", uid, nowPrivate),
    ]);
    console.log(`[propagatePrivacyChange] ${uid} → isPrivate=${nowPrivate}; updated tweets=${t}, threads=${th}, shorts=${s}`);
});
const RATE_LIMITS = {
    tweet: { hourly: 30, daily: 200 },
    thread: { hourly: 10, daily: 30 },
    openchat: { hourly: 5, daily: 15 },
    reply: { hourly: 60, daily: 400 },
};
async function checkAndIncrementLimit(uid, kind) {
    const limits = RATE_LIMITS[kind];
    const ref = db.collection('rateLimits').doc(`${uid}_${kind}`);
    const now = Date.now();
    const HOUR = 60 * 60 * 1000;
    const DAY = 24 * HOUR;
    return db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const data = snap.exists ? snap.data() : null;
        let hourlyCount = (data?.hourlyCount ?? 0);
        let hourlyStart = (data?.hourlyStart?.toMillis?.() ?? 0);
        let dailyCount = (data?.dailyCount ?? 0);
        let dailyStart = (data?.dailyStart?.toMillis?.() ?? 0);
        if (now - hourlyStart > HOUR) {
            hourlyCount = 0;
            hourlyStart = now;
        }
        if (now - dailyStart > DAY) {
            dailyCount = 0;
            dailyStart = now;
        }
        if (hourlyCount >= limits.hourly)
            return { ok: false, reason: 'hourly' };
        if (dailyCount >= limits.daily)
            return { ok: false, reason: 'daily' };
        tx.set(ref, {
            hourlyCount: hourlyCount + 1,
            hourlyStart: admin.firestore.Timestamp.fromMillis(hourlyStart),
            dailyCount: dailyCount + 1,
            dailyStart: admin.firestore.Timestamp.fromMillis(dailyStart),
        }, { merge: true });
        return { ok: true };
    });
}
async function rejectWithMessage(ref, recipientUid, message) {
    await ref.delete().catch(() => { });
    await db.collection('notifications').add({
        type: 'rate_limit',
        recipientUid,
        actor: { uid: 'system', displayName: 'huuwa', username: 'huuwa', avatarUrl: null },
        actorUid: 'system',
        targetId: ref.id,
        message,
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    }).catch(() => { });
}
exports.rateLimitTweet = (0, firestore_1.onDocumentCreated)({ region: 'us-central1', document: 'tweets/{tweetId}' }, async (event) => {
    const snap = event.data;
    if (!snap)
        return;
    const data = snap.data();
    const uid = data?.authorUid;
    if (!uid)
        return;
    const kind = data?.parentTweetId ? 'reply' : 'tweet';
    const result = await checkAndIncrementLimit(uid, kind);
    if (!result.ok) {
        const msg = result.reason === 'hourly'
            ? '投稿の速度が速すぎます。しばらく時間をおいて再度お試しください。'
            : '本日の投稿上限に達しました。明日また投稿できます。';
        await rejectWithMessage(snap.ref, uid, msg);
    }
});
exports.rateLimitThread = (0, firestore_1.onDocumentCreated)({ region: 'us-central1', document: 'threads/{threadId}' }, async (event) => {
    const snap = event.data;
    if (!snap)
        return;
    const uid = snap.data()?.authorUid;
    if (!uid)
        return;
    const result = await checkAndIncrementLimit(uid, 'thread');
    if (!result.ok) {
        const msg = result.reason === 'hourly'
            ? 'スレッドの作成速度が速すぎます。しばらく時間をおいてください。'
            : '本日のスレッド作成上限に達しました。';
        await rejectWithMessage(snap.ref, uid, msg);
    }
});
exports.rateLimitChatRoom = (0, firestore_1.onDocumentCreated)({ region: 'us-central1', document: 'chatRooms/{roomId}' }, async (event) => {
    const snap = event.data;
    if (!snap)
        return;
    const data = snap.data();
    if (data?.type !== 'open')
        return; // Only count open chat rooms
    const uid = data?.createdBy;
    if (!uid)
        return;
    const result = await checkAndIncrementLimit(uid, 'openchat');
    if (!result.ok) {
        const msg = result.reason === 'hourly'
            ? 'オープンチャットの作成速度が速すぎます。しばらく時間をおいてください。'
            : '本日のオープンチャット作成上限に達しました。';
        await rejectWithMessage(snap.ref, uid, msg);
    }
});
// ─── One-time migration: move email out of public users docs into userPrivate ───
// Callable by anyone authed; only processes the caller's own profile.
// Safe to call repeatedly (idempotent).
exports.migrateMyEmailToPrivate = (0, https_1.onCall)({ region: 'us-central1' }, async (request) => {
    const uid = request.auth?.uid;
    if (!uid)
        throw new https_1.HttpsError('unauthenticated', 'ログインが必要です');
    const userSnap = await db.collection('users').doc(uid).get();
    const data = userSnap.data();
    const email = data?.email;
    if (!email)
        return { ok: true, migrated: false };
    await db.collection('userPrivate').doc(uid).set({
        email,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    await db.collection('users').doc(uid).update({
        email: admin.firestore.FieldValue.delete(),
    });
    return { ok: true, migrated: true };
});
// ─── Image moderation: when a tweet/thread is created with images, scan them with Gemini ───
async function moderateImageBytes(buffer, mime) {
    try {
        const genAI = new generative_ai_1.GoogleGenerativeAI(GEMINI_API_KEY.value());
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        const result = await model.generateContent([
            MODERATION_PROMPT.replace('{CONTENT}', '(image attached — judge based on visual content)'),
            { inlineData: { data: buffer.toString('base64'), mimeType: mime } },
        ]);
        const text = result.response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch)
            return null;
        return JSON.parse(jsonMatch[0]);
    }
    catch (e) {
        console.error('[moderateImageBytes] error:', e);
        return null;
    }
}
async function moderateImageUrls(urls) {
    // Fetch each image and run moderation; high-severity hit short-circuits.
    for (const url of urls) {
        try {
            const res = await fetch(url);
            if (!res.ok)
                continue;
            const mime = res.headers.get('content-type') ?? 'image/jpeg';
            const buf = Buffer.from(await res.arrayBuffer());
            const r = await moderateImageBytes(buf, mime);
            if (r?.flagged && (r.severity === 'high' || r.severity === 'medium'))
                return r;
        }
        catch (e) {
            console.error('[moderateImageUrls] fetch failed for', url, e);
        }
    }
    return null;
}
exports.moderateTweetImages = (0, firestore_1.onDocumentCreated)({
    region: 'us-central1',
    document: 'tweets/{tweetId}',
    secrets: [GEMINI_API_KEY],
}, async (event) => {
    const snap = event.data;
    if (!snap)
        return;
    const data = snap.data();
    const urls = data?.imageUrls ?? [];
    if (urls.length === 0)
        return;
    const result = await moderateImageUrls(urls);
    if (!result || !result.flagged)
        return;
    console.log(`[moderateTweetImages] Flagged tweet ${event.params.tweetId}:`, result);
    if (result.severity === 'high') {
        await snap.ref.delete().catch(() => { });
        if (data?.authorUid) {
            await db.collection('notifications').add({
                type: 'moderation',
                recipientUid: data.authorUid,
                actor: { uid: 'system', displayName: 'huuwa', username: 'huuwa', avatarUrl: null },
                actorUid: 'system',
                targetId: event.params.tweetId,
                message: `投稿の画像がガイドライン違反(${result.categories.join(', ')})で自動削除されました。`,
                read: false,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            }).catch(() => { });
        }
    }
    else if (result.severity === 'medium') {
        await snap.ref.update({
            moderationFlagged: true,
            moderationCategories: result.categories,
            moderationReason: result.reason ?? null,
        }).catch(() => { });
    }
});
//# sourceMappingURL=index.js.map