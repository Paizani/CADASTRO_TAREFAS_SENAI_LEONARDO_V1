
const campoTarefa = document.getElementById("campo-tarefa");

const botaoAdicionar =
    document.getElementById("botao-adicionar");

const botaoTema =
    document.getElementById("botao-tema");

const listaTarefas =
    document.getElementById("lista-tarefas");

const contadorTarefas =
    document.getElementById("contador-tarefas");




function adicionarTarefa() {

    const texto = campoTarefa.value.trim();


    
    if (texto === "") {
        return;
    }



    const item = document.createElement("li");

    item.classList.add("item-tarefa");


    
    const textoTarefa = document.createElement("span");

    textoTarefa.textContent = texto;


    
    const acoes = document.createElement("div");

    acoes.classList.add("acoes-tarefa");


   

    const botaoConcluir =
        document.createElement("button");

    botaoConcluir.classList.add("botao-acao");

    botaoConcluir.innerHTML =
        '<i class="fa-solid fa-check"></i>';

    botaoConcluir.title =
        "Concluir tarefa";


    botaoConcluir.addEventListener(
        "click",
        function () {

            item.classList.toggle("concluida");

        }
    );


  

    const botaoExcluir =
        document.createElement("button");

    botaoExcluir.classList.add(
        "botao-acao",
        "excluir"
    );

    botaoExcluir.innerHTML =
        '<i class="fa-solid fa-trash"></i>';

    botaoExcluir.title =
        "Excluir tarefa";


    botaoExcluir.addEventListener(
        "click",
        function () {

            item.remove();

            atualizarContador();

        }
    );


   

    acoes.appendChild(botaoConcluir);

    acoes.appendChild(botaoExcluir);


    item.appendChild(textoTarefa);

    item.appendChild(acoes);


    listaTarefas.appendChild(item);


    // Limpar campo
    campoTarefa.value = "";

    campoTarefa.focus();


    // Atualizar contador
    atualizarContador();
}




botaoAdicionar.addEventListener(
    "click",
    adicionarTarefa
);




campoTarefa.addEventListener(
    "keydown",
    function (evento) {

        if (evento.key === "Enter") {

            adicionarTarefa();

        }

    }
);




function atualizarContador() {

    const quantidade =
        listaTarefas.children.length;


    if (quantidade === 0) {

        contadorTarefas.textContent =
            "0 tarefas na lista";

    } else if (quantidade === 1) {

        contadorTarefas.textContent =
            "1 tarefa na lista";

    } else {

        contadorTarefas.textContent =
            quantidade + " tarefas na lista";

    }
}




botaoTema.addEventListener(
    "click",
    function () {

        document.body.classList.toggle(
            "modo-escuro"
        );


        const modoEscuro =
            document.body.classList.contains(
                "modo-escuro"
            );


        if (modoEscuro) {

           

            botaoTema.innerHTML =
                '<i class="fa-solid fa-sun"></i>';

            botaoTema.title =
                "Modo claro";

        } else {

        

            botaoTema.innerHTML =
                '<i class="fa-solid fa-moon"></i>';

            botaoTema.title =
                "Modo escuro";

        }

    }
);
