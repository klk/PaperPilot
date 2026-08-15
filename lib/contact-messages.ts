import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

export type ContactMessageStatus = "new" | "in_progress" | "closed";

export type ContactMessage = {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: ContactMessageStatus;
  createdAt: string;
  updatedAt: string;
};

const dataDirectory = path.join(process.cwd(), "data");
const storePath = path.join(dataDirectory, "contact-messages.json");
let writeQueue = Promise.resolve();

async function readMessages() {
  try {
    const raw = await readFile(storePath, "utf8");
    const data: unknown = JSON.parse(raw);
    return Array.isArray(data) ? data as ContactMessage[] : [];
  } catch (reason) {
    if ((reason as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw reason;
  }
}

async function saveMessages(messages: ContactMessage[]) {
  await mkdir(dataDirectory, { recursive: true });
  const temporaryPath = `${storePath}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(messages, null, 2)}\n`, "utf8");
  await rename(temporaryPath, storePath);
}

async function mutate<T>(operation: (messages: ContactMessage[]) => T | Promise<T>) {
  let value!: T;
  writeQueue = writeQueue.then(async () => {
    const messages = await readMessages();
    value = await operation(messages);
    await saveMessages(messages);
  });
  await writeQueue;
  return value;
}

export async function listContactMessages() {
  const messages = await readMessages();
  return messages.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export function createContactMessage(input: Pick<ContactMessage, "name" | "email" | "subject" | "message">) {
  return mutate((messages) => {
    const now = new Date().toISOString();
    const message: ContactMessage = { id: crypto.randomUUID(), ...input, status: "new", createdAt: now, updatedAt: now };
    messages.push(message);
    return message;
  });
}

export function updateContactMessageStatus(id: string, status: ContactMessageStatus) {
  return mutate((messages) => {
    const message = messages.find((candidate) => candidate.id === id);
    if (!message) return null;
    message.status = status;
    message.updatedAt = new Date().toISOString();
    return message;
  });
}

export function deleteContactMessage(id: string) {
  return mutate((messages) => {
    const index = messages.findIndex((candidate) => candidate.id === id);
    if (index === -1) return false;
    messages.splice(index, 1);
    return true;
  });
}
