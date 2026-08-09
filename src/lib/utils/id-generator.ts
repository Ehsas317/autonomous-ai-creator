export function generateId(prefix: string = ""): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 10);
  return `${prefix}${prefix ? "-" : ""}${timestamp}-${randomPart}`;
}

export function generateAgentId(): string {
  return generateId("agent");
}

export function generatePostId(): string {
  return generateId("post");
}

export function generateTopicId(): string {
  return generateId("topic");
}