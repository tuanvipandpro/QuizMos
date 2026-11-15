export const NOTEBOOK_MESSAGES = {
  NOTEBOOK_UNCONFIRMED:
    'Notebook sync for this result has not been confirmed. Use Refresh and retry to capture it explicitly.',
  NOTEBOOK_REFERENCE_SIZE:
    'This question reference is too large for notebook storage. You can continue studying it.',
  NOTEBOOK_AUTH: 'Sign in to use your private study notebook.',
  NOTEBOOK_DENIED: 'Notebook access was denied. Check your account and retry.',
  NOTEBOOK_NETWORK: 'Could not reach your notebook. Check your connection and retry.',
  NOTEBOOK_CONFLICT:
    'This entry changed in another tab or device. Your text is kept. Refresh, compare and save again.',
  NOTEBOOK_QUOTA: 'Your notebook has reached 500 entries. Remove an entry before adding another.',
  NOTEBOOK_SIZE:
    'Shorten the note to 2,000 characters and 8,000 UTF-8 bytes. The entry must fit its storage limit.',
  NOTEBOOK_STORAGE: 'Tab storage is unavailable. Your text stays here while this page is open.',
  NOTEBOOK_SOURCE_CHANGED: 'The source changed. Your existing notebook entry is kept.',
  NOTEBOOK_SOURCE_UNAVAILABLE: 'Save this quiz to your account before adding notebook entries.',
  NOTEBOOK_MISSING:
    'This revision selection is not available in this account and tab. Select questions again.',
  NOTEBOOK_INVALID: 'Notebook data could not be validated. Refresh and retry.',
  NOTEBOOK_BUSY: 'Wait for the pending operation, or resolve its error before saving again.',
};
export const notebookMessage = (error) =>
  NOTEBOOK_MESSAGES[error?.code] || NOTEBOOK_MESSAGES.NOTEBOOK_NETWORK;
export const NOTEBOOK_SOURCE_LABELS = {
  current: 'Ready to study',
  missing: 'Source unavailable',
  changed: 'Source changed',
  replaced: 'Private quiz replaced',
  unavailable: 'Source could not be checked',
};
