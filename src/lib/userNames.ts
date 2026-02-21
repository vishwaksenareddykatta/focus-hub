// Duo-user display name mapping
const USER_NAMES: Record<string, string> = {
  "3abc2ab8-0aea-47d1-9666-b31ba0978f5f": "VSRK",
  "cf758728-b3c1-4b9e-8065-7cb9208a7003": "Shrav",
};

export const getUserName = (userId: string): string =>
  USER_NAMES[userId] ?? "Unknown";

export const getOtherUserName = (currentUserId: string): string => {
  const otherId = Object.keys(USER_NAMES).find((id) => id !== currentUserId);
  return otherId ? USER_NAMES[otherId] : "Other";
};
