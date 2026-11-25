import {
  collection,
  doc,
  getDocsFromServer,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  startAfter,
} from 'firebase/firestore';
import {
  CERTIFICATION_LINK_PAGE_SIZE,
  CERTIFICATION_LINK_SLOTS,
  certificationLinkEdit,
  certificationLinkError,
  certificationLinkRemoval,
  certificationLinkUrl,
} from '../utils/certificationLinks.js';

export function createCertificationLinkRepository(db) {
  const published = collection(db, 'publishedCertificationLinks');
  const owned = (uid) => {
    if (typeof uid !== 'string' || !uid || uid.includes('/'))
      throw certificationLinkError('denied');
    return collection(db, 'users', uid, 'certificationLinks');
  };
  const ownerRef = (uid, slot) => {
    if (!CERTIFICATION_LINK_SLOTS.includes(slot)) throw certificationLinkError('invalid');
    return doc(owned(uid), slot);
  };

  return {
    async list(uid) {
      const snapshot = await getDocsFromServer(owned(uid));
      return snapshot.docs.map((entry) => ({ ...entry.data(), slot: entry.id }));
    },
    async publicPage(after) {
      const snapshot = await getDocsFromServer(
        query(
          published,
          orderBy('publishedAt', 'desc'),
          ...(after ? [startAfter(after)] : []),
          limit(CERTIFICATION_LINK_PAGE_SIZE)
        )
      );
      return {
        rows: snapshot.docs.flatMap((entry) => {
          const url = certificationLinkUrl(entry.data().url);
          return url ? [{ id: entry.id, url }] : [];
        }),
        next: snapshot.size === CERTIFICATION_LINK_PAGE_SIZE ? snapshot.docs.at(-1) : null,
      };
    },
    async save(uid, command) {
      const ownedRef = ownerRef(uid, command.slot);
      await runTransaction(db, async (transaction) => {
        const current = (await transaction.get(ownedRef)).data();
        const next = certificationLinkEdit(current, command);
        if (!next) return;
        const publicRef = doc(published, next.id);
        if (current?.url) transaction.update(publicRef, { url: next.url });
        else transaction.set(publicRef, { url: next.url, publishedAt: serverTimestamp() });
        transaction.set(ownedRef, next);
      });
    },
    async remove(uid, command) {
      const ownedRef = ownerRef(uid, command.slot);
      await runTransaction(db, async (transaction) => {
        const current = (await transaction.get(ownedRef)).data();
        const next = certificationLinkRemoval(current, command);
        if (!next) return;
        transaction.delete(doc(published, next.id));
        transaction.set(ownedRef, next);
      });
    },
  };
}
