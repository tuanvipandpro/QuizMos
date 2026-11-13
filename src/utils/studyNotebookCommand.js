import { contentHash } from './contentHash.js';
import { orderObjectKeys } from './questionFingerprint.js';
import { secureId, UUID_PATTERN } from './secureId.js';
import {
  notebookEntryKey,
  notebookError,
  transitionNotebookState,
  validateNotebookReference,
} from './studyNotebook.js';

const fields = [
  'owner',
  'ref',
  'entryKey',
  'operationId',
  'expectedRevision',
  'expectedGeneration',
  'change',
  'fingerprint',
];
const whole = (value) => Number.isSafeInteger(value) && value >= 0;
const payload = ({ fingerprint: _fingerprint, ...body }) => JSON.stringify(orderObjectKeys(body));
const ownerId = (uid) => typeof uid === 'string' && !!uid && !uid.includes('/');

/** Prepare once, retain unchanged on retry. Never rebase a pending command. */
export async function createNotebookCommand({
  owner,
  ref,
  expectedRevision,
  expectedGeneration,
  change,
  operationId = secureId(),
}) {
  const command = {
    owner,
    ref: { ...validateNotebookReference(ref) },
    entryKey: await notebookEntryKey(ref),
    operationId,
    expectedRevision,
    expectedGeneration,
    change: { ...change },
  };
  command.fingerprint = await contentHash(payload(command));
  await validateNotebookCommand(command, owner);
  Object.freeze(command.ref);
  Object.freeze(command.change);
  return Object.freeze(command);
}

export async function validateNotebookCommand(command, uid) {
  if (!ownerId(uid) || command?.owner !== uid) throw notebookError('AUTH');
  if (
    !command ||
    Object.keys(command).length !== fields.length ||
    !fields.every((field) => Object.hasOwn(command, field)) ||
    typeof command.operationId !== 'string' ||
    !UUID_PATTERN.test(command.operationId) ||
    !whole(command.expectedRevision) ||
    !whole(command.expectedGeneration) ||
    command.entryKey !== (await notebookEntryKey(command.ref)) ||
    command.fingerprint !== (await contentHash(payload(command)))
  )
    throw notebookError('INVALID');
  transitionNotebookState(null, command.change, 0);
  return command;
}

export function normalizeNotebookError(error) {
  if (typeof error?.code === 'string' && error.code.startsWith('NOTEBOOK_')) return error;
  const code = String(error?.code || '').replace(/^firestore\//, '');
  if (['permission-denied', 'unauthenticated'].includes(code)) return notebookError('DENIED');
  if (['unavailable', 'deadline-exceeded', 'aborted', 'failed-precondition'].includes(code))
    return notebookError('NETWORK');
  return notebookError('INVALID');
}
