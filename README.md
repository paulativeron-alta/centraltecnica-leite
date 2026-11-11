# Plataforma Leite

Site da equipe técnica de leite, no mesmo estilo da Plataforma Azul. Reúne:

- **Central de Atendimento Técnico**: pedidos de agenda, agendamento, e-mails de confirmação, relatórios e indicadores.
- **CRM da Equipe Leite**: contas, visitas, funil e equipe.
- **Espaço para novas ferramentas**: dois cartões "Em breve" na tela inicial.

Como funciona:

- **Site**: fica no GitHub Pages, de graça.
- **Dados**: ficam numa **Planilha Google**, numa aba para cada tipo de informação.
- **Servidor**: um **Apps Script** ligado a essa planilha. Ele faz o login e envia os e-mails.
- **Login**: sem senha. A pessoa digita o e-mail e recebe um código de 6 dígitos.
- **Quem entra**: só os e-mails cadastrados na aba `usuarios`.

---

## Instalação (cerca de 20 minutos, uma vez só)

### 1. Criar a planilha e o servidor
1. Entre no Google com a conta que vai "ser dona" da plataforma. Os e-mails de código e de confirmação vão sair dessa conta.
2. Crie uma **Planilha Google** nova e dê o nome **Plataforma Leite – dados**.
3. Abra o editor: **Extensões › Apps Script**.
4. Copie o código para o editor:
   - Apague o que estiver em `Código.gs`.
   - Cole o conteúdo do arquivo `apps-script/Codigo.gs`.
   - Confira na linha `ADMIN_EMAIL` se o e-mail é o seu. Ele será a primeira pessoa da Gestão.
5. Ative o manifesto e copie as configurações:
   - Clique na engrenagem (**Configurações do projeto**).
   - Marque **Mostrar arquivo de manifesto "appsscript.json"**.
   - Volte ao editor e substitua o conteúdo de `appsscript.json` pelo arquivo `apps-script/appsscript.json`.
6. Salve. No topo, escolha a função **configurar** e clique em **Executar**. O Google pede autorização: clique em **Revisar permissões**, escolha a sua conta e depois **Avançado › Acessar (não seguro)** › **Permitir**. Esse aviso aparece em todo script próprio; ele só lê e grava esta planilha e envia e-mails.
7. Publique como aplicativo da Web:
   - Clique em **Implantar › Nova implantação**.
   - Na engrenagem, escolha **App da Web**.
   - **Executar como:** Eu.
   - **Quem pode acessar:** Qualquer pessoa. Isso não abre os dados: sem um código de login válido, o servidor não entrega nada.
   - Clique em **Implantar** e copie o **URL do app da Web**. Ele termina em `/exec`.

### 2. Ligar o site ao servidor
1. Abra o arquivo `config.js`.
2. Troque `COLE_AQUI_O_ENDERECO_DO_APPS_SCRIPT` pelo endereço `/exec` copiado.
3. Se quiser, troque também o nome do contato que aparece na tela de login.

### 3. Publicar o site no GitHub Pages
1. No GitHub, crie um repositório novo (por exemplo `plataforma-leite`) na mesma organização da Plataforma Azul (`altaleite`).
2. Clique em **Add file › Upload files** e arraste **todo o conteúdo** desta pasta, mantendo as subpastas.
3. Abra **Settings › Pages**:
   - Em **Source**, escolha **Deploy from a branch**.
   - Em **Branch**, escolha **main** e a pasta **/(root)**.
   - Clique em **Save**.
4. Em 1 ou 2 minutos o site estará em `https://altaleite.github.io/plataforma-leite/`.

> O arquivo de dados (`backup-inicial.json`) é entregue separado e **nunca** deve ser enviado ao GitHub. Importe-o pela própria plataforma (passo 4).

### 4. Primeiro acesso e carga dos dados
1. Abra o site e entre com o seu e-mail. O código chega em alguns segundos; confira o spam na primeira vez.
2. Na aba **Dados e backup**, escolha o arquivo `backup-inicial.json` (guardado no seu computador) e clique em **Importar**. O arquivo traz:
   - regionais e distritais;
   - os 10 técnicos;
   - as regras;
   - a lista de clientes;
   - o histórico de vendas (jan/2024 a out/2026);
   - as bases Alta CRIA e Alta Integra.

   A importação leva alguns minutos. Se cair a conexão, clique em **Importar** de novo: ela continua de onde parou.
3. Na aba **Usuários**, dê acesso à equipe. O papel define o que cada um vê:
   - **Gestão**: aceita pedidos, envia e-mails, vê indicadores e bases de vendas.
   - **Equipe técnica**: agenda e relatórios.
   - **Representante**: faz e acompanha pedidos.

   Também dá para cadastrar direto na aba `usuarios` da planilha. A mudança vale em até 1 minuto.

Pronto. Cada pessoa completa o próprio perfil na Central no primeiro acesso (regional e distrital, ou qual técnico é).

---

## No dia a dia

- **E-mails de confirmação**:
  - Na Central, a Gestão tem o botão **Enviar e-mail agora**. O e-mail sai da conta dona do Apps Script, com resposta para quem clicou.
  - O botão **Abrir no aplicativo de e-mail** continua disponível.
  - Limite do Google: 100 e-mails por dia em conta gratuita e 1.500 por dia no Google Workspace.
- **Atualizações entre pessoas**: as telas buscam novidades a cada 30 segundos. Para mudar o intervalo, altere `intervalo` no `config.js`.
- **Backup**:
  - Na aba **Dados e backup**, clique em **Baixar backup**.
  - A planilha também guarda histórico: **Arquivo › Histórico de versões**.
- **Base de vendas nova**: na Central, use **Bases de dados › Enviar planilhas**, como antes.

## Ao alterar o código do Apps Script
Use **Implantar › Gerenciar implantações** e clique no lápis. Em **Versão**, escolha **Nova versão** e clique em **Implantar**. Assim o endereço `/exec` continua o mesmo.

## Adicionar uma ferramenta nova
1. Crie uma pasta (por exemplo `visitas/`) com um `index.html` que carregue `../config.js` e `../core/alta.js`.
2. Logo no início do script dessa página, chame `ALTA.guarda()`.
3. Para gravar e ler dados, use `await window.claude.use('db')`, a mesma interface da Central e do CRM.
4. Em `index.html` (raiz), troque um dos cartões "Em breve" da lista `MODULOS` pelo novo módulo.

## Visual
- As cores, as fontes e o login seguem a Plataforma Azul.
- O ícone em `icones/` é genérico. Para usar o logotipo da Alta, substitua `icones/icone.svg` e os `.png` (192 e 512 px) pelos arquivos oficiais.

## Estrutura
```
index.html              tela de login e início (com Usuários e Dados para a Gestão)
config.js               endereço do Apps Script e nome da plataforma
core/alta.js            login, conexão com a planilha e atualização automática
core/plataforma.css     visual comum
central/index.html      Central de Atendimento Técnico
crm/index.html          CRM da Equipe Leite
apps-script/            código para colar no Apps Script
manifest.webmanifest, sw.js, icones/   permitem instalar no celular como aplicativo
```
