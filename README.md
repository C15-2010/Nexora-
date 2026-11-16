# NEXORA — MVP v0.2

Aplicação web responsiva para gestão de pequenos negócios. Este pacote contém o código-fonte do MVP, banco de dados e instruções para configurar.

## O que já está implementado

- Cadastro e login por e-mail/senha (Supabase Auth).
- Criação automática do espaço de negócio do usuário.
- Cadastro, edição e exclusão de produtos.
- Controle visual de estoque e alerta de estoque mínimo.
- Registro e histórico de vendas com forma de pagamento e desconto.
- Baixa automática de estoque em transação no banco; ao cancelar/excluir uma venda, o estoque é devolvido.
- Custo do produto salvo no momento da venda para estimar lucro bruto e resultado após despesas.
- Configuração do segmento do negócio para orientar futuras personalizações.
- Cadastro, edição e exclusão de clientes.
- Registro e exclusão de despesas.
- Dashboard com totais calculados a partir dos dados reais.
- Relatórios simples por produto/descrição.
- Assistente inicial baseado em regras locais e nos dados cadastrados.
- Interface em português, moeda BRL, datas brasileiras e layout adaptado para celular.

## O que ainda não está implementado

Este é um MVP em evolução, não um SaaS comercial pronto para vender. Ainda faltam, entre outros itens:

- Convites e múltiplos funcionários por empresa.
- Integração com pagamentos e planos pagos.
- IA generativa conectada por backend seguro.
- Exportação PDF/Excel, gráficos avançados e filtros por período.
- Testes automatizados, auditoria, monitoramento e política de privacidade/termos.
- Validação de regras fiscais e emissão de documentos fiscais.

O assistente desta versão não chama uma IA externa. Ele responde somente a algumas perguntas com cálculos feitos no navegador usando os dados que o usuário cadastrou. Vendas antigas anteriores à migration 002 podem não ter custo histórico registrado; o resultado delas pode ficar superestimado até que os dados sejam revisados.

## Requisitos

- Node.js 20 ou superior recomendado.
- Conta no Supabase.
- Navegador moderno.

## Configuração do banco

1. Crie um projeto no Supabase e abra **SQL Editor**.
2. Execute primeiro `supabase/migrations/001_initial_schema.sql`.
3. Depois execute `supabase/migrations/002_operacao_financeiro.sql` (estoque automático, desconto, pagamento e custo histórico).
4. Em **Project Settings → API**, copie a Project URL e a chave pública `anon` (não use a `service_role` no navegador).

## Configuração do projeto

1. Copie `.env.example` para `.env`.
2. Preencha as variáveis:

```env
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_CHAVE_PUBLICA_ANON
```

3. Instale e execute:

```bash
npm install
npm run dev
```

Para gerar a versão de produção:

```bash
npm run build
npm run preview
```

## Publicação

O projeto pode ser publicado em serviços que hospedam aplicações Vite, como Vercel ou Netlify. Configure as mesmas variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` nas variáveis de ambiente do serviço de hospedagem.

## Segurança importante

- Nunca coloque a chave `service_role` do Supabase no frontend.
- Mantenha RLS habilitado.
- Não remova as políticas de segurança do SQL.
- Antes de usar com clientes reais, faça testes com duas contas diferentes para verificar isolamento dos dados.
- Configure confirmação de e-mail, recuperação de senha e limites de autenticação no Supabase.
- Faça backup e revise políticas de privacidade antes de operar comercialmente.

## Estrutura

```text
nexora/
├── src/
│   ├── App.jsx
│   ├── main.jsx
│   ├── styles.css
│   └── supabase.js
├── supabase/
│   └── migrations/
│       ├── 001_initial_schema.sql
│       └── 002_operacao_financeiro.sql
├── .env.example
├── index.html
├── package.json
└── README.md
```
