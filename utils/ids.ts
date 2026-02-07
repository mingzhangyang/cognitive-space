export const createMessageId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
};
