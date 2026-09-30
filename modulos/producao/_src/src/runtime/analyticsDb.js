import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  onSnapshot,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyBIPyLxiDY_BNtxMtHUqXtEv09l-Cibxaw',
  authDomain: 'smart-group-analytics.firebaseapp.com',
  projectId: 'smart-group-analytics',
  storageBucket: 'smart-group-analytics.firebasestorage.app',
  messagingSenderId: '463021033688',
  appId: '1:463021033688:web:466d02021f8831cc4befad',
};

const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
const firebaseAuth = getAuth(firebaseApp);
const firestore = getFirestore(firebaseApp);

const ROOT_COLLECTION = 'producao';
const ITEMS_COLLECTION = 'items';

const functionLoaders = {
  importAproveitamentoExcel: () => import('./functions/importAproveitamentoExcel.js'),
  importCargaMaquinaExcel: () => import('./functions/importCargaMaquinaExcel.js'),
  importCarteiraExcel: () => import('./functions/importCarteiraExcel.js'),
  importCombustivelExcel: () => import('./functions/importCombustivelExcel.js'),
  importControleExcel: () => import('./functions/importControleExcel.js'),
  importControleSetup: () => import('./functions/importControleSetup.js'),
  importDefeitosExcel: () => import('./functions/importDefeitosExcel.js'),
  importDesempenhoExcel: () => import('./functions/importDesempenhoExcel.js'),
  importDisponibilidadeExcel: () => import('./functions/importDisponibilidadeExcel.js'),
  importFaturamentoExcel: () => import('./functions/importFaturamentoExcel.js'),
  importGastosIndustriaisExcel: () => import('./functions/importGastosIndustriaisExcel.js'),
  importInsumosExcel: () => import('./functions/importInsumosExcel.js'),
  importMetrosJumpados: () => import('./functions/importMetrosJumpados.js'),
  importPedidosRevisaoExcel: () => import('./functions/importPedidosRevisaoExcel.js'),
  importPerdaOpExcel: () => import('./functions/importPerdaOpExcel.js'),
  importPerdaOpMensalExcel: () => import('./functions/importPerdaOpMensalExcel.js'),
  importProducaoGeralExcel: () => import('./functions/importProducaoGeralExcel.js'),
  importProdutividadeExcel: () => import('./functions/importProdutividadeExcel.js'),
  importProgramacaoExcel: () => import('./functions/importProgramacaoExcel.js'),
  importRecorrenciaExcel: () => import('./functions/importRecorrenciaExcel.js'),
  importRetrabalhoExcel: () => import('./functions/importRetrabalhoExcel.js'),
  importRevisaoExcel: () => import('./functions/importRevisaoExcel.js'),
  importRotatividadeExcel: () => import('./functions/importRotatividadeExcel.js'),
  importSetupExcel: () => import('./functions/importSetupExcel.js'),
  importTempoOciosoExcel: () => import('./functions/importTempoOciosoExcel.js'),
  readCargaGeral: () => import('./functions/readCargaGeral.js'),
};

function entityCollection(entityName) {
  return collection(firestore, ROOT_COLLECTION, entityName, ITEMS_COLLECTION);
}

function entityDoc(entityName, id) {
  return doc(firestore, ROOT_COLLECTION, entityName, ITEMS_COLLECTION, String(id));
}

function cleanValue(value) {
  if (value === undefined) return undefined;
  if (Array.isArray(value)) {
    return value.map(cleanValue).filter(v => v !== undefined);
  }
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    const out = {};
    for (const [key, item] of Object.entries(value)) {
      const cleaned = cleanValue(item);
      if (cleaned !== undefined) out[key] = cleaned;
    }
    return out;
  }
  return value;
}

function recordFromSnapshot(snapshot) {
  return { id: snapshot.id, ...snapshot.data() };
}

