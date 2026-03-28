# Cannapass — Plataforma Digital de Rastreamento e Fiscalização

## Sobre o Projeto
Cannapass é uma plataforma digital brasileira que digitaliza e unifica a documentação necessária para o transporte legal de cannabis medicinal no Brasil. Gera QR Codes verificáveis por autoridades em tempo real.

## Stack Técnico
- **Frontend:** HTML, CSS, JavaScript (arquivo único index.html)
- **Backend/DB:** Supabase (PostgreSQL + Auth + Storage)
- **Hosting:** Vercel
- **Autenticação:** Supabase Auth (e-mail + senha)

## Credenciais Supabase
- URL: https://yoeqdwkshqqkvcctvmay.supabase.co
- As chaves estão no index.html (anon key pública)

## Estrutura do Banco de Dados
- `profiles` — Perfis de usuário (role: patient/agent/admin)
- `patients` — Cadastros completos de pacientes
- `documents` — Metadados de documentos enviados
- `qr_codes` — QR Codes gerados
- `verifications` — Log de verificações dos agentes
- `travel_data` — Dados de viagem

## Portais (3 perfis de usuário)
1. **Paciente** — Cadastro em 5 etapas, upload de docs, QR Code, dados de viagem
2. **Agente Fiscalizador** — Scanner de QR, verificação, busca manual, guia
3. **Admin** — Dashboard com stats, gestão de cadastros, verificações, relatórios

## Fluxo Principal
1. Paciente se cadastra com dados pessoais
2. Escolhe via: Farmácia/Associação OU Habeas Corpus
3. Faz upload de documentos (RG + prescrição ou decisão judicial)
4. Informa produto e quantidade
5. Plataforma valida → gera QR Code
6. Agentes escaneiam QR em aeroportos/rodoviárias
7. Sistema registra verificação

## Conformidade Legal
- Resolução ANVISA RDC nº 327/2019
- Lei nº 11.343/2006
- LGPD para proteção de dados

## Convenções de Código
- CSS com variáveis customizadas (--green, --surface, etc.)
- Fontes: Syne (títulos) + DM Sans (corpo)
- Tema escuro com tons de verde
- Português brasileiro em toda a interface
- Funções JavaScript no padrão camelCase
- Estado global no objeto `state`
