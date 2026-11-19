# Luna — plataforma de apoio financeiro

Site multipáginas com backend Node.js para apresentar a proposta da Luna: transformar necessidades financeiras individuais em próximos passos práticos e personalizados por meio de interação por voz e aplicativo. O chat usa um serviço de inteligência artificial do Google. A identidade visual é monocromática e editorial.

## Como executar

1. Instale o Node.js 20 ou superior.
2. Copie `.env.example` para `.env` e configure a chave de API de IA criada no [Google AI Studio](https://aistudio.google.com/apikey). Nunca coloque a chave em arquivos da pasta `assets/` nem a compartilhe publicamente.
3. Na pasta do projeto, execute:

   ```sh
   npm start
   ```

4. Acesse `http://localhost:3000`. O servidor Node serve o site e encaminha mensagens autorizadas ao serviço de IA; não é necessário executar `npm install`.

O provedor e o modelo são configurados no backend. As cotas, os preços e a disponibilidade dependem do Google e podem mudar. Consulte as condições na [página de IA do Google](https://ai.google.dev/) e leia a [página de Privacidade](./pages/privacidade.html) antes de enviar mensagens.

Este backend inicial é para desenvolvimento local: não tem autenticação e escuta somente em `127.0.0.1`. Não o publique diretamente na internet sem adicionar autenticação, controles de abuso e uma configuração de produção apropriada.

## Estrutura

```text
index.html
server.js
package.json
.env.example
pages/
  404.html
  app-robo.html
  contato.html
  creators.html
  ia.html
  jogo.html
  modelo-3d.html
  noticias.html
  privacidade.html
  referencias.html
  sobre.html
assets/
  css/styles.css
  js/
    ai-demo.js
    contact-demo.js
    game.js
    model-viewer.js
    robot-app.js
    site.js
  data/demo-config.json
  images/
  models/README.md
```

## Funcionalidades

- Navegação compartilhada, marcação da página atual, menu móvel acessível por teclado e rodapé institucional.
- No celular, barra de navegação fixa inferior para Início, Luna, Modelo 3D e IA; a opção “Mais” abre acesso às demais páginas. A barra respeita a área segura de telas com recorte e reserva espaço no conteúdo para não cobrir o final das páginas.
- Layouts responsivos ajustados por tipo de página: controles maiores no painel, área 3D dimensionada à tela, tabuleiro tátil, conversa com sugestões roláveis e formulário otimizado para teclado móvel.
- O cabeçalho fixo se oculta ao rolar para baixo, reaparece ao rolar para cima e recolhe após 2,5 segundos sem movimento; permanece disponível no topo, durante navegação por teclado ou com o menu aberto. O espaço original é preservado para evitar saltos e os links de âncora recebem margem para não ficarem sob o cabeçalho. O balão preto mostra uma mensagem introdutória e oferece acesso ao chat da Luna.
- As barras de rolagem são discretas e aparecem ao aproximar o mouse da borda da janela, usando um estilo fino e arredondado coerente com a interface.
- Em dispositivos com mouse, um cursor vetorial personalizado acompanha a interface e alterna entre seta, mão, texto, carregamento e ação indisponível; em touch e com movimento reduzido, evita animação de rotação.
- A seleção de texto usa destaque monocromático com um traço animado discreto, e cliques do mouse produzem um breve estalo de estrelas; ambos respeitam a preferência por movimento reduzido.
- Botões de fechar usam o padrão reutilizável `.icon-close-button`: ícone vetorial de traço, alvo circular acessível e estados visuais de hover e foco, evitando glifos tipográficos inconsistentes.
- Transição suave em fade cinza-claro (650–750 ms) entre páginas internas, com navegação normal preservada para links externos, novas abas e âncoras. A preferência por movimento reduzido desativa a animação.
- Página inicial reorganizada com hero amplo e arredondado, etapas de navegação, detalhe sobreposto, faixa de tecnologias e seções editoriais de experiências. A composição apresenta a proposta da Luna e preserva a paleta monocromática.
- Página inicial, sobre, Creators (cinco integrantes), notícias, referências, contato, privacidade e página 404.
- A página inicial inclui um mapa editorial com resumos e links para Sobre, Modelo 3D, Aplicativo, Creators, Jogo, Atualizações, Referências, Contato e Privacidade; a página do chatbot fica fora desse panorama.
- O título principal da página inicial alterna entre quatro frases com efeito de digitação e apagamento; a primeira frase permanece estática quando o usuário prefere movimento reduzido.
- Três seletores numerados controlam os destaques da capa: o conteúdo ativo é marcado visualmente, a linha entre os números preenche gradualmente durante 5,5 segundos até a próxima troca e, ao passar o mouse sobre a capa, o progresso pausa e recomeça do início quando o ponteiro sai. No terceiro destaque, cinco cards ilustrativos de Creators entram com animação de subida.
- O segundo destaque da página inicial usa a imagem enviada pela equipe para apresentar o protótipo Luna.
- A página Atualizações reúne pautas sobre endividamento, crédito, golpes, planejamento, inclusão e privacidade, com cards editoriais de composições variadas, navegação por tema e animações que respeitam a preferência por movimento reduzido. As pautas são pontos de partida para pesquisa, não manchetes ou estatísticas atuais.
- A página Sobre apresenta a proposta de apoio financeiro prático; o protótipo local do app já permite propor itens para um painel vazio, revisar alterações sugeridas pela IA e atualizar gráficos somente após confirmação. Pontos a avaliar e próximos passos também são propostos pela IA com base na conversa.
- Os cinco cards de Creators usam uma composição assimétrica que se adapta a desktop, tablet e celular, com entrada escalonada e estados de interação por hover, foco e toque.
- Chat da Luna integrado a um serviço de IA por um backend Node.js; o navegador não recebe a chave da API. No app, cada envio pede autorização por padrão; “Controle total” dispensa essa confirmação após autorização prévia e envia mensagem, histórico recente e painel somente quando a pessoa aciona Enviar.
- O backend serve o site apenas em `127.0.0.1`, valida o tamanho/formato das mensagens, limita a frequência de chamadas e não grava o conteúdo recebido. O arquivo `.env` está ignorado pelo Git.
- O painel local é atualizado com itens confirmados e fica no `localStorage` do navegador. “Controle total” autoriza o envio automático após cada envio iniciado pela pessoa e a edição automática dos itens locais; sem essa opção, cada envio e alteração precisam ser autorizados individualmente.
- O painel permite valores em reais, pesos argentinos, dólares e outras moedas comuns. Os gráficos filtram uma moeda por vez e não somam nem convertem moedas sem uma cotação informada. A composição lista cada gasto com categoria, frequência e participação no total, inclusive despesas pontuais; outros gráficos mostram os gastos, rendas e despesas essenciais individualmente. O medidor estima a parcela da renda recorrente comprometida somente com despesas mensais informadas; itens pontuais e valores ausentes não entram nesse cálculo.
- Em Próximos passos, a IA gera perguntas abertas com base na conversa, no painel e nas respostas anteriores. As respostas ficam no navegador e, após autorização de envio (ou com Controle total ativo), acompanham a próxima mensagem para adaptar as próximas perguntas e sugestões. Cada sugestão inclui uma ação inicial e o motivo. O painel também oferece uma calculadora científica local com operações aritméticas, potências, porcentagens, raízes, logaritmos e funções trigonométricas em graus ou radianos.
- Leia a página de [Privacidade](./pages/privacidade.html) para saber como os dados são enviados e armazenados. “Apagar dados” remove o painel do navegador, mas não dados já processados pelo serviço externo.
- Na página do chatbot, o histórico rola em uma área própria e as sugestões e o campo de mensagem permanecem juntos na base do painel, com espaço reservado para a navegação inferior no celular.
- Jogo da velha funcional para duas pessoas no mesmo dispositivo.
- Visualização geométrica interativa em Canvas com rotação, zoom e redefinição. Não é um modelo do protótipo físico e não depende de Three.js.
- Protótipo local do aplicativo com indicadores, gráficos de valores confirmados, itens de renda/contas/despesas/objetivos, pontos a avaliar e próximos passos sugeridos. Propostas de inclusão, edição e remoção aparecem no chat para autorização individual; com “Controle total”, as alterações ficam restritas ao painel local. Campos não informados não são estimados. O painel é salvo somente neste navegador.
- Formulário com validação HTML, sem envio ou persistência dos campos.

## Conteúdo e personalização

- Edite os placeholders nas páginas em `pages/` com informações confirmadas pela equipe.
- Ajuste cores, tipografia, largura e espaçamento em `:root` de `assets/css/styles.css`.
- A navegação e o rodapé são construídos em `assets/js/site.js`. O atributo `data-root` no `<body>` define o prefixo relativo de links em cada página.
- A configuração demonstrativa fica em `assets/data/demo-config.json`.
- As fontes DM Sans e Instrument Serif podem ser carregadas do Google Fonts quando há internet; fontes locais alternativas são usadas se o serviço estiver indisponível.

## Modelo 3D

O Canvas em `pages/modelo-3d.html` desenha uma geometria provisória. Para inserir um modelo real, adicione um arquivo `.glb` ou `.gltf` a `assets/models/`, confirme que ele representa o hardware atual e substitua o renderer de Canvas por um visualizador compatível. Documente a biblioteca escolhida e sua licença antes de adicioná-la. A representação atual não deve ser apresentada como modelo físico definitivo.

## Integração física futura

Não há conexão real implementada. `assets/js/robot-app.js` separa uma interface mínima de transporte (`connect`, `disconnect`, `send`) da renderização do painel, usando exclusivamente `SimulationTransport`. Para integrar a Luna física com segurança, primeiro documente e valide:

- placa, firmware, motores e sensores realmente instalados;
- método suportado pelo navegador e requisitos de origem segura/permissões;
- protocolo, formato de mensagens, comandos permitidos e respostas;
- limites de velocidade, validação dos dados e timeout;
- estado seguro do firmware após perda de comunicação, incluindo parada quando apropriado.

Implemente um transporte real apenas após esses dados serem conhecidos e testados. Não inclua credenciais no frontend. Web Serial/Web Bluetooth dependem de suporte do navegador, contexto seguro e consentimento do usuário. A interface web não substitui uma parada de emergência física.

## Limitações conhecidas

- Nenhum hardware ou envio de contato foi configurado. O chat precisa de uma chave de API válida no `.env`; os dados do painel são locais, sem sincronização entre dispositivos.
- Conteúdos da equipe, componentes e referências ainda precisam de validação; a página Atualizações apresenta pautas temáticas e fontes para pesquisa, não notícias factuais.
- O visualizador é uma projeção geométrica demonstrativa em Canvas, não carrega GLB/glTF.
- A página `404.html` está disponível como arquivo, mas sua configuração como erro padrão depende do servidor de hospedagem.
- Revise a política de privacidade antes de alterar o processamento de dados, adicionar telemetria ou armazenamento.