function matches(record, criteria = {}) {
  return Object.entries(criteria || {}).every(([key, expected]) => {
    const actual = record?.[key];
    if (expected && typeof expected === 'object' && !Array.isArray(expected)) {
      if ('$in' in expected) return expected.$in.includes(actual);
      if ('$ne' in expected) return actual !== expected.$ne;
      if ('$gt' in expected && !(actual > expected.$gt)) return false;
      if ('$gte' in expected && !(actual >= expected.$gte)) return false;
      if ('$lt' in expected && !(actual < expected.$lt)) return false;
      if ('$lte' in expected && !(actual <= expected.$lte)) return false;
      return true;
    }
    return actual === expected;
  });
}

function sortRecords(records, sortSpec) {
  if (!sortSpec || typeof sortSpec !== 'string') return records;
  const descending = sortSpec.startsWith('-');
  const field = descending ? sortSpec.slice(1) : sortSpec;
  return [...records].sort((a, b) => {
    const av = a?.[field];
    const bv = b?.[field];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    const cmp = typeof av === 'number' && typeof bv === 'number'
      ? av - bv
      : String(av).localeCompare(String(bv), 'pt-BR', { numeric: true });
    return descending ? -cmp : cmp;
  });
}

async function allRecords(entityName) {
  const snapshot = await getDocs(entityCollection(entityName));
  return snapshot.docs.map(recordFromSnapshot);
}

async function commitInChunks(operations) {
  const chunkSize = 450;
  for (let i = 0; i < operations.length; i += chunkSize) {
    const batch = writeBatch(firestore);
    for (const op of operations.slice(i, i + chunkSize)) op(batch);
    await batch.commit();
  }
}

function makeEntityApi(entityName) {
  return {
    async list(sortSpec, limitCount) {
      let rows = sortRecords(await allRecords(entityName), sortSpec);
      if (Number.isFinite(limitCount)) rows = rows.slice(0, Number(limitCount));
      return rows;
    },

    async get(id) {
      const snapshot = await getDoc(entityDoc(entityName, id));
      return snapshot.exists() ? recordFromSnapshot(snapshot) : null;
    },

    async filter(criteria = {}, sortSpec, limitCount) {
      let rows = (await allRecords(entityName)).filter(row => matches(row, criteria));
      rows = sortRecords(rows, sortSpec);
      if (Number.isFinite(limitCount)) rows = rows.slice(0, Number(limitCount));
      return rows;
    },

    async create(data) {
      if (Array.isArray(data)) return this.bulkCreate(data);
      const now = new Date().toISOString();
      const payload = cleanValue({ ...data, created_date: data?.created_date || now, updated_date: now });
      const ref = await addDoc(entityCollection(entityName), payload);
      return { id: ref.id, ...payload };
    },

    async bulkCreate(records = []) {
      if (!records.length) return [];
      const now = new Date().toISOString();
      const created = records.map((record) => {
        const ref = doc(entityCollection(entityName));
        const payload = cleanValue({ ...record, created_date: record?.created_date || now, updated_date: now });
        return { ref, payload, result: { id: ref.id, ...payload } };
      });
      await commitInChunks(created.map(item => batch => batch.set(item.ref, item.payload)));
      return created.map(item => item.result);
    },

    async update(id, patch = {}) {
      const payload = cleanValue({ ...patch, updated_date: new Date().toISOString() });
      await updateDoc(entityDoc(entityName, id), payload);
      return { id: String(id), ...payload };
    },

    async bulkUpdate(updates = []) {
      if (!updates.length) return [];
      const now = new Date().toISOString();
      const normalized = updates.map(item => {
        const id = item.id;
        const data = item.data ?? item.patch ?? Object.fromEntries(Object.entries(item).filter(([key]) => key !== 'id'));
        return { id, payload: cleanValue({ ...data, updated_date: now }) };
      }).filter(item => item.id);
      await commitInChunks(normalized.map(item => batch => batch.update(entityDoc(entityName, item.id), item.payload)));
      return normalized.map(item => ({ id: String(item.id), ...item.payload }));
    },

    async delete(id) {
      await deleteDoc(entityDoc(entityName, id));
      return { id: String(id), deleted: true };
    },

    async deleteMany(criteria = {}) {
      const rows = (await allRecords(entityName)).filter(row => matches(row, criteria));
      await commitInChunks(rows.map(row => batch => batch.delete(entityDoc(entityName, row.id))));
      return { deleted: rows.length };
    },

    subscribe(callback) {
      return onSnapshot(entityCollection(entityName), snapshot => {
        callback(snapshot.docs.map(recordFromSnapshot));
      });
    },
  };
}

