// Seletores de elementos do DOM
const campoTarefa = document.getElementById("campo-tarefa");
const botaoAdicionar = document.getElementById("botao-adicionar");

const campoPesquisa = document.getElementById("campo-pesquisa");

const prioridade = document.getElementById("prioridade");
const dataTarefa = document.getElementById("data-tarefa");
const selectOrdenacao = document.getElementById("select-ordenacao"); // Seletor de ordenação

const botaoTema = document.getElementById("botao-tema");
const botaoAtualizar = document.getElementById("botao-atualizar");
const botaoLimpar = document.getElementById("botao-limpar");

const listaTarefas = document.getElementById("lista-tarefas");
const mensagemVazia = document.getElementById("mensagem-vazia");

const contadorTarefas = document.getElementById("contador-tarefas");

const totalTarefas = document.getElementById("total-tarefas");
const totalPendentes = document.getElementById("total-pendentes");
const totalConcluidas = document.getElementById("total-concluidas");
const totalFavoritas = document.getElementById("total-favoritas");

const filtros = document.querySelectorAll(".filtro");

// Estado da aplicação
let tarefas = [];
let filtroAtual = "todas";
let ordenacaoAtual = "data"; // Opções: "data", "urgencia", "padrao"

// Função para adicionar uma nova tarefa
function adicionarTarefa() {
    const texto = campoTarefa.value.trim();

    if (!texto) {
        campoTarefa.focus();
        return;
    }

    const novaTarefa = {
        id: Date.now(),
        texto: texto,
        concluida: false,
        favorita: false,
        fixada: false,
        prioridade: prioridade.value,
        data: dataTarefa.value || ""
    };

    tarefas.push(novaTarefa);

    campoTarefa.value = "";
    prioridade.value = "normal";
    dataTarefa.value = "";

    salvarTarefas();
    renderizarTarefas();
    campoTarefa.focus();
}

// Função principal de renderização e ordenação
function renderizarTarefas() {
    listaTarefas.innerHTML = "";

    let tarefasFiltradas = [...tarefas];

    // 1. Aplicar Busca por texto
    const pesquisa = campoPesquisa.value.trim().toLowerCase();

    if (pesquisa) {
        tarefasFiltradas = tarefasFiltradas.filter(tarefa =>
            tarefa.texto.toLowerCase().includes(pesquisa)
        );
    }

    // 2. Aplicar Filtros de Categoria
    if (filtroAtual === "pendentes") {
        tarefasFiltradas = tarefasFiltradas.filter(tarefa => !tarefa.concluida);
    }

    if (filtroAtual === "concluidas") {
        tarefasFiltradas = tarefasFiltradas.filter(tarefa => tarefa.concluida);
    }

    if (filtroAtual === "favoritas") {
        tarefasFiltradas = tarefasFiltradas.filter(tarefa => tarefa.favorita);
    }

    if (filtroAtual === "fixadas") {
        tarefasFiltradas = tarefasFiltradas.filter(tarefa => tarefa.fixada);
    }

    // 3. Aplicar Ordenação Dinâmica
    const pesoPrioridade = {
        urgente: 3,
        alta: 2,
        normal: 1
    };

    tarefasFiltradas.sort((a, b) => {
        // Tarefas fixadas possuem prioridade absoluta de exibição no topo
        if (a.fixada !== b.fixada) {
            return b.fixada - a.fixada;
        }

        // Ordenação por Urgência / Prioridade
        if (ordenacaoAtual === "urgencia") {
            const pesoA = pesoPrioridade[a.prioridade] || 0;
            const pesoB = pesoPrioridade[b.prioridade] || 0;

            if (pesoA !== pesoB) {
                return pesoB - pesoA;
            }
        }

        // Ordenação por Data de Vencimento
        if (ordenacaoAtual === "data") {
            if (a.data && !b.data) return -1;
            if (!a.data && b.data) return 1;
            if (a.data && b.data && a.data !== b.data) {
                return a.data.localeCompare(b.data);
            }
        }

        // Critério secundário / Ordenação Padrão: Favoritas e mais recentes
        if (a.favorita !== b.favorita) {
            return b.favorita - a.favorita;
        }

        return b.id - a.id;
    });

    // 4. Montar elementos no DOM
    tarefasFiltradas.forEach(criarElementoTarefa);

    atualizarEstatisticas();
    atualizarMensagem(tarefasFiltradas.length);
    atualizarContador(tarefasFiltradas.length);
}

