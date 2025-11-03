// Store user context in a module-level variable for AI tools to access
let currentUserContext: {
  userId: string;
  clerkUserId: string;
  userGroupId: string | null;
} | null = null;

export function getUserContext() {
  return currentUserContext;
}

export function setUserContext(context: {
  userId: string;
  clerkUserId: string;
  userGroupId: string | null;
} | null) {
  currentUserContext = context;
}
