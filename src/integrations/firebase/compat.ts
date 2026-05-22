/**
 * Supabase-compatible shim over Firebase.
 *
 * This lets all existing pages that do:
 *   import { supabase } from "@/integrations/supabase/client"
 *   supabase.from("table").select(...)
 *
 * continue to work without modification, by routing calls to Firestore,
 * Firebase Storage, and Firebase Auth under the hood.
 *
 * Supported patterns:
 *   .from(table).select(fields)
 *   .from(table).insert(data)
 *   .from(table).update(data)
 *   .from(table).delete()
 *   .eq(field, value)  .neq()  .in()  .or()  .order()  .limit()  .single()
 *   .select("*", { count: "exact", head: true })
 *   .storage.from(bucket).upload(path, file)
 *   .storage.from(bucket).getPublicUrl(path)
 *   .storage.from(bucket).createSignedUrl(path, seconds)
 *   .auth.getSession()  .auth.onAuthStateChange()  .auth.signUp()
 *   .auth.signInWithPassword()  .auth.signOut()  .auth.getUser()
 *   .auth.updateUser()  .auth.resetPasswordForEmail()
 *   .channel().on().subscribe()  .removeChannel()
 *   .functions.invoke(name, { body })
 */

import {
  collection, doc, getDoc, getDocs, addDoc, setDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit, onSnapshot, serverTimestamp,
  getCountFromServer, writeBatch, Timestamp,
  db,
} from "./db";
import { uploadFile, deleteFile } from "./storage";
import { getDownloadURL, ref } from "firebase/storage";
import { storage, auth } from "./client";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updatePassword,
  updateEmail,
} from "firebase/auth";
import type { QueryConstraint, DocumentData } from "firebase/firestore";

// ── Realtime channel stub ────────────────────────────────────────────────────
const activeChannels: Map<string, () => void> = new Map();

function makeChannel(channelName: string) {
  let unsubscribe: (() => void) | null = null;

  const channel = {
    on(
      _event: string,
      opts: { event?: string; schema?: string; table?: string; filter?: string },
      callback: (payload: any) => void
    ) {
      // Map postgres_changes to Firestore onSnapshot
      if (opts.table) {
        const constraints: QueryConstraint[] = [];
        if (opts.filter) {
          // Parse simple "field=eq.value" filter
          const m = opts.filter.match(/^(\w+)=eq\.(.+)$/);
          if (m) constraints.push(where(m[1], "==", m[2]));
        }
        const q = constraints.length
          ? query(collection(db, opts.table), ...constraints)
          : query(collection(db, opts.table));
        unsubscribe = onSnapshot(q, (snap) => {
          snap.docChanges().forEach((change) => {
            callback({ new: { id: change.doc.id, ...change.doc.data() }, eventType: change.type });
          });
        });
        activeChannels.set(channelName, unsubscribe);
      }
      return channel;
    },
    subscribe() { return channel; },
  };
  return channel;
}