// Criar estrutura de cada item <li> da lista
function criarElementoTarefa(tarefa) {
    const item = document.createElement("li");
    item.classList.add("item-tarefa");

    if (tarefa.concluida) item.classList.add("concluida");
    if (tarefa.fixada) item.classList.add("fixada");
    if (tarefa.favorita) item.classList.add("favorita");

    item.classList.add(`prioridade-${tarefa.prioridade}`);

    const area = document.createElement("div");
    area.className = "area-tarefa";

    const botaoConcluir = document.createElement("button");
    botaoConcluir.className = "botao-concluir";
    botaoConcluir.type = "button";
    botaoConcluir.title = tarefa.concluida ? "Marcar como pendente" : "Concluir tarefa";
    botaoConcluir.innerHTML = tarefa.concluida ? '<i class="fa-solid fa-check"></i>' : "";
    botaoConcluir.addEventListener("click", () => alternarConclusao(tarefa.id));

    const informacoes = document.createElement("div");
    informacoes.className = "informacoes-tarefa";

    const texto = document.createElement("span");
    texto.className = "texto-tarefa";
    texto.textContent = tarefa.texto;

    const detalhes = document.createElement("div");
    detalhes.className = "detalhes-tarefa";

    const prioridadeTexto = document.createElement("span");
    prioridadeTexto.className = "badge-prioridade";
    prioridadeTexto.textContent = textoPrioridade(tarefa.prioridade);

    detalhes.appendChild(prioridadeTexto);

    if (tarefa.data) {
        const data = document.createElement("span");
        data.className = "data-tarefa";
        data.innerHTML = `<i class="fa-regular fa-calendar"></i> ${formatarData(tarefa.data)}`;
        detalhes.appendChild(data);
    }

    informacoes.appendChild(texto);
    informacoes.appendChild(detalhes);

    area.appendChild(botaoConcluir);
    area.appendChild(informacoes);

    const acoes = document.createElement("div");
    acoes.className = "acoes-tarefa";

    const favorito = criarBotaoAcao(
        tarefa.favorita ? "fa-solid fa-star" : "fa-regular fa-star",
        tarefa.favorita ? "Remover dos favoritos" : "Adicionar aos favoritos",
        tarefa.favorita ? "ativo-favorito" : ""
    );
    favorito.addEventListener("click", () => alternarFavorito(tarefa.id));

    const fixar = criarBotaoAcao(
        "fa-solid fa-thumbtack",
        tarefa.fixada ? "Desafixar tarefa" : "Fixar tarefa",
        tarefa.fixada ? "ativo-fixado" : ""
    );
    fixar.addEventListener("click", () => alternarFixada(tarefa.id));

    const editar = criarBotaoAcao("fa-solid fa-pen", "Editar tarefa");
    editar.addEventListener("click", () => editarTarefa(tarefa.id));

    const excluir = criarBotaoAcao("fa-solid fa-trash", "Excluir tarefa", "excluir");
    excluir.addEventListener("click", () => excluirTarefa(tarefa.id));

    acoes.appendChild(favorito);
    acoes.appendChild(fixar);
    acoes.appendChild(editar);
    acoes.appendChild(excluir);

    item.appendChild(area);
    item.appendChild(acoes);

    listaTarefas.appendChild(item);
}

// Função utilitária para botões de ação
function criarBotaoAcao(icone, titulo, classeExtra = "") {
    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = `botao-acao ${classeExtra}`;
    botao.title = titulo;
    botao.innerHTML = `<i class="${icone}"></i>`;
    return botao;
}

// Ações de modificação das tarefas
function alternarConclusao(id) {
    tarefas = tarefas.map(tarefa => {
        if (tarefa.id === id) {
            return { ...tarefa, concluida: !tarefa.concluida };
        }
        return tarefa;
    });
    salvarTarefas();
    renderizarTarefas();
}

function alternarFavorito(id) {
    tarefas = tarefas.map(tarefa => {
        if (tarefa.id === id) {
            return { ...tarefa, favorita: !tarefa.favorita };
        }
        return tarefa;
    });
    salvarTarefas();
    renderizarTarefas();
}

function alternarFixada(id) {
    tarefas = tarefas.map(tarefa => {
        if (tarefa.id === id) {
            return { ...tarefa, fixada: !tarefa.fixada };
        }
        return tarefa;
    });
    salvarTarefas();
    renderizarTarefas();
}

