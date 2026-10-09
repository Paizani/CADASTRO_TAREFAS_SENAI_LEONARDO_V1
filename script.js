"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];

  const STORAGE_KEY = "taskflow_tarefas_v2";
  const SETTINGS_KEY = "taskflow_config_v2";
  const OLD_TASKS_KEY = "minhasTarefas";
  const PRIORIDADES = { normal: 1, alta: 2, urgente: 3 };
  const CATEGORIAS = ["Pessoal", "Trabalho", "Estudos", "Saúde", "Projetos", "Outros"];

  const el = {
    form: $("#form-tarefa"),
    campo: $("#campo-tarefa"),
    prioridade: $("#prioridade"),
    data: $("#data-tarefa"),
    categoria: $("#categoria"),
    pesquisa: $("#campo-pesquisa"),
    ordenacao: $("#select-ordenacao"),
    lista: $("#lista-tarefas"),
    vazio: $("#mensagem-vazia"),
    vazioTexto: $("#mensagem-vazia-texto"),
    contador: $("#contador-tarefas"),
    tituloLista: $("#titulo-lista"),
    resumoLista: $("#resumo-lista"),
    dataAtual: $("#data-atual"),
    tema: $("#botao-tema"),
    backup: $("#botao-backup"),
    importar: $("#botao-importar"),
    arquivo: $("#arquivo-importacao"),
    atualizar: $("#botao-atualizar"),
    limpar: $("#botao-limpar"),
    toast: $("#regiao-notificacoes"),
    dialogo: $("#dialogo-confirmacao"),
    dialogoTitulo: $("#dialogo-titulo"),
    dialogoMensagem: $("#dialogo-mensagem"),
    dialogoConfirmar: $("#dialogo-confirmar"),
    total: $("#total-tarefas"),
    pendentes: $("#total-pendentes"),
    concluidas: $("#total-concluidas"),
    atrasadas: $("#total-atrasadas"),
    progresso: $("#progresso-percentual"),
    barra: $("#barra-progresso"),
    preenchimento: $("#progresso-preenchimento"),
    resumoProgresso: $("#resumo-progresso")
  };

  let tarefas = [];
  let filtroAtual = "todas";
  let edicaoAtiva = null;
  let dialogoResolve = null;
  let salvamentoDisponivel = true;

  const configuracoes = { tema: "claro", ordenacao: "data" };

  const nomesFiltros = {
    todas: "Todas as tarefas",
    pendentes: "Tarefas pendentes",
    concluidas: "Tarefas concluídas",
    favoritas: "Tarefas favoritas",
    fixadas: "Tarefas fixadas",
    atrasadas: "Tarefas atrasadas"
  };

  function hojeISO() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function dataValida(valor) {
    if (typeof valor !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
    const [a, m, d] = valor.split("-").map(Number);
    const data = new Date(a, m - 1, d);
    return data.getFullYear() === a && data.getMonth() === m - 1 && data.getDate() === d;
  }

  function gerarId() {
    return globalThis.crypto?.randomUUID
      ? globalThis.crypto.randomUUID()
      : `t-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  function mostrarNotificacao(mensagem, tipo = "success") {
    const toast = document.createElement("div");
    toast.className = `toast${tipo === "error" ? " error" : ""}`;

    const icone = document.createElement("i");
    icone.className = tipo === "error"
      ? "fa-solid fa-circle-exclamation"
      : "fa-solid fa-circle-check";
    icone.setAttribute("aria-hidden", "true");

    const texto = document.createElement("span");
    texto.textContent = mensagem;

    toast.append(icone, texto);
    el.toast.appendChild(toast);
    window.setTimeout(() => toast.remove(), 3500);
  }

  function confirmar({ titulo = "Confirmar ação", mensagem = "Deseja continuar?", textoBotao = "Confirmar" } = {}) {
    if (!el.dialogo?.showModal) {
      return Promise.resolve(window.confirm(`${titulo}\n\n${mensagem}`));
    }

    if (dialogoResolve) {
      dialogoResolve(false);
      dialogoResolve = null;
    }

    el.dialogoTitulo.textContent = titulo;
    el.dialogoMensagem.textContent = mensagem;
    el.dialogoConfirmar.textContent = textoBotao;
    el.dialogoConfirmar.classList.toggle("danger-text", /excluir|limpar|substituir/i.test(textoBotao));
    el.dialogo.showModal();

    return new Promise(resolve => { dialogoResolve = resolve; });
  }

  function normalizarTarefa(t) {
    if (!t || typeof t !== "object" || Array.isArray(t)) return null;
    if (typeof t.texto !== "string" || !t.texto.trim()) return null;

    return {
      id: String(t.id ?? gerarId()),
      texto: t.texto.trim().slice(0, 160),
      concluida: t.concluida === true,
      favorita: t.favorita === true,
      fixada: t.fixada === true,
      prioridade: Object.hasOwn(PRIORIDADES, t.prioridade) ? t.prioridade : "normal",
      data: dataValida(t.data) ? t.data : "",
      categoria: CATEGORIAS.includes(t.categoria) ? t.categoria : "Pessoal",
      criadaEm: Number.isFinite(t.criadaEm) ? t.criadaEm : Date.now(),
      concluidaEm: Number.isFinite(t.concluidaEm) ? t.concluidaEm : null
    };
  }

  function salvarConfiguracoes() {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(configuracoes));
    } catch (erro) {
      console.error("Não foi possível salvar as configurações:", erro);
    }
  }

  function salvarTarefas() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tarefas));
      salvamentoDisponivel = true;
      return true;
    } catch (erro) {
      salvamentoDisponivel = false;
      console.error("Erro ao salvar tarefas:", erro);
      mostrarNotificacao("Não foi possível salvar. Verifique o armazenamento do navegador.", "error");
      return false;
    }
  }

  function aplicarTema(tema, persistir = true) {
    const escuro = tema === "escuro";
    document.body.classList.toggle("modo-escuro", escuro);
    configuracoes.tema = escuro ? "escuro" : "claro";

    el.tema.innerHTML = escuro
      ? '<i class="fa-solid fa-sun"></i>'
      : '<i class="fa-solid fa-moon"></i>';

    el.tema.title = escuro ? "Ativar tema claro" : "Ativar tema escuro";
    el.tema.setAttribute("aria-label", el.tema.title);

    const meta = $('meta[name="theme-color"]');
    if (meta) meta.content = escuro ? "#191c29" : "#635bff";

    if (persistir) salvarConfiguracoes();
  }

  function carregarDados() {
    try {
      const configSalva = localStorage.getItem(SETTINGS_KEY);
      if (configSalva) {
        const config = JSON.parse(configSalva);
        if (config && typeof config === "object") {
          configuracoes.tema = config.tema === "escuro" ? "escuro" : "claro";
          if (["data", "urgencia", "padrao", "alfabetica"].includes(config.ordenacao)) {
            configuracoes.ordenacao = config.ordenacao;
          }
        }
      }

      el.ordenacao.value = configuracoes.ordenacao;
      aplicarTema(configuracoes.tema, false);

      let dados = localStorage.getItem(STORAGE_KEY);

      if (dados === null) {
        const antigos = localStorage.getItem(OLD_TASKS_KEY);
        if (antigos !== null) {
          try {
            const lista = JSON.parse(antigos);
            dados = JSON.stringify(Array.isArray(lista) ? lista.map(t => ({
              ...t,
              categoria: t.categoria || "Pessoal",
              criadaEm: Number(t.id) || Date.now()
            })) : []);
          } catch {
            dados = "[]";
          }
        }
      }

      if (dados !== null) {
        const parseado = JSON.parse(dados);
        if (!Array.isArray(parseado)) throw new Error("Formato de tarefas inválido");
        tarefas = parseado.map(normalizarTarefa).filter(Boolean);
      }

      salvarTarefas();
    } catch (erro) {
      console.error("Erro ao carregar dados:", erro);
      tarefas = [];
      mostrarNotificacao("Não foi possível ler os dados salvos. Verifique o console.", "error");
    }
  }

  function formatarData(valor) {
    if (!dataValida(valor)) return "";
    const [a, m, d] = valor.split("-");
    return `${d}/${m}/${a}`;
  }

  function estaAtrasada(t) {
    return !t.concluida && Boolean(t.data) && t.data < hojeISO();
  }

  function venceHoje(t) {
    return !t.concluida && t.data === hojeISO();
  }

  function obterTarefasFiltradas() {
    const pesquisa = el.pesquisa.value.trim().toLocaleLowerCase("pt-BR");

    const resultado = tarefas.filter(t => {
      const corresponde =
        t.texto.toLocaleLowerCase("pt-BR").includes(pesquisa) ||
        t.categoria.toLocaleLowerCase("pt-BR").includes(pesquisa);

      if (!corresponde) return false;

      switch (filtroAtual) {
        case "pendentes": return !t.concluida;
        case "concluidas": return t.concluida;
        case "favoritas": return t.favorita;
        case "fixadas": return t.fixada;
        case "atrasadas": return estaAtrasada(t);
        default: return true;
      }
    });

    resultado.sort((a, b) => {
      if (a.fixada !== b.fixada) return Number(b.fixada) - Number(a.fixada);

      switch (configuracoes.ordenacao) {
        case "urgencia": {
          const diferenca = PRIORIDADES[b.prioridade] - PRIORIDADES[a.prioridade];
          if (diferenca) return diferenca;
          break;
        }
        case "data":
          if (a.data && !b.data) return -1;
          if (!a.data && b.data) return 1;
          if (a.data && b.data && a.data !== b.data) return a.data.localeCompare(b.data);
          break;
        case "alfabetica": {
          const diferenca = a.texto.localeCompare(b.texto, "pt-BR");
          if (diferenca) return diferenca;
          break;
        }
        case "padrao":
          return b.criadaEm - a.criadaEm;
      }

      if (a.favorita !== b.favorita) return Number(b.favorita) - Number(a.favorita);
      return b.criadaEm - a.criadaEm;
    });

    return resultado;
  }

  function criarTag(texto, classe = "") {
    const tag = document.createElement("span");
    tag.className = `tag ${classe}`.trim();
    tag.textContent = texto;
    return tag;
  }

  function criarBotaoAcao(icone, titulo, classe, acao) {
    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = `action-button ${classe}`.trim();
    botao.title = titulo;
    botao.setAttribute("aria-label", titulo);

    const i = document.createElement("i");
    i.className = icone;
    i.setAttribute("aria-hidden", "true");
    botao.appendChild(i);
    botao.addEventListener("click", acao);
    return botao;
  }

  function criarElementoTarefa(t) {
    const item = document.createElement("li");
    item.className = "task-item";
    item.dataset.id = t.id;
    item.classList.toggle("is-done", t.concluida);
    item.classList.toggle("is-pinned", t.fixada);
    item.classList.add(`priority-${t.prioridade}`);

    const concluir = document.createElement("button");
    concluir.type = "button";
    concluir.className = "complete-button";
    concluir.title = t.concluida ? "Reabrir tarefa" : "Concluir tarefa";
    concluir.setAttribute("aria-label", concluir.title);

    if (t.concluida) {
      const i = document.createElement("i");
      i.className = "fa-solid fa-check";
      concluir.appendChild(i);
    }
    concluir.addEventListener("click", () => alternarConclusao(t.id));

    const conteudo = document.createElement("div");
    conteudo.className = "task-content";

    const nome = document.createElement("span");
    nome.className = "task-name";
    nome.textContent = t.texto;

    const meta = document.createElement("div");
    meta.className = "task-meta";

    const nomesPrioridade = { normal: "Normal", alta: "Alta", urgente: "Urgente" };
    meta.append(
      criarTag(nomesPrioridade[t.prioridade], `priority-${t.prioridade}`),
      criarTag(t.categoria, "category")
    );

    if (t.data) {
      const atrasada = estaAtrasada(t);
      const hoje = venceHoje(t);
      const texto = atrasada
        ? `Atrasada · ${formatarData(t.data)}`
        : hoje
          ? `Vence hoje · ${formatarData(t.data)}`
          : formatarData(t.data);

      const tag = criarTag(texto, atrasada ? "overdue" : hoje ? "due-today" : "");
      const icone = document.createElement("i");
      icone.className = "fa-regular fa-calendar";
      icone.setAttribute("aria-hidden", "true");
      tag.prepend(icone);
      meta.appendChild(tag);
    }

    if (t.fixada) meta.appendChild(criarTag("Fixada", "category"));
    conteudo.append(nome, meta);

    const acoes = document.createElement("div");
    acoes.className = "task-actions";

    acoes.append(
      criarBotaoAcao(
        t.favorita ? "fa-solid fa-star" : "fa-regular fa-star",
        t.favorita ? "Remover dos favoritos" : "Adicionar aos favoritos",
        t.favorita ? "is-active favorite" : "favorite",
        () => alternarFavorito(t.id)
      ),
      criarBotaoAcao(
        "fa-solid fa-thumbtack",
        t.fixada ? "Desafixar tarefa" : "Fixar tarefa",
        t.fixada ? "is-active pin" : "pin",
        () => alternarFixada(t.id)
      ),
      criarBotaoAcao("fa-solid fa-pen", "Editar tarefa", "edit", () => editarTarefa(t.id)),
      criarBotaoAcao("fa-solid fa-trash", "Excluir tarefa", "delete", () => excluirTarefa(t.id))
    );

    item.append(concluir, conteudo, acoes);
    return item;
  }

  function atualizarEstatisticas() {
    const pendentes = tarefas.filter(t => !t.concluida);
    const concluidas = tarefas.filter(t => t.concluida);
    const atrasadas = pendentes.filter(estaAtrasada);
    const favoritas = tarefas.filter(t => t.favorita);
    const fixadas = tarefas.filter(t => t.fixada);

    el.total.textContent = tarefas.length;
    el.pendentes.textContent = pendentes.length;
    el.concluidas.textContent = concluidas.length;
    el.atrasadas.textContent = atrasadas.length;

    $("#contagem-todas").textContent = tarefas.length;
    $("#contagem-pendentes").textContent = pendentes.length;
    $("#contagem-concluidas").textContent = concluidas.length;
    $("#contagem-favoritas").textContent = favoritas.length;
    $("#contagem-fixadas").textContent = fixadas.length;
    $("#contagem-atrasadas").textContent = atrasadas.length;

    const percentual = tarefas.length ? Math.round(concluidas.length / tarefas.length * 100) : 0;
    el.progresso.textContent = `${percentual}%`;
    el.preenchimento.style.width = `${percentual}%`;
    el.barra.setAttribute("aria-valuenow", percentual);

    el.resumoProgresso.textContent = tarefas.length
      ? `${concluidas.length} de ${tarefas.length} tarefas concluídas. ${atrasadas.length ? `${atrasadas.length} precisam de atenção.` : "Continue assim!"}`
      : "Você ainda não tem tarefas cadastradas.";
  }

  function atualizarFiltros() {
    $$(".filter").forEach(botao => {
      const ativo = botao.dataset.filtro === filtroAtual;
      botao.classList.toggle("active", ativo);
      botao.setAttribute("aria-pressed", String(ativo));
    });

    el.tituloLista.textContent = nomesFiltros[filtroAtual] || nomesFiltros.todas;
  }

  function renderizarTarefas() {
    const resultado = obterTarefasFiltradas();
    const fragmento = document.createDocumentFragment();

    resultado.forEach(t => fragmento.appendChild(criarElementoTarefa(t)));
    el.lista.replaceChildren(fragmento);

    const semTarefas = resultado.length === 0;
    el.vazio.classList.toggle("visible", semTarefas);

    if (semTarefas) {
      el.vazioTexto.textContent = el.pesquisa.value.trim()
        ? "Tente pesquisar por outro termo ou mudar o filtro."
        : tarefas.length
          ? "Não há tarefas neste filtro."
          : "Adicione sua primeira tarefa para começar a organizar seu dia.";
    }

    el.contador.textContent = resultado.length === 1
      ? "1 tarefa exibida"
      : `${resultado.length} tarefas exibidas`;

    el.resumoLista.textContent = tarefas.length
      ? `${tarefas.filter(t => !t.concluida).length} tarefa(s) pendente(s) no total.`
      : "Comece adicionando sua primeira tarefa.";

    atualizarEstatisticas();
    atualizarFiltros();
  }

  function adicionarTarefa(evento) {
    evento.preventDefault();
    const texto = el.campo.value.trim();

    if (!texto) {
      mostrarNotificacao("Digite o nome da tarefa.", "error");
      el.campo.focus();
      return;
    }

    if (el.data.value && !dataValida(el.data.value)) {
      mostrarNotificacao("Selecione uma data válida.", "error");
      el.data.focus();
      return;
    }

    const tarefa = {
      id: gerarId(),
      texto: texto.slice(0, 160),
      concluida: false,
      favorita: false,
      fixada: false,
      prioridade: Object.hasOwn(PRIORIDADES, el.prioridade.value) ? el.prioridade.value : "normal",
      data: el.data.value || "",
      categoria: CATEGORIAS.includes(el.categoria.value) ? el.categoria.value : "Pessoal",
      criadaEm: Date.now(),
      concluidaEm: null
    };

    tarefas.push(tarefa);

    if (!salvarTarefas()) {
      tarefas.pop();
      return;
    }

    el.form.reset();
    el.prioridade.value = "normal";
    el.categoria.value = "Pessoal";
    filtroAtual = "todas";
    renderizarTarefas();
    mostrarNotificacao("Tarefa adicionada com sucesso.");
    el.campo.focus();
  }

  function atualizarTarefa(id, alteracoes) {
    const indice = tarefas.findIndex(t => t.id === id);
    if (indice === -1) return;

    const anterior = tarefas[indice];
    tarefas[indice] = { ...anterior, ...alteracoes };

    if (!salvarTarefas()) {
      tarefas[indice] = anterior;
      renderizarTarefas();
      return;
    }

    renderizarTarefas();
  }

  function alternarConclusao(id) {
    const t = tarefas.find(t => t.id === id);
    if (!t) return;
    const concluida = !t.concluida;

    atualizarTarefa(id, {
      concluida,
      concluidaEm: concluida ? Date.now() : null
    });

    mostrarNotificacao(concluida ? "Tarefa concluída. Muito bem!" : "Tarefa reaberta.");
  }

  function alternarFavorito(id) {
    const t = tarefas.find(t => t.id === id);
    if (!t) return;
    const favorita = !t.favorita;
    atualizarTarefa(id, { favorita });
    mostrarNotificacao(favorita ? "Tarefa adicionada aos favoritos." : "Tarefa removida dos favoritos.");
  }

  function alternarFixada(id) {
    const t = tarefas.find(t => t.id === id);
    if (!t) return;
    const fixada = !t.fixada;
    atualizarTarefa(id, { fixada });
    mostrarNotificacao(fixada ? "Tarefa fixada no topo." : "Tarefa desafixada.");
  }

  function editarTarefa(id) {
    if (edicaoAtiva) {
      mostrarNotificacao("Salve ou cancele a edição atual primeiro.", "error");
      return;
    }

    const tarefa = tarefas.find(t => t.id === id);
    const item = $(`.task-item[data-id="${CSS.escape(id)}"]`);
    if (!tarefa || !item) return;

    edicaoAtiva = id;
    const conteudo = $(".task-content", item);
    const formulario = document.createElement("form");
    formulario.className = "task-content edit-form";

    const campo = document.createElement("input");
    campo.type = "text";
    campo.maxLength = 160;
    campo.required = true;
    campo.value = tarefa.texto;
    campo.setAttribute("aria-label", "Editar nome da tarefa");

    const opcoes = document.createElement("div");
    opcoes.className = "edit-options";

    const prioridade = document.createElement("select");
    prioridade.setAttribute("aria-label", "Prioridade");
    [["normal", "Normal"], ["alta", "Alta"], ["urgente", "Urgente"]].forEach(([v, n]) => {
      const o = document.createElement("option");
      o.value = v;
      o.textContent = n;
      prioridade.appendChild(o);
    });
    prioridade.value = tarefa.prioridade;

    const data = document.createElement("input");
    data.type = "date";
    data.value = tarefa.data;
    data.setAttribute("aria-label", "Data limite");

    const categoria = document.createElement("select");
    categoria.setAttribute("aria-label", "Categoria");
    CATEGORIAS.forEach(c => {
      const o = document.createElement("option");
      o.value = c;
      o.textContent = c;
      categoria.appendChild(o);
    });
    categoria.value = tarefa.categoria;
    opcoes.append(prioridade, data, categoria);

    const botoes = document.createElement("div");
    botoes.className = "edit-buttons";

    const salvar = document.createElement("button");
    salvar.type = "submit";
    salvar.className = "primary-button";
    salvar.textContent = "Salvar";

    const cancelar = document.createElement("button");
    cancelar.type = "button";
    cancelar.className = "secondary-button";
    cancelar.textContent = "Cancelar";

    botoes.append(salvar, cancelar);
    formulario.append(campo, opcoes, botoes);
    conteudo.replaceWith(formulario);

    const acoes = $(".task-actions", item);
    if (acoes) acoes.hidden = true;

    campo.focus();
    campo.select();

    let finalizado = false;

    function encerrar() {
      if (finalizado) return;
      finalizado = true;
      edicaoAtiva = null;
      renderizarTarefas();
    }

    cancelar.addEventListener("click", encerrar);

    formulario.addEventListener("submit", evento => {
      evento.preventDefault();
      const novoTexto = campo.value.trim();

      if (!novoTexto) {
        campo.focus();
        return;
      }

      if (data.value && !dataValida(data.value)) {
        mostrarNotificacao("Selecione uma data válida.", "error");
        data.focus();
        return;
      }

      const indice = tarefas.findIndex(t => t.id === id);
      if (indice === -1) {
        encerrar();
        return;
      }

      const anterior = tarefas[indice];
      tarefas[indice] = {
        ...anterior,
        texto: novoTexto.slice(0, 160),
        prioridade: prioridade.value,
        data: data.value || "",
        categoria: categoria.value
      };

      if (!salvarTarefas()) tarefas[indice] = anterior;
      else mostrarNotificacao("Tarefa atualizada.");

      finalizado = true;
      edicaoAtiva = null;
      renderizarTarefas();
    });

    campo.addEventListener("keydown", evento => {
      if (evento.key === "Escape") {
        evento.preventDefault();
        encerrar();
      }
    });
  }

  async function excluirTarefa(id) {
    const tarefa = tarefas.find(t => t.id === id);
    if (!tarefa) return;

    const aceitou = await confirmar({
      titulo: "Excluir tarefa?",
      mensagem: `A tarefa "${tarefa.texto}" será removida permanentemente.`,
      textoBotao: "Excluir"
    });
    if (!aceitou) return;

    const anteriores = tarefas;
    tarefas = tarefas.filter(t => t.id !== id);

    if (!salvarTarefas()) {
      tarefas = anteriores;
      return;
    }

    renderizarTarefas();
    mostrarNotificacao("Tarefa excluída.");
  }

  async function limparConcluidas() {
    const concluidas = tarefas.filter(t => t.concluida);
    if (!concluidas.length) {
      mostrarNotificacao("Não existem tarefas concluídas para limpar.", "error");
      return;
    }

    const aceitou = await confirmar({
      titulo: "Limpar tarefas concluídas?",
      mensagem: `${concluidas.length} tarefa(s) serão removidas permanentemente.`,
      textoBotao: "Limpar"
    });
    if (!aceitou) return;

    const anteriores = tarefas;
    tarefas = tarefas.filter(t => !t.concluida);

    if (!salvarTarefas()) {
      tarefas = anteriores;
      return;
    }

    renderizarTarefas();
    mostrarNotificacao("Tarefas concluídas removidas.");
  }

  function alterarFiltro(filtro) {
    if (!Object.hasOwn(nomesFiltros, filtro)) return;

    if (edicaoAtiva) {
      mostrarNotificacao("Finalize a edição antes de trocar o filtro.", "error");
      return;
    }

    filtroAtual = filtro;
    renderizarTarefas();
  }

  function alterarOrdenacao() {
    const valor = el.ordenacao.value;
    if (!["data", "urgencia", "padrao", "alfabetica"].includes(valor)) return;
    configuracoes.ordenacao = valor;
    salvarConfiguracoes();
    renderizarTarefas();
  }

  function exportarBackup() {
    const dados = {
      aplicativo: "TaskFlow",
      versao: 2,
      exportadoEm: new Date().toISOString(),
      tarefas
    };

    const arquivo = new Blob([JSON.stringify(dados, null, 2)], {
      type: "application/json;charset=utf-8"
    });

    const url = URL.createObjectURL(arquivo);
    const link = document.createElement("a");
    link.href = url;
    link.download = `taskflow-backup-${hojeISO()}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    mostrarNotificacao("Backup exportado.");
  }

  async function importarBackup(evento) {
    const arquivo = evento.target.files?.[0];
    evento.target.value = "";
    if (!arquivo) return;

    if (arquivo.size > 5 * 1024 * 1024) {
      mostrarNotificacao("O arquivo ultrapassa o limite de 5 MB.", "error");
      return;
    }

    try {
      const texto = await arquivo.text();
      const dados = JSON.parse(texto);
      const lista = Array.isArray(dados) ? dados : Array.isArray(dados?.tarefas) ? dados.tarefas : null;

      if (!lista) throw new Error("Formato de backup inválido.");
      if (lista.length > 10000) throw new Error("O backup contém tarefas demais.");

      const importadas = lista.map(normalizarTarefa);
      if (importadas.some(t => !t)) throw new Error("Há tarefas inválidas no arquivo.");

      const aceitou = await confirmar({
        titulo: "Importar backup?",
        mensagem: `O backup contém ${importadas.length} tarefa(s). A importação substituirá as tarefas atuais.`,
        textoBotao: "Substituir"
      });
      if (!aceitou) return;

      const anteriores = tarefas;
      tarefas = importadas;

      if (!salvarTarefas()) {
        tarefas = anteriores;
        return;
      }

      filtroAtual = "todas";
      renderizarTarefas();
      mostrarNotificacao("Backup importado com sucesso.");
    } catch (erro) {
      console.error("Erro ao importar backup:", erro);
      mostrarNotificacao(erro.message || "Não foi possível importar o arquivo.", "error");
    }
  }

  function atualizarDataAtual() {
    const data = new Date();
    el.dataAtual.textContent = data.toLocaleDateString("pt-BR", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
    $("#ano-atual").textContent = data.getFullYear();
  }

  function configurarEventos() {
    el.form.addEventListener("submit", adicionarTarefa);
    el.tema.addEventListener("click", () => {
      aplicarTema(configuracoes.tema === "escuro" ? "claro" : "escuro");
    });

    el.backup.addEventListener("click", exportarBackup);
    el.importar.addEventListener("click", () => el.arquivo.click());
    el.arquivo.addEventListener("change", importarBackup);
    el.pesquisa.addEventListener("input", renderizarTarefas);
    el.ordenacao.addEventListener("change", alterarOrdenacao);
    el.limpar.addEventListener("click", limparConcluidas);

    el.atualizar.addEventListener("click", () => {
      el.atualizar.disabled = true;
      const icone = $("i", el.atualizar);
      if (icone) icone.classList.add("fa-spin");
      renderizarTarefas();

      window.setTimeout(() => {
        el.atualizar.disabled = false;
        if (icone) icone.classList.remove("fa-spin");
      }, 450);
    });

    $$(".filter").forEach(botao => {
      botao.addEventListener("click", () => alterarFiltro(botao.dataset.filtro));
    });

    document.addEventListener("keydown", evento => {
      const alvo = evento.target;
      const digitando = alvo instanceof HTMLInputElement ||
        alvo instanceof HTMLTextAreaElement ||
        alvo instanceof HTMLSelectElement ||
        alvo?.isContentEditable;

      if (evento.key === "/" && !digitando) {
        evento.preventDefault();
        el.pesquisa.focus();
      }

      if (evento.key === "Escape" && alvo === el.pesquisa) {
        el.pesquisa.value = "";
        renderizarTarefas();
        el.pesquisa.blur();
      }
    });

    el.dialogo.addEventListener("close", () => {
      if (!dialogoResolve) return;
      const resolver = dialogoResolve;
      dialogoResolve = null;
      resolver(el.dialogo.returnValue === "confirmar");
    });
  }

  carregarDados();
  configurarEventos();
  atualizarDataAtual();
  renderizarTarefas();
});
