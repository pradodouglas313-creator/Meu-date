/**
 * storage.js
 * Abstração de persistência do MeuDate.
 *
 * Hoje tudo é salvo no localStorage do navegador (offline-first).
 * Para migrar para Firebase no futuro, troque apenas as implementações
 * dos métodos abaixo por chamadas ao Firestore — o resto do app (router.js,
 * app.js) só conhece esta interface (getInvite, saveInvite, addResponse, etc)
 * e não precisa mudar.
 */

const MeuDateStorage = (() => {
  const KEYS = {
    invites: 'meudate:invites',
    responses: 'meudate:responses',
    mine: 'meudate:myInvites',
  };

  function readJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (err) {
      console.error('MeuDate: falha ao ler', key, err);
      return fallback;
    }
  }

  function writeJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      console.error('MeuDate: falha ao salvar', key, err);
      return false;
    }
  }

  function genId() {
    return Math.random().toString(36).slice(2, 8).toUpperCase();
  }

  return {
    // ---- Convites ----
    getInvite(id) {
      const invites = readJSON(KEYS.invites, {});
      return invites[id] || null;
    },

    saveInvite(invite) {
      const invites = readJSON(KEYS.invites, {});
      if (!invite.id) invite.id = genId();
      invite.createdAt = invite.createdAt || new Date().toISOString();
      invites[invite.id] = invite;
      writeJSON(KEYS.invites, invites);
      this.markMine(invite.id);
      return invite;
    },

    deleteInvite(id) {
      const invites = readJSON(KEYS.invites, {});
      const responses = readJSON(KEYS.responses, {});
      delete invites[id];
      delete responses[id];
      writeJSON(KEYS.invites, invites);
      writeJSON(KEYS.responses, responses);
      const mine = readJSON(KEYS.mine, []).filter((x) => x !== id);
      writeJSON(KEYS.mine, mine);
    },

    // ---- Respostas ----
    getResponses(id) {
      const responses = readJSON(KEYS.responses, {});
      return responses[id] || [];
    },

    addResponse(id, response) {
      const responses = readJSON(KEYS.responses, {});
      if (!responses[id]) responses[id] = [];
      response.id = genId();
      response.respondedAt = new Date().toISOString();
      responses[id].push(response);
      writeJSON(KEYS.responses, responses);
      return response;
    },

    // ---- Propriedade local (quais convites este navegador criou/importou) ----
    listMine() {
      return readJSON(KEYS.mine, []);
    },

    markMine(id) {
      const mine = readJSON(KEYS.mine, []);
      if (!mine.includes(id)) {
        mine.push(id);
        writeJSON(KEYS.mine, mine);
      }
    },

    isMine(id) {
      return readJSON(KEYS.mine, []).includes(id);
    },

    // ---- Exportar / Importar ----
    exportInvite(id) {
      const invite = this.getInvite(id);
      if (!invite) return null;
      return {
        meudateExport: true,
        version: 1,
        invite,
        responses: this.getResponses(id),
      };
    },

    importPayload(payload) {
      if (!payload || !payload.invite || !payload.invite.id) {
        throw new Error('Arquivo inválido: não parece ser um convite do MeuDate.');
      }
      const invites = readJSON(KEYS.invites, {});
      const responses = readJSON(KEYS.responses, {});
      const id = payload.invite.id;
      invites[id] = payload.invite;
      responses[id] = payload.responses || [];
      writeJSON(KEYS.invites, invites);
      writeJSON(KEYS.responses, responses);
      this.markMine(id);
      return id;
    },
  };
})();