// ── Query builder ────────────────────────────────────────────────────────────
function makeQueryBuilder(tableName: string) {
  const constraints: QueryConstraint[] = [];
  let _selectFields = "*";
  let _isSingle = false;
  let _isCount = false;
  let _isHead = false;
  let _updateData: DocumentData | null = null;
  let _insertData: DocumentData | DocumentData[] | null = null;
  let _isDelete = false;
  let _limitVal: number | null = null;

  const builder: any = {
    select(fields = "*", opts?: { count?: string; head?: boolean }) {
      _selectFields = fields;
      if (opts?.count === "exact") _isCount = true;
      if (opts?.head) _isHead = true;
      return builder;
    },
    insert(data: DocumentData | DocumentData[]) {
      _insertData = data;
      return builder;
    },
    update(data: DocumentData) {
      _updateData = data;
      return builder;
    },
    delete() {
      _isDelete = true;
      return builder;
    },
    upsert(data: DocumentData | DocumentData[]) {
      _insertData = data;
      return builder;
    },
    eq(field: string, value: unknown) {
      constraints.push(where(field, "==", value));
      return builder;
    },
    neq(field: string, value: unknown) {
      constraints.push(where(field, "!=", value));
      return builder;
    },
    in(field: string, values: unknown[]) {
      if (values.length > 0) constraints.push(where(field, "in", values));
      return builder;
    },
    or(filterStr: string) {
      // Basic OR: "field1.eq.val1,field2.eq.val2" — Firestore doesn't support
      // real OR across fields, so we skip the constraint and fetch all, then
      // filter client-side in the then() handler.
      (builder as any)._orFilter = filterStr;
      return builder;
    },
    order(field: string, opts?: { ascending?: boolean }) {
      constraints.push(orderBy(field, opts?.ascending === false ? "desc" : "asc"));
      return builder;
    },
    limit(n: number) {
      _limitVal = n;
      constraints.push(limit(n));
      return builder;
    },
    single() {
      _isSingle = true;
      return builder;
    },
    // Allow .then() so it works as a promise
    then(resolve: (v: any) => void, reject?: (e: any) => void) {
      return builder._execute().then(resolve, reject);
    },
    async _execute() {
      try {
        // ── INSERT ──────────────────────────────────────────────────────────
        if (_insertData !== null) {
          const rows = Array.isArray(_insertData) ? _insertData : [_insertData];
          const ids: string[] = [];
          for (const row of rows) {
            const payload = { ...row, created_at: serverTimestamp(), updated_at: serverTimestamp() };
            // If row has an "id" field, use it as the doc id
            if (row.id) {
              await setDoc(doc(db, tableName, row.id), payload, { merge: true });
              ids.push(row.id);
            } else {
              const ref = await addDoc(collection(db, tableName), payload);
              ids.push(ref.id);
            }
          }
          // If .select() was chained, return the inserted docs
          if (_selectFields !== "*" || _isSingle) {
            const docs = await Promise.all(
              ids.map(async (id) => {
                const snap = await getDoc(doc(db, tableName, id));
                return snap.exists() ? { id: snap.id, ...snap.data() } : null;
              })
            );
            const filtered = docs.filter(Boolean);
            return { data: _isSingle ? filtered[0] ?? null : filtered, error: null };
          }
          return { data: null, error: null };
        }

        // ── UPDATE ──────────────────────────────────────────────────────────
        if (_updateData !== null) {
          const q = query(collection(db, tableName), ...constraints);
          const snap = await getDocs(q);
          const batch = writeBatch(db);
          snap.docs.forEach((d) => {
            batch.update(d.ref, { ..._updateData, updated_at: serverTimestamp() });
          });
          await batch.commit();
          if (_isSingle && snap.docs.length > 0) {
            const d = snap.docs[0];
            const updated = await getDoc(d.ref);
            return { data: { id: updated.id, ...updated.data() }, error: null };
          }
          return { data: null, error: null };
        }

        // ── DELETE ──────────────────────────────────────────────────────────
        if (_isDelete) {
          const q = query(collection(db, tableName), ...constraints);
          const snap = await getDocs(q);
          const batch = writeBatch(db);
          snap.docs.forEach((d) => batch.delete(d.ref));
          await batch.commit();
          return { data: null, error: null };
        }

        // ── COUNT ────────────────────────────────────────────────────────────
        if (_isCount) {
          const q = query(collection(db, tableName), ...constraints);
          const snap = await getCountFromServer(q);
          return { count: snap.data().count, data: null, error: null };
        }

        // ── SELECT ───────────────────────────────────────────────────────────
        const q = query(collection(db, tableName), ...constraints);
        const snap = await getDocs(q);
        let results = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

        // Client-side OR filter
        if ((builder as any)._orFilter) {
          const orStr: string = (builder as any)._orFilter;
          // Parse "participant_1.eq.X,participant_2.eq.X" style
          const parts = orStr.split(",").map((p) => {
            const m = p.trim().match(/^(\w+)\.eq\.(.+)$/);
            return m ? { field: m[1], value: m[2] } : null;
          }).filter(Boolean) as { field: string; value: string }[];

          if (parts.length > 0) {
            results = results.filter((r: any) =>
              parts.some((p) => String(r[p.field]) === p.value)
            );
          }
        }

        if (_isSingle) {
          return { data: results[0] ?? null, error: results.length === 0 ? { code: "PGRST116" } : null };
        }
        return { data: results, error: null };
      } catch (err: any) {
        return { data: null, error: err, count: null };
      }
    },
  };

  return builder;
}

