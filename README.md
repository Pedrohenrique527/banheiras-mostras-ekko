# Sistema de Banheiras e Amostras

Sistema corporativo da **Ekko Revestimentos** para cadastro visual, estoque, localizacao, movimentacao e rastreabilidade de banheiras, amostras e materiais de exposicao.

## Principais recursos

- Login com perfis Administrador, Gerente e Usuario
- Cadastro de produtos com foto obrigatoria
- Fotos dos produtos salvas no Cloudinary
- Firestore como banco de dados
- Campo de nota fiscal com numero, data, link e observacao
- Edicao auditada de produtos
- Remocao logica com quem removeu, onde removeu, quando removeu e por que removeu
- Estoque visual com busca, filtros, tabela e cards
- Localizacao e status atual de cada produto
- Movimentacoes permanentes com origem, destino, responsavel, data e observacao
- Linha do tempo individual e auditoria de alteracoes
- Gestao de usuarios
- Somente o proprietario do sistema pode criar acessos, alterar permissoes e remover contas
- Mural de avisos para todos ao entrarem no sistema
- Chat interno da equipe
- QR Code individual por produto

O sistema comeca sem produtos pre-cadastrados. A equipe inclui cada item com foto durante o cadastro.

## Acessos

O proprietario entra no sistema, acessa **Usuarios** e cria os acessos da equipe usando o botao **Novo usuario**.

## Tecnologias

- Next.js
- TypeScript
- Tailwind CSS
- Firebase Firestore
- Cloudinary
- Vercel

## Variaveis de ambiente

Crie um projeto no Firebase, ative somente o **Firestore**, gere uma chave de Service Account e cadastre estas variaveis na Vercel:

```env
FIREBASE_PROJECT_ID=seu-projeto-firebase
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@seu-projeto-firebase.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nSUA_CHAVE_PRIVADA\n-----END PRIVATE KEY-----\n"
```

Crie uma conta gratuita no Cloudinary e cadastre estas variaveis na Vercel:

```env
CLOUDINARY_CLOUD_NAME=seu-cloud-name
CLOUDINARY_API_KEY=sua-api-key
CLOUDINARY_API_SECRET=seu-api-secret
```

Opcionalmente, defina quem e o dono do sistema:

```env
SYSTEM_OWNER_EMAIL=admin@ekko.com.br
```

Se essa variavel nao for preenchida, o sistema usa `admin@ekko.com.br` como proprietario.

## Executar localmente

Requisitos: Node.js 22 ou superior.

```bash
npm install
npm run dev
```

Para validar a versao de producao:

```bash
npm run build
```

## Colocar no GitHub

1. Crie um repositorio vazio no GitHub.
2. Extraia o ZIP do projeto.
3. Execute dentro da pasta:

```bash
git init
git add .
git commit -m "Sistema de Banheiras e Amostras"
git branch -M main
git remote add origin URL_DO_SEU_REPOSITORIO
git push -u origin main
```

Nao envie `.env`, `node_modules`, `.next`, `dist` ou arquivos de build.

## Publicar na Vercel

1. Entre na Vercel.
2. Clique em **Add New Project**.
3. Importe o repositorio do GitHub.
4. Framework: **Next.js**.
5. Build command: `npm run build`.
6. Cadastre as variaveis de ambiente do Firebase e Cloudinary.
7. Clique em **Deploy**.

## Permanencia dos dados

Os dados ficam no Firestore e as fotos ficam no Cloudinary. O sistema nao apaga historicos de movimentacao, auditoria, chat ou remocao logica de produto. A permanencia real depende das contas Firebase/Cloudinary, das regras dos planos gratuitos e de backups administrativos.

## Autoria

Software desenvolvido por Pedro Mariniello para a Ekko Revestimentos.
