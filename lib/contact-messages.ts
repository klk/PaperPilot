import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { getPool } from "./db";

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

function usesDatabase() { return Boolean(process.env.DATABASE_URL); }

async function ensureContactMessagesTable() {
  await getPool().query(`
    create table if not exists contact_messages (
      id uuid primary key,
      name text not null,
      email text not null,
      subject text not null,
      message text not null,
      status text not null check (status in ('new', 'in_progress', 'closed')),
      created_at timestamptz not null,
      updated_at timestamptz not null
    )
  `);
}

type ContactRow = Omit<ContactMessage, "createdAt" | "updatedAt"> & { created_at: Date; updated_at: Date };
function fromRow(row: ContactRow): ContactMessage {
  return { id: row.id, name: row.name, email: row.email, subject: row.subject, message: row.message, status: row.status, createdAt: row.created_at.toISOString(), updatedAt: row.updated_at.toISOString() };
}

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
  if (usesDatabase()) {
    await ensureContactMessagesTable();
    const { rows } = await getPool().query<ContactRow>("select id, name, email, subject, message, status, created_at, updated_at from contact_messages order by created_at desc");
    return rows.map(fromRow);
  }
  const messages = await readMessages();
  return messages.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export async function createContactMessage(input: Pick<ContactMessage, "name" | "email" | "subject" | "message">) {
  if (usesDatabase()) {
    await ensureContactMessagesTable();
    const now = new Date();
    const id = crypto.randomUUID();
    const { rows } = await getPool().query<ContactRow>({
      text: "insert into contact_messages (id, name, email, subject, message, status, created_at, updated_at) values ($1, $2, $3, $4, $5, 'new', $6, $6) returning id, name, email, subject, message, status, created_at, updated_at",
      values: [id, input.name, input.email, input.subject, input.message, now],
    });
    return fromRow(rows[0]);
  }
  return mutate((messages) => {
    const now = new Date().toISOString();
    const message: ContactMessage = { id: crypto.randomUUID(), ...input, status: "new", createdAt: now, updatedAt: now };
    messages.push(message);
    return message;
  });
}

export async function updateContactMessageStatus(id: string, status: ContactMessageStatus) {
  if (usesDatabase()) {
    await ensureContactMessagesTable();
    const { rows } = await getPool().query<ContactRow>({
      text: "update contact_messages set status = $2, updated_at = now() where id = $1 returning id, name, email, subject, message, status, created_at, updated_at",
      values: [id, status],
    });
    return rows[0] ? fromRow(rows[0]) : null;
  }
  return mutate((messages) => {
    const message = messages.find((candidate) => candidate.id === id);
    if (!message) return null;
    message.status = status;
    message.updatedAt = new Date().toISOString();
    return message;
  });
}

export async function deleteContactMessage(id: string) {
  if (usesDatabase()) {
    await ensureContactMessagesTable();
    const result = await getPool().query({ text: "delete from contact_messages where id = $1", values: [id] });
    return result.rowCount === 1;
  }
  return mutate((messages) => {
    const index = messages.findIndex((candidate) => candidate.id === id);
    if (index === -1) return false;
    messages.splice(index, 1);
    return true;
  });
}