let currentProfile = null;

function waitForFirebaseUser() {
  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, user => {
      unsubscribe();
      resolve(user);
    }, reject);
  });
}

async function getAnalyticsUser() {
  const user = firebaseAuth.currentUser || await waitForFirebaseUser();
  if (!user) {
    const error = new Error('Usuário não autenticado.');
    error.status = 401;
    throw error;
  }

  const profileSnapshot = await getDoc(doc(firestore, 'usuarios', user.uid));
  if (!profileSnapshot.exists()) {
    const error = new Error('Usuário não cadastrado no Analytics.');
    error.status = 403;
    error.code = 'user_not_registered';
    throw error;
  }

  const profile = Object.fromEntries(Object.entries(profileSnapshot.data()).map(([key, value]) => [String(key).trim(), value]));
  const isAdmin = String(profile.perfil || '').trim().toLowerCase() === 'administrador';
  if (profile.ativo !== true) {
    const error = new Error('Usuário inativo.');
    error.status = 403;
    error.code = 'inactive_user';
    throw error;
  }
  if (!isAdmin && profile.modulos?.producao !== true) {
    const error = new Error('Você não possui permissão para acessar Produção.');
    error.status = 403;
    error.code = 'module_forbidden';
    throw error;
  }

  currentProfile = { uid: user.uid, email: user.email, ...profile };
  return currentProfile;
}

const entities = new Proxy({}, {
  get(_target, prop) {
    if (typeof prop !== 'string') return undefined;
    return makeEntityApi(prop);
  },
});

const adapter = {
  auth: {
    async isAuthenticated() {
      try { await getAnalyticsUser(); return true; } catch { return false; }
    },
    async me() { return getAnalyticsUser(); },
    async logout() {
      await signOut(firebaseAuth);
      return true;
    },
    redirectToLogin() {
      const target = new URL('../../login.html', window.location.href).href;
      window.top.location.replace(target);
    },
  },
  entities,
  integrations: {
    Core: {
      async UploadFile({ file }) {
        if (!file) throw new Error('Nenhum arquivo selecionado.');
        return { file_url: URL.createObjectURL(file), file_name: file.name };
      },
      async UploadPublicFile({ file }) {
        if (!file) throw new Error('Nenhum arquivo selecionado.');
        return { file_url: URL.createObjectURL(file), file_name: file.name };
      },
    },
  },
  functions: {
    async invoke(name, payload = {}) {
      const loader = functionLoaders[name];
      if (!loader) throw new Error(`Função de Produção não encontrada: ${name}`);
      await getAnalyticsUser();
      const module = await loader();
      const req = new Request(`https://smart-group.local/producao/${encodeURIComponent(name)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      let response;
      try {
        response = await module.default(req);
        const data = response instanceof Response ? await response.json() : response;
        return { data, status: response instanceof Response ? response.status : 200 };
      } finally {
        if (typeof payload.file_url === 'string' && payload.file_url.startsWith('blob:')) {
          try { URL.revokeObjectURL(payload.file_url); } catch {}
        }
      }
    },
  },
};
adapter.asServiceRole = adapter;

export function installAnalyticsDb() {
  globalThis.__SMART_PRODUCAO_DB__ = adapter;
  globalThis.__SMART_PRODUCAO_DB__ = adapter;
  return adapter;
}

export { adapter, firebaseAuth, firestore };