// ── Storage shim ─────────────────────────────────────────────────────────────
function makeStorageBucket(bucketName: string) {
  return {
    async upload(path: string, file: File | Blob) {
      try {
        const fullPath = `${bucketName}/${path}`;
        await uploadFile(fullPath, file);
        return { data: { path }, error: null };
      } catch (error: any) {
        return { data: null, error };
      }
    },
    getPublicUrl(path: string) {
      // Firebase Storage public URLs follow a predictable pattern
      const bucket = "smartlearn-8067e.firebasestorage.app";
      const encodedPath = encodeURIComponent(`${bucketName}/${path}`);
      const url = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodedPath}?alt=media`;
      return { data: { publicUrl: url } };
    },
    async createSignedUrl(path: string, _expiresIn: number) {
      try {
        const fullPath = `${bucketName}/${path}`;
        const url = await getDownloadURL(ref(storage, fullPath));
        return { data: { signedUrl: url }, error: null };
      } catch (error: any) {
        return { data: null, error };
      }
    },
    async remove(paths: string[]) {
      try {
        await Promise.all(paths.map((p) => deleteFile(`${bucketName}/${p}`)));
        return { data: paths, error: null };
      } catch (error: any) {
        return { data: null, error };
      }
    },
  };
}

// ── Auth shim ─────────────────────────────────────────────────────────────────
const authShim = {
  async getSession() {
    const user = auth.currentUser;
    if (!user) return { data: { session: null }, error: null };
    const token = await user.getIdToken();
    return { data: { session: { access_token: token, user } }, error: null };
  },
  onAuthStateChange(callback: (event: string, session: any) => void) {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const token = await user.getIdToken();
        callback("SIGNED_IN", { access_token: token, user });
      } else {
        callback("SIGNED_OUT", null);
      }
    });
    return { data: { subscription: { unsubscribe: unsub } } };
  },
  async signUp(opts: { email: string; password: string; options?: { data?: any } }) {
    try {
      const cred = await createUserWithEmailAndPassword(auth, opts.email, opts.password);
      return { data: { user: cred.user }, error: null };
    } catch (error: any) {
      return { data: null, error };
    }
  },
  async signInWithPassword(opts: { email: string; password: string }) {
    try {
      const cred = await signInWithEmailAndPassword(auth, opts.email, opts.password);
      return { data: { user: cred.user }, error: null };
    } catch (error: any) {
      return { data: null, error };
    }
  },
  async signOut() {
    await signOut(auth);
    return { error: null };
  },
  async getUser() {
    const user = auth.currentUser;
    return { data: { user }, error: null };
  },
  async updateUser(opts: { password?: string; email?: string }) {
    const user = auth.currentUser;
    if (!user) return { error: new Error("Not authenticated") };
    try {
      if (opts.password) await updatePassword(user, opts.password);
      if (opts.email) await updateEmail(user, opts.email);
      return { data: { user }, error: null };
    } catch (error: any) {
      return { data: null, error };
    }
  },
  async resetPasswordForEmail(email: string) {
    try {
      await sendPasswordResetEmail(auth, email);
      return { error: null };
    } catch (error: any) {
      return { error };
    }
  },
};

// ── Functions shim ────────────────────────────────────────────────────────────
// Edge functions are now called as plain HTTPS endpoints.
// Set VITE_FUNCTIONS_BASE_URL in your .env to your Cloud Functions base URL.
const FUNCTIONS_BASE =
  import.meta.env.VITE_FUNCTIONS_BASE_URL ||
  "https://us-central1-smartlearn-8067e.cloudfunctions.net";

const functionsShim = {
  async invoke(name: string, opts?: { body?: any }) {
    try {
      const user = auth.currentUser;
      const token = user ? await user.getIdToken() : "";
      const res = await fetch(`${FUNCTIONS_BASE}/${name}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(opts?.body ?? {}),
      });
      const data = await res.json().catch(() => null);
      return { data, error: res.ok ? null : data };
    } catch (error: any) {
      return { data: null, error };
    }
  },
};

// ── Main supabase-compatible export ──────────────────────────────────────────
export const supabase = {
  from: (table: string) => makeQueryBuilder(table),
  storage: {
    from: (bucket: string) => makeStorageBucket(bucket),
  },
  auth: authShim,
  functions: functionsShim,
  channel: (name: string) => makeChannel(name),
  removeChannel: (channel: any) => {
    // channels clean themselves up via the stored unsubscribe
  },
};
