/**
 * app.js
 * Roteamento por hash (#/, #/d/:id, #/painel/:id) + renderização das telas.
 * Tudo client-side, sem backend — ver storage.js para a camada de dados.
 */

(function () {
  const root = document.getElementById('app');

  const WEEKDAY_LABEL = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  }

  function formatOption(opt) {
    if (!opt.date) return escapeHTML(opt.label || '');
    const d = new Date(opt.date + (opt.time ? 'T' + opt.time : 'T00:00'));
    const weekday = WEEKDAY_LABEL[d.getDay()];
    const datePart = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    const timePart = opt.time ? `, ${opt.time}` : '';
    return `${weekday} ${datePart}${timePart}`;
  }

  function shareLink(id) {
    const base = location.origin + location.pathname;
    return `${base}#/d/${id}`;
  }

  function seal(name) {
    const letter = (name || '?').trim().charAt(0).toUpperCase() || '?';
    return `<span class="seal" aria-hidden="true">${letter}</span>`;
  }

  // ---------- Cartão de convite (elemento assinatura, reutilizado em todo lugar) ----------
  function inviteCardHTML(invite, opts) {
    opts = opts || {};
    const img = invite.image
      ? `<img class="invite-card__img" src="${invite.image}" alt="">`
      : '';
    return `
      <article class="invite-card">
        ${seal(invite.author)}
        ${img}
        <p class="invite-card__eyebrow">convite de ${escapeHTML(invite.author || 'alguém')}</p>
        <h2 class="invite-card__title">${escapeHTML(invite.title)}</h2>
        ${opts.body || ''}
      </article>`;
  }

  // ---------- Tela: início / criar ----------
  function renderHome() {
    const mine = MeuDateStorage.listMine()
      .map((id) => MeuDateStorage.getInvite(id))
      .filter(Boolean)
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

    const mineHTML = mine.length
      ? mine
          .map(
            (inv) => `
        <li class="mine-item">
          <a href="#/painel/${inv.id}">
            <strong>${escapeHTML(inv.title)}</strong>
            <span class="mono">${MeuDateStorage.getResponses(inv.id).length} resposta(s)</span>
          </a>
        </li>`
          )
          .join('')
      : `<li class="mine-item mine-item--empty">Nenhum convite ainda. Crie o primeiro abaixo.</li>`;

    root.innerHTML = `
      <section class="hero">
        <p class="eyebrow">sem servidor, sem cadastro</p>
        <h1>Combine um encontro em um link.</h1>
        <p class="lede">Crie um convite, escolha horários e mande o link. Tudo fica salvo neste navegador — exporte se quiser levar para outro aparelho.</p>
      </section>

      <section class="grid">
        <form id="create-form" class="panel-box">
          <h2 class="section-title">Novo convite</h2>

          <label class="field">
            <span>Seu nome</span>
            <input type="text" name="author" required maxlength="40" placeholder="Ex: Ana">
          </label>

          <label class="field">
            <span>Título do encontro</span>
            <input type="text" name="title" required maxlength="60" placeholder="Ex: Café na quinta?">
          </label>

          <label class="field">
            <span>Imagem (opcional)</span>
            <input type="file" name="image" accept="image/*">
            <small id="image-hint" class="hint"></small>
          </label>

          <fieldset class="field">
            <legend>Horários sugeridos</legend>
            <div id="options-list"></div>
            <button type="button" id="add-option" class="btn btn--ghost btn--small">+ adicionar horário</button>
          </fieldset>

          <button type="submit" class="btn btn--primary">Criar convite</button>
          <p id="create-error" class="error" role="alert"></p>
        </form>

        <div class="panel-box preview-box">
          <h2 class="section-title">Pré-visualização</h2>
          <div id="live-preview"></div>
        </div>
      </section>

      <section class="panel-box">
        <div class="row-between">
          <h2 class="section-title">Seus convites neste navegador</h2>
          <label class="btn btn--ghost btn--small file-btn">
            Importar .json
            <input type="file" id="import-input" accept="application/json" hidden>
          </label>
        </div>
        <ul class="mine-list">${mineHTML}</ul>
      </section>
    `;

    wireCreateForm();
    wireImport('#import-input');
  }

  function optionRowHTML(idx) {
    return `
      <div class="option-row" data-idx="${idx}">
        <input type="date" name="opt-date" required>
        <input type="time" name="opt-time">
        <button type="button" class="btn btn--icon remove-option" aria-label="Remover horário">×</button>
      </div>`;
  }

  function wireCreateForm() {
    const form = document.getElementById('create-form');
    const optionsList = document.getElementById('options-list');
    const preview = document.getElementById('live-preview');
    const imageHint = document.getElementById('image-hint');
    let optIdx = 0;
    let compressedImage = null;

    function addOption() {
      optionsList.insertAdjacentHTML('beforeend', optionRowHTML(optIdx++));
      updatePreview();
    }
    addOption();

    function currentOptions() {
      return [...optionsList.querySelectorAll('.option-row')]
        .map((row) => ({
          date: row.querySelector('[name="opt-date"]').value,
          time: row.querySelector('[name="opt-time"]').value,
        }))
        .filter((o) => o.date);
    }

    function updatePreview() {
      const draft = {
        author: form.author.value,
        title: form.title.value || 'Título do encontro',
        image: compressedImage,
      };
      const opts = currentOptions();
      const optsHTML = opts.length
        ? `<ul class="option-preview">${opts
            .map((o) => `<li class="mono">${formatOption(o)}</li>`)
            .join('')}</ul>`
        : `<p class="hint">Adicione ao menos um horário.</p>`;
      preview.innerHTML = inviteCardHTML(draft, { body: optsHTML });
    }

    form.addEventListener('input', updatePreview);

    optionsList.addEventListener('click', (e) => {
      if (e.target.classList.contains('remove-option')) {
        e.target.closest('.option-row').remove();
        updatePreview();
      }
    });

    document.getElementById('add-option').addEventListener('click', addOption);

    form.image.addEventListener('change', async () => {
      const file = form.image.files[0];
      if (!file) {
        compressedImage = null;
        imageHint.textContent = '';
        updatePreview();
        return;
      }
      imageHint.textContent = 'Comprimindo imagem…';
      try {
        const { dataURL, tooLarge } = await MeuDateImage.compress(file);
        compressedImage = dataURL;
        imageHint.textContent = tooLarge
          ? 'Imagem grande — pode falhar em navegadores com pouco espaço livre.'
          : 'Imagem pronta.';
      } catch (err) {
        compressedImage = null;
        imageHint.textContent = err.message;
      }
      updatePreview();
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const errorEl = document.getElementById('create-error');
      errorEl.textContent = '';
      const options = currentOptions();
      if (!options.length) {
        errorEl.textContent = 'Adicione pelo menos um horário sugerido.';
        return;
      }
      const invite = {
        author: form.author.value.trim(),
        title: form.title.value.trim(),
        image: compressedImage,
        options: options.map((o, i) => ({ id: 'o' + i, ...o })),
      };
      const saved = MeuDateStorage.saveInvite(invite);
      location.hash = `#/painel/${saved.id}`;
    });
  }

  function wireImport(selector) {
    const input = document.querySelector(selector);
    if (!input) return;
    input.addEventListener('change', async () => {
      const file = input.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const payload = JSON.parse(text);
        const id = MeuDateStorage.importPayload(payload);
        location.hash = `#/painel/${id}`;
      } catch (err) {
        alert('Não foi possível importar: ' + err.message);
      }
    });
  }

  // ---------- Tela: ver / responder convite ----------
  function renderInviteView(id) {
    const invite = MeuDateStorage.getInvite(id);
    if (!invite) {
      renderNotFound(id);
      return;
    }

    const optionsHTML = invite.options
      .map(
        (o, i) => `
        <label class="option-choice">
          <input type="radio" name="chosen" value="${o.id}" ${i === 0 ? 'required' : ''}>
          <span class="mono">${formatOption(o)}</span>
        </label>`
      )
      .join('');

    const isMine = MeuDateStorage.isMine(id);
    const responses = MeuDateStorage.getResponses(id);

    root.innerHTML = `
      ${inviteCardHTML(invite, {
        body: `
          <form id="respond-form" class="respond-form">
            <div class="option-choices">${optionsHTML}</div>
            <label class="field">
              <span>Seu nome</span>
              <input type="text" name="name" required maxlength="40">
            </label>
            <label class="field">
              <span>Mensagem (opcional)</span>
              <textarea name="message" maxlength="200" rows="2"></textarea>
            </label>
            <button type="submit" class="btn btn--primary">Confirmar presença</button>
          </form>
          <p id="respond-done" class="confirm" hidden>Resposta enviada! 🎉</p>
        `,
      })}
      <p class="foot-links">
        ${
          isMine
            ? `<a href="#/painel/${id}">Ver painel do criador (${responses.length} resposta(s))</a>`
            : `<a href="#/">Criar meu próprio convite</a>`
        }
      </p>
    `;

    document.getElementById('respond-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const form = e.target;
      const chosen = form.chosen.value;
      MeuDateStorage.addResponse(id, {
        name: form.name.value.trim(),
        chosenOptionId: chosen,
        message: form.message.value.trim(),
      });
      form.hidden = true;
      document.getElementById('respond-done').hidden = false;
    });
  }

  // ---------- Tela: painel do criador ----------
  function renderPanel(id) {
    const invite = MeuDateStorage.getInvite(id);
    if (!invite) {
      renderNotFound(id);
      return;
    }
    const responses = MeuDateStorage.getResponses(id);
    const link = shareLink(id);

    const countsByOption = {};
    invite.options.forEach((o) => (countsByOption[o.id] = 0));
    responses.forEach((r) => {
      if (countsByOption[r.chosenOptionId] != null) countsByOption[r.chosenOptionId]++;
    });

    const optionsSummary = invite.options
      .map(
        (o) => `
        <li class="mono option-summary">
          ${formatOption(o)}
          <span class="badge">${countsByOption[o.id]}</span>
        </li>`
      )
      .join('');

    const responsesHTML = responses.length
      ? `<ul class="response-list">${responses
          .map((r) => {
            const opt = invite.options.find((o) => o.id === r.chosenOptionId);
            return `<li>
              <strong>${escapeHTML(r.name)}</strong>
              <span class="mono">${opt ? formatOption(opt) : '—'}</span>
              ${r.message ? `<p class="msg">${escapeHTML(r.message)}</p>` : ''}
            </li>`;
          })
          .join('')}</ul>`
      : `<p class="hint">Ainda ninguém respondeu.</p>`;

    root.innerHTML = `
      ${inviteCardHTML(invite, {
        body: `<ul class="option-summary-list">${optionsSummary}</ul>`,
      })}

      <section class="panel-box">
        <h2 class="section-title">Compartilhar</h2>
        <div class="share-row">
          <input type="text" readonly value="${escapeHTML(link)}" id="share-link">
          <button class="btn btn--ghost btn--small" id="copy-link">Copiar link</button>
        </div>
      </section>

      <section class="panel-box">
        <h2 class="section-title">Respostas (${responses.length})</h2>
        ${responsesHTML}
      </section>

      <section class="panel-box row-between">
        <button class="btn btn--ghost btn--small" id="export-btn">Exportar .json</button>
        <button class="btn btn--danger btn--small" id="delete-btn">Apagar convite</button>
      </section>

      <p class="foot-links"><a href="#/">← Voltar ao início</a></p>
    `;

    document.getElementById('copy-link').addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(link);
        flashButton('copy-link', 'Copiado!');
      } catch {
        document.getElementById('share-link').select();
      }
    });

    document.getElementById('export-btn').addEventListener('click', () => {
      const payload = MeuDateStorage.exportInvite(id);
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `meudate-${id}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    });

    document.getElementById('delete-btn').addEventListener('click', () => {
      if (confirm('Apagar este convite e todas as respostas? Essa ação não pode ser desfeita.')) {
        MeuDateStorage.deleteInvite(id);
        location.hash = '#/';
      }
    });
  }

  function flashButton(id, text) {
    const btn = document.getElementById(id);
    const original = btn.textContent;
    btn.textContent = text;
    setTimeout(() => (btn.textContent = original), 1500);
  }

  // ---------- Tela: não encontrado ----------
  function renderNotFound(id) {
    root.innerHTML = `
      <section class="panel-box not-found">
        <h2 class="section-title">Convite não encontrado neste navegador</h2>
        <p class="hint">
          Convite <span class="mono">#${escapeHTML(id || '')}</span> não está salvo aqui.
          Se alguém te mandou um arquivo <span class="mono">.json</span>, importe abaixo.
        </p>
        <label class="btn btn--ghost file-btn">
          Importar .json
          <input type="file" id="import-input-nf" accept="application/json" hidden>
        </label>
        <p class="foot-links"><a href="#/">← Criar um convite novo</a></p>
      </section>
    `;
    wireImport('#import-input-nf');
  }

  // ---------- Router ----------
  function route() {
    const hash = location.hash.replace(/^#/, '') || '/';
    const parts = hash.split('/').filter(Boolean);

    if (parts.length === 0) return renderHome();
    if (parts[0] === 'd' && parts[1]) return renderInviteView(parts[1]);
    if (parts[0] === 'painel' && parts[1]) return renderPanel(parts[1]);
    return renderNotFound();
  }

  window.addEventListener('hashchange', route);
  window.addEventListener('DOMContentLoaded', route);
})();
