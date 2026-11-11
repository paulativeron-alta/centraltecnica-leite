/* Plataforma Leite — núcleo do site.
 * Faz o login, conversa com o Apps Script e oferece às ferramentas
 * (Central e CRM) a mesma interface de dados que elas já usam:
 *   window.claude.use('db' | 'user' | 'downloads' | 'mail')
 */
(function () {
  const CFG = window.ALTA_CONFIG || {};
  const KEY = 'alta-sessao';
  const raiz = (document.currentScript && document.currentScript.src || '').replace(/core\/alta\.js.*$/, '');

  function lerSessao() { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } }
  function gravarSessao(s) { try { s ? localStorage.setItem(KEY, JSON.stringify(s)) : localStorage.removeItem(KEY); } catch (e) {} }

  function configurado() { return !!CFG.api && /^(https:\/\/|http:\/\/(localhost|127\.0\.0\.1)[:/])/.test(CFG.api); }

  async function api(acao, dados) {
    if (!configurado()) { const e = new Error('A plataforma ainda não foi ligada à planilha (config.js).'); e.code = e.codigo = 'config'; throw e; }
    const s = lerSessao();
    let r;
    try {
      r = await fetch(CFG.api, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(Object.assign({ acao: acao, token: s && s.token }, dados || {})),
        redirect: 'follow'
      });
    } catch (x) { const e = new Error('Sem conexão com o servidor. Verifique a internet.'); e.code = e.codigo = 'rede'; throw e; }
    let j;
    try { j = await r.json(); } catch (x) { const e = new Error('Resposta inesperada do servidor.'); e.code = e.codigo = 'resposta'; throw e; }
    if (j && j.erro) {
      const e = new Error(j.erro);
      e.codigo = j.codigo;
      e.code = j.codigo === 'permissao' ? 'invalid_argument' : j.codigo;
      if (j.codigo === 'sessao') { gravarSessao(null); if (!ALTA.ehHub) location.href = raiz + 'index.html?expirou=1'; }
      throw e;
    }
    return j;
  }

  /* ---------------- dados (interface usada pelas ferramentas) ---------------- */
  const cache = {};      // col -> {mod, docs:[{id,data}]}
  const ouvintes = {};   // col -> Set(fn)
  let timer = null;

  function snapCol(docs, lim) {
    const l = (lim ? docs.slice(0, lim) : docs).map(d => ({ id: d.id, exists: true, data: () => clone(d.data) }));
    return { docs: l, size: l.length, empty: !l.length, forEach: f => l.forEach(f) };
  }
  function snapDoc(id, d) { return { id: id, exists: !!d, data: () => (d ? clone(d.data) : undefined) }; }
  function clone(o) { return o == null ? o : JSON.parse(JSON.stringify(o)); }
  function separar(p) { const i = p.lastIndexOf('/'); return [p.slice(0, i), p.slice(i + 1)]; }

  async function lerCol(col) {
    const j = await api('ler', { col: col });
    cache[col] = { mod: j.mod || 0, docs: j.docs || [] };
    return cache[col];
  }
  function avisar(col) {
    const c = cache[col];
    (ouvintes[col] || new Set()).forEach(fn => { try { fn(c); } catch (e) { console.error(e); } });
  }
  function ouvir(col, fn, erro) {
    (ouvintes[col] = ouvintes[col] || new Set()).add(fn);
    (cache[col] ? Promise.resolve(cache[col]) : lerCol(col)).then(fn, erro || (() => {}));
    agendar();
    return () => { ouvintes[col].delete(fn); };
  }
  async function passo() {
    clearTimeout(timer);
    timer = setTimeout(passo, document.hidden ? Math.max(120000, CFG.intervalo || 30000) : (CFG.intervalo || 30000));
    const chaves = {};
    Object.keys(ouvintes).forEach(c => { if (ouvintes[c].size) chaves[c] = cache[c] ? cache[c].mod : 0; });
    if (!Object.keys(chaves).length) return;
    try {
      const j = await api('mudancas', { chaves: chaves });
      Object.keys(j.mud || {}).forEach(c => { cache[c] = j.mud[c]; avisar(c); });
    } catch (e) {}
  }
  function agendar() {
    if (timer) return;
    timer = setTimeout(passo, CFG.intervalo || 30000);
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden && timer) passo(); });
  async function gravar(ops) {
    const j = await api('gravar', { ops: ops });
    const cols = [...new Set(ops.map(o => o.col))];
    // atualiza o que está na tela logo após gravar
    // (como no banco original, o aviso chega logo depois de a gravação terminar)
    cols.filter(c => ouvintes[c] && ouvintes[c].size).forEach(c => lerCol(c).then(() => avisar(c)).catch(() => {}));
    cols.filter(c => !(ouvintes[c] && ouvintes[c].size)).forEach(c => delete cache[c]);
    return j;
  }

  function docRef(col, id) {
    return {
      id: id,
      path: col + '/' + id,
      async get() {
        const j = await api('ler', { doc: col + '/' + id });
        return snapDoc(id, j.doc);
      },
      onSnapshot(fn, erro) {
        return ouvir(col, c => fn(snapDoc(id, c.docs.find(d => d.id === id))), erro);
      },
      set(data) { return gravar([{ op: 'set', col: col, id: id, data: clone(data) }]).then(() => undefined); },
      update(data) { return gravar([{ op: 'update', col: col, id: id, data: clone(data) }]).then(() => undefined); },
      delete() { return gravar([{ op: 'delete', col: col, id: id }]).then(() => undefined); }
    };
  }
  function colRef(col, lim) {
    return {
      path: col,
      limit(n) { return colRef(col, n); },
      orderBy() { return colRef(col, lim); },
      doc(id) { return docRef(col, id || Math.random().toString(36).slice(2, 12) + Date.now().toString(36)); },
      async get() { const c = await lerCol(col); return snapCol(c.docs, lim); },
      onSnapshot(fn, erro) { return ouvir(col, c => fn(snapCol(c.docs, lim)), erro); },
      async add(data) { const j = await gravar([{ op: 'add', col: col, data: clone(data) }]); return docRef(col, j.res[0].id); }
    };
  }
  const db = {
    collection: p => colRef(String(p).replace(/^\/|\/$/g, '')),
    doc: p => { const s = separar(String(p).replace(/^\/|\/$/g, '')); return docRef(s[0], s[1]); },
    batch: ops => gravar(ops)
  };

  /* ---------------- usuário, downloads e e-mail ---------------- */
  function eu() { const s = lerSessao(); return s && s.usuario; }
  const user = {
    id: async () => (eu() || {}).uid,
    email: async () => (eu() || {}).email,
    name: async () => (eu() || {}).nome,
    papel: async () => (eu() || {}).papel,
    canEdit: async () => (eu() || {}).papel === 'gestao',
    can: async () => true
  };
  const downloads = {
    async save(o) {
      const blob = o.data instanceof Blob ? o.data : new Blob([o.data == null ? '' : o.data]);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = o.filename || 'arquivo';
      document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
    }
  };
  const mail = { send: m => api('email', { para: m.para, cc: m.cc, assunto: m.assunto, corpo: m.corpo }) };

  window.claude = {
    use: async nome => ({ db: db, user: user, downloads: downloads, mail: mail })[nome] || null
  };

  /* ---------------- API pública da plataforma ---------------- */
  const ALTA = window.ALTA = {
    raiz: raiz,
    ehHub: false,
    config: CFG,
    configurado: configurado,
    api: api,
    db: db,
    sessao: lerSessao,
    usuario: eu,
    async pedirCodigo(email) { return api('pedirCodigo', { email: email }); },
    async entrar(email, codigo) {
      const j = await api('entrar', { email: email, codigo: codigo });
      gravarSessao({ token: j.token, usuario: j.usuario, em: Date.now() });
      return j.usuario;
    },
    async conferir() {
      const j = await api('eu');
      const s = lerSessao(); if (s) { s.usuario = j.usuario; gravarSessao(s); }
      return j.usuario;
    },
    async sair() { try { await api('sair'); } catch (e) {} gravarSessao(null); location.href = raiz + 'index.html'; },
    // Usado nas páginas das ferramentas: sem sessão, volta para o login.
    guarda() {
      if (!lerSessao()) { location.replace(raiz + 'index.html?voltar=' + encodeURIComponent(location.pathname)); return false; }
      ALTA.conferir().catch(() => {});
      return true;
    }
  };
  window.ALTA_PLATAFORMA = true;
})();
