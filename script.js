document.addEventListener("DOMContentLoaded", () => {
    // 1. Seleção dos Elementos do DOM
    const campoTarefa = document.getElementById("campo-tarefa");
    const botaoAdicionar = document.getElementById("botao-adicionar");
    const campoPesquisa = document.getElementById("campo-pesquisa");
    const prioridade = document.getElementById("prioridade");
    const dataTarefa = document.getElementById("data-tarefa");
    const selectOrdenacao = document.getElementById("select-ordenacao");

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

    // 2. Estado da Aplicação
    let tarefas = [];
    let filtroAtual = "todas";
    let ordenacaoAtual = "data";

    // 3. Funções Principais
    function adicionarTarefa() {
        if (!campoTarefa) return;
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
            prioridade: prioridade ? prioridade.value : "normal",
            data: dataTarefa ? dataTarefa.value : ""
        };

        tarefas.push(novaTarefa);

        campoTarefa.value = "";
        if (prioridade) prioridade.value = "normal";
        if (dataTarefa) dataTarefa.value = "";

        salvarTarefas();
        renderizarTarefas();
        campoTarefa.focus();
    }

    function renderizarTarefas() {
        if (!listaTarefas) return;
        listaTarefas.innerHTML = "";

        let tarefasFiltradas = [...tarefas];

        const pesquisa = campoPesquisa ? campoPesquisa.value.trim().toLowerCase() : "";

        if (pesquisa) {
            tarefasFiltradas = tarefasFiltradas.filter(tarefa =>
                tarefa.texto.toLowerCase().includes(pesquisa)
            );
        }

        if (filtroAtual === "pendentes") {
            tarefasFiltradas = tarefasFiltradas.filter(tarefa => !tarefa.concluida);
        } else if (filtroAtual === "concluidas") {
            tarefasFiltradas = tarefasFiltradas.filter(tarefa => tarefa.concluida);
        } else if (filtroAtual === "favoritas") {
            tarefasFiltradas = tarefasFiltradas.filter(tarefa => tarefa.favorita);
        } else if (filtroAtual === "fixadas") {
            tarefasFiltradas = tarefasFiltradas.filter(tarefa => tarefa.fixada);
        }

        const pesoPrioridade = { urgente: 3, alta: 2, normal: 1 };

        tarefasFiltradas.sort((a, b) => {
            if (a.fixada !== b.fixada) return b.fixada - a.fixada;

            if (ordenacaoAtual === "urgencia") {
                const pesoA = pesoPrioridade[a.prioridade] || 0;
                const pesoB = pesoPrioridade[b.prioridade] || 0;
                if (pesoA !== pesoB) return pesoB - pesoA;
            }

            if (ordenacaoAtual === "data") {
                if (a.data && !b.data) return -1;
                if (!a.data && b.data) return 1;
                if (a.data && b.data && a.data !== b.data) {
                    return a.data.localeCompare(b.data);
                }
            }

            if (a.favorita !== b.favorita) return b.favorita - a.favorita;

            return b.id - a.id;
        });

        tarefasFiltradas.forEach(criarElementoTarefa);

        atualizarEstatisticas();
        atualizarMensagem(tarefasFiltradas.length);
        atualizarContador(tarefasFiltradas.length);
    }

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
        editar.addEventListener("click", () => editarTarefaInline(tarefa.id, texto));

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

    function criarBotaoAcao(icone, titulo, classeExtra = "") {
        const botao = document.createElement("button");
        botao.type = "button";
        botao.className = `botao-acao ${classeExtra}`.trim();
        botao.title = titulo;
        botao.innerHTML = `<i class="${icone}"></i>`;
        return botao;
    }

    function alternarConclusao(id) {
        tarefas = tarefas.map(tarefa => tarefa.id === id ? { ...tarefa, concluida: !tarefa.concluida } : tarefa);
        salvarTarefas();
        renderizarTarefas();
    }

    function alternarFavorito(id) {
        tarefas = tarefas.map(tarefa => tarefa.id === id ? { ...tarefa, favorita: !tarefa.favorita } : tarefa);
        salvarTarefas();
        renderizarTarefas();
    }

    function alternarFixada(id) {
        tarefas = tarefas.map(tarefa => tarefa.id === id ? { ...tarefa, fixada: !tarefa.fixada } : tarefa);
        salvarTarefas();
        renderizarTarefas();
    }

    // Edição inline sem abrir o prompt do navegador
    function editarTarefaInline(id, elementoTexto) {
        const tarefa = tarefas.find(t => t.id === id);
        if (!tarefa) return;

        const inputEdicao = document.createElement("input");
        inputEdicao.type = "text";
        inputEdicao.value = tarefa.texto;
        inputEdicao.className = "input-edicao-inline";
        inputEdicao.style.fontSize = "inherit";
        inputEdicao.style.fontFamily = "inherit";
        inputEdicao.style.width = "100%";

        elementoTexto.replaceWith(inputEdicao);
        inputEdicao.focus();

        function salvarEdicao() {
            const novoTexto = inputEdicao.value.trim();
            if (novoTexto) {
                tarefa.texto = novoTexto;
                salvarTarefas();
            }
            renderizarTarefas();
        }

        inputEdicao.addEventListener("blur", salvarEdicao);
        inputEdicao.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                salvarEdicao();
            } else if (e.key === "Escape") {
                renderizarTarefas();
            }
        });
    }

    // Exclusão direta sem chamar o confirm() nativo
    function excluirTarefa(id) {
        tarefas = tarefas.filter(tarefa => tarefa.id !== id);
        salvarTarefas();
        renderizarTarefas();
    }

    // Limpeza direta sem chamar o confirm() nativo
    function limparConcluidas() {
        tarefas = tarefas.filter(tarefa => !tarefa.concluida);
        salvarTarefas();
        renderizarTarefas();
    }

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

    function atualizarEstatisticas() {
        if (totalTarefas) totalTarefas.textContent = tarefas.length;
        if (totalPendentes) totalPendentes.textContent = tarefas.filter(t => !t.concluida).length;
        if (totalConcluidas) totalConcluidas.textContent = tarefas.filter(t => t.concluida).length;
        if (totalFavoritas) totalFavoritas.textContent = tarefas.filter(t => t.favorita).length;
    }

    function atualizarContador(quantidade) {
        if (!contadorTarefas) return;
        if (quantidade === 0) {
            contadorTarefas.textContent = "Nenhuma tarefa";
            return;
        }
        contadorTarefas.textContent = quantidade === 1 ? "1 tarefa exibida" : `${quantidade} tarefas exibidas`;
    }

    function atualizarMensagem(quantidade) {
        if (!mensagemVazia) return;
        if (quantidade === 0) {
            mensagemVazia.classList.add("visivel");
        } else {
            mensagemVazia.classList.remove("visivel");
        }
    }

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

    function salvarTarefas() {
        try {
            localStorage.setItem("minhasTarefas", JSON.stringify(tarefas));
            localStorage.setItem("ordenacaoTarefas", ordenacaoAtual);
        } catch (e) {
            console.error("Erro ao salvar no localStorage:", e);
        }
    }

    function carregarTarefas() {
        try {
            const ordenacaoSalva = localStorage.getItem("ordenacaoTarefas");
            if (ordenacaoSalva) {
                ordenacaoAtual = ordenacaoSalva;
                if (selectOrdenacao) selectOrdenacao.value = ordenacaoSalva;
            }

            const tarefasSalvas = localStorage.getItem("minhasTarefas");
            if (tarefasSalvas) {
                tarefas = JSON.parse(tarefasSalvas);
            }
        } catch (e) {
            console.error("Erro ao carregar do localStorage:", e);
            tarefas = [];
        }

        renderizarTarefas();
    }

    // 4. Listeners de Eventos
    if (botaoTema) {
        botaoTema.addEventListener("click", () => {
            document.body.classList.toggle("modo-escuro");
            const escuro = document.body.classList.contains("modo-escuro");
            botaoTema.innerHTML = escuro ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
            botaoTema.title = escuro ? "Modo claro" : "Modo escuro";
        });
    }

    if (botaoAtualizar) {
        botaoAtualizar.addEventListener("click", () => {
            botaoAtualizar.classList.add("girando");
            renderizarTarefas();
            setTimeout(() => {
                botaoAtualizar.classList.remove("girando");
            }, 500);
        });
    }

    if (botaoAdicionar) botaoAdicionar.addEventListener("click", adicionarTarefa);

    if (campoTarefa) {
        campoTarefa.addEventListener("keydown", evento => {
            if (evento.key === "Enter") adicionarTarefa();
        });
    }

    if (campoPesquisa) campoPesquisa.addEventListener("input", renderizarTarefas);
    if (botaoLimpar) botaoLimpar.addEventListener("click", limparConcluidas);

    filtros.forEach(botao => {
        botao.addEventListener("click", () => selecionarFiltro(botao.dataset.filtro));
    });

    if (selectOrdenacao) {
        selectOrdenacao.addEventListener("change", e => alterarOrdenacao(e.target.value));
    }

    // Inicializa a aplicação
    carregarTarefas();
});