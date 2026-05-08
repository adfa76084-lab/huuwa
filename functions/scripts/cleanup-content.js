/**
 * Wipe all dynamic user content for App Store launch — keeps:
 *   - Firebase Auth users
 *   - users / userPrivate Firestore docs (so existing test accounts can still log in)
 *   - Storage assets are NOT touched here (delete from Firebase Console if needed)
 *
 * Deletes everything else: posts, threads, chatRooms (with subcollections),
 * notifications, follows, likes, bookmarks, polls, shorts, hashtags, etc.
 *
 * Usage: node scripts/cleanup-content.js [--dry-run]
 */

const admin = require('firebase-admin');

admin.initializeApp({ projectId: 'glow-38ddf' });
const db = admin.firestore();

const DRY_RUN = process.argv.includes('--dry-run');

// Top-level collections to wipe. Subcollections under each doc are deleted
// recursively via Firestore's recursiveDelete API.
const COLLECTIONS = [
  'tweets',
  'threads',
  'chatRooms',
  'notifications',
  'follows',
  'followRequests',
  'likes',
  'threadLikes',
  'bookmarks',
  'polls',
  'shorts',
  'hashtags',
  'tweetViews',
  'reports',
  'chatNotificationPrefs',
  'rateLimits',
  // Short-lived code stores — usually empty, but clear them too.
  'signupCodes',
  'emailChangeCodes',
  'passwordResetCodes',
  'phoneAuthCodes',
  'loginCodes',
  // User-created categories. (Default categories are created at runtime.)
  'categories',
];

async function deleteCollection(name) {
  const ref = db.collection(name);
  const snap = await ref.get();
  if (snap.empty) {
    console.log(`  ${name}: 0 docs`);
    return 0;
  }

  const total = snap.size;
  if (DRY_RUN) {
    console.log(`  ${name}: ${total} docs (dry-run)`);
    return total;
  }

  // recursiveDelete handles subcollections + batches under the hood.
  const bulkWriter = db.bulkWriter();
  bulkWriter.onWriteError((err) => {
    if (err.failedAttempts < 3) return true;
    console.error(`    bulkWriter giving up on ${err.documentRef.path}:`, err.message);
    return false;
  });
  for (const doc of snap.docs) {
    await db.recursiveDelete(doc.ref, bulkWriter);
  }
  await bulkWriter.close();
  console.log(`  ${name}: deleted ${total} docs`);
  return total;
}

(async () => {
  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== DELETING ===');
  console.log('Project: glow-38ddf');
  console.log('');

  let total = 0;
  for (const name of COLLECTIONS) {
    try {
      total += await deleteCollection(name);
    } catch (e) {
      console.error(`  ${name}: ERROR`, e.message);
    }
  }

  console.log('');
  console.log(`Total: ${total} top-level docs ${DRY_RUN ? 'would be' : 'were'} deleted`);
  console.log('');
  console.log('Preserved:');
  console.log('  - Firebase Auth users');
  console.log('  - users / userPrivate (account profiles + email)');
  console.log('  - Storage files (delete from Firebase Console if needed)');
  process.exit(0);
})();
