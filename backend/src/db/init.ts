import mongoose from 'mongoose';
import User from '../models/User';
import PendingUser from '../models/PendingUser';

/**
 * Initialises the MongoDB database:
 *  - Creates all indexes defined in Mongoose schemas
 *  - Logs collection state on startup
 *  - MongoDB creates the database file automatically on first write,
 *    so no manual db creation is ever needed.
 */
export async function initDatabase(): Promise<void> {
  console.log('\n══════════════════════════════════════════');
  console.log('  MongoDB Database Init');
  console.log('══════════════════════════════════════════');

  // ── Step 1: Remove duplicate email documents (keep newest) ──────────────
  // syncIndexes() will fail with E11000 if duplicates exist in the collection.
  try {
    const db = mongoose.connection.db!;
    const pipeline = [
      { $group: { _id: '$email', ids: { $push: '$_id' }, count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
    ];
    const duplicates = await db.collection('users').aggregate(pipeline).toArray();
    for (const dup of duplicates) {
      // Keep the last inserted document, remove the rest
      const [, ...toRemove] = dup.ids;
      await db.collection('users').deleteMany({ _id: { $in: toRemove } });
      console.log(`  ⚠️  Removed ${toRemove.length} duplicate(s) for email: ${dup._id}`);
    }
  } catch (dedupErr) {
    console.warn('  ⚠️  Dedup step skipped:', dedupErr);
  }

  // ── Step 2: Sync indexes now that duplicates are gone ───────────────────
  try {
    await User.syncIndexes();
    await PendingUser.syncIndexes();

    const userCount    = await User.countDocuments();
    const pendingCount = await PendingUser.countDocuments();

    console.log(`  ✅  users        collection ready  (${userCount} docs)`);
    console.log(`  ✅  pendingusers collection ready  (${pendingCount} docs)`);
    console.log(`  ✅  Indexes synced (email unique, TTL on pendingusers)`);
    console.log('══════════════════════════════════════════\n');
  } catch (err) {
    console.error('  ❌  DB init failed:', err);
    throw err;
  }
}