function editarTarefa(id) {
    const tarefa = tarefas.find(tarefa => tarefa.id === id);

    if (!tarefa) return;

    const novoTexto = prompt("Editar tarefa:", tarefa.texto);

    if (novoTexto === null) return;

    const textoLimpo = novoTexto.trim();

    if (!textoLimpo) return;

    tarefa.texto = textoLimpo;
    salvarTarefas();
    renderizarTarefas();
}

function excluirTarefa(id) {
    const confirmar = confirm("Deseja realmente excluir esta tarefa?");

    if (!confirmar) return;

    tarefas = tarefas.filter(tarefa => tarefa.id !== id);
    salvarTarefas();
    renderizarTarefas();
}

function limparConcluidas() {
    const quantidade = tarefas.filter(tarefa => tarefa.concluida).length;

    if (quantidade === 0) return;

    const confirmar = confirm(`Excluir ${quantidade} tarefa(s) concluída(s)?`);

    if (!confirmar) return;

    tarefas = tarefas.filter(tarefa => !tarefa.concluida);
    salvarTarefas();
    renderizarTarefas();
}

// Formatações auxiliares
function textoPrioridade(valor) {
    if (valor === "alta") return "Alta";
    if (valor === "urgente") return "Urgente";
    return "Normal";
}

function formatarData(data) {
    const partes = data.split("-");
    if (partes.length !== 3) return data;
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

// Estatísticas e contadores
function atualizarEstatisticas() {
    totalTarefas.textContent = tarefas.length;
    totalPendentes.textContent = tarefas.filter(t => !t.concluida).length;
    totalConcluidas.textContent = tarefas.filter(t => t.concluida).length;
    totalFavoritas.textContent = tarefas.filter(t => t.favorita).length;
}

function atualizarContador(quantidade) {
    if (quantidade === 0) {
        contadorTarefas.textContent = "Nenhuma tarefa";
        return;
    }
    contadorTarefas.textContent = quantidade === 1 ? "1 tarefa exibida" : `${quantidade} tarefas exibidas`;
}

function atualizarMensagem(quantidade) {
    if (quantidade === 0) {
        mensagemVazia.classList.add("visivel");
    } else {
        mensagemVazia.classList.remove("visivel");
    }
}

// Filtros e ordenação
function selecionarFiltro(filtro) {
    filtroAtual = filtro;
    filtros.forEach(botao => {
        botao.classList.toggle("ativo", botao.dataset.filtro === filtro);
    });
    renderizarTarefas();
}

function alterarOrdenacao(novaOrdenacao) {
    ordenacaoAtual = novaOrdenacao;
    salvarTarefas();
    renderizarTarefas();
}

// Armazenamento local (LocalStorage)
function salvarTarefas() {
    localStorage.setItem("minhasTarefas", JSON.stringify(tarefas));
    localStorage.setItem("ordenacaoTarefas", ordenacaoAtual);
}

function carregarTarefas() {
    const tarefasSalvas = localStorage.getItem("minhasTarefas");
    const ordenacaoSalva = localStorage.getItem("ordenacaoTarefas");

    if (ordenacaoSalva) {
        ordenacaoAtual = ordenacaoSalva;
        if (selectOrdenacao) {
            selectOrdenacao.value = ordenacaoSalva;
        }
    }

    if (tarefasSalvas) {
        try {
            tarefas = JSON.parse(tarefasSalvas);
        } catch {
            tarefas = [];
        }
    }

    renderizarTarefas();
}

// Event Listeners
botaoTema.addEventListener("click", () => {
    document.body.classList.toggle("modo-escuro");
    const escuro = document.body.classList.contains("modo-escuro");

    botaoTema.innerHTML = escuro ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
    botaoTema.title = escuro ? "Modo claro" : "Modo escuro";
});

botaoAtualizar.addEventListener("click", () => {
    botaoAtualizar.classList.add("girando");
    renderizarTarefas();

    setTimeout(() => {
        botaoAtualizar.classList.remove("girando");
    }, 500);
});

botaoAdicionar.addEventListener("click", adicionarTarefa);

campoTarefa.addEventListener("keydown", evento => {
    if (evento.key === "Enter") {
        adicionarTarefa();
    }
});

campoPesquisa.addEventListener("input", renderizarTarefas);

botaoLimpar.addEventListener("click", limparConcluidas);

filtros.forEach(botao => {
    botao.addEventListener("click", () => {
        selecionarFiltro(botao.dataset.filtro);
    });
});

if (selectOrdenacao) {
    selectOrdenacao.addEventListener("change", e => {
        alterarOrdenacao(e.target.value);
    });
}


carregarTarefas();