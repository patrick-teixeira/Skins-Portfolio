# Skins Portfolio

Dashboard para acompanhar compras e vendas de skins, com controle de transacoes, metricas de lucro/prejuizo, grafico de PnL e autenticacao por usuario.

## Funcionalidades

- Cadastro e login de usuarios.
- Registro de skins compradas, incluindo preco, marketplace, data, raridade, imagem e observacoes.
- Edicao, exclusao e marcacao de venda de uma skin.
- Calculo de investimento total, total vendido, lucro, ROI e skins em estoque.
- Grafico de PnL com lucro por venda e acumulado.
- Busca de informacoes de skins a partir do arquivo `utils/skin_info.json`.
- Persistencia em PostgreSQL.

## Tecnologias

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- PostgreSQL com `pg`
- Radix UI, shadcn/ui, Recharts e Lucide React

## Requisitos

- Node.js 20 ou superior
- npm
- Um banco PostgreSQL local

## Configuracao

Crie um arquivo `.env` na raiz do projeto:

```env
DATABASE_URL="postgres://usuario:senha@host:5432/database"
POSTGRES_SSL="false"
```

Use `POSTGRES_SSL="false"` para banco local sem SSL.

As tabelas `users`, `sessions` e `transactions` sao criadas automaticamente quando a aplicacao acessa o banco. O schema tambem esta documentado em `database/schema.sql`.

## Rodando Localmente

Instale as dependencias:

```bash
npm install
```

Inicie o servidor de desenvolvimento:

```bash
npm run dev
```

Acesse:

```text
http://localhost:3000
```

## Scripts

```bash
npm run dev
```

Inicia o ambiente de desenvolvimento.

```bash
npm run build
```

Gera a build de producao.

```bash
npm run start
```

Executa a aplicacao ja compilada.

## Estrutura

```text
app/                 Rotas, paginas e API routes do Next.js
components/          Componentes da interface e componentes de UI
lib/                 Tipos, contexto do dashboard e servicos
lib/server/          Acesso ao banco, autenticacao e regras de transacao
database/schema.sql  Schema SQL do PostgreSQL
utils/skin_info.json Base local de dados das skins
public/              Imagens e icones publicos
```

## API

Principais rotas internas:

- `POST /api/auth/register` cria usuario.
- `POST /api/auth/login` inicia sessao.
- `POST /api/auth/logout` encerra sessao.
- `GET /api/auth/me` retorna o usuario autenticado.
- `GET /api/transactions` lista transacoes do usuario.
- `POST /api/transactions` cria uma transacao.
- `PUT /api/transactions/:transactionId` atualiza uma transacao.
- `DELETE /api/transactions/:transactionId` remove uma transacao.
- `PUT /api/transactions/:transactionId/sale` registra a venda.
- `GET /api/skin-image?name=...` busca dados de imagem/raridade da skin.

## Observacoes

- A autenticacao usa cookie `session_id` HTTP-only com validade de 30 dias.
- As senhas sao armazenadas com hash PBKDF2 e salt individual.
- O projeto nao depende de migrations externas para iniciar; o proprio servico cria as tabelas se elas ainda nao existirem.
