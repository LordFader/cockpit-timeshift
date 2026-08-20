# Roadmap — Próxima Sessão

> Documento de handoff: recomendações para promover a app Cockpit Timeshift
> de beta para um nível mais profissional.
>
> Estado atual: Fases 1–3 de paridade GUI concluídas + hardening de Settings
> (mode BTRFS/RSYNC, validação executável, retention dropdowns, defaults
> recomendados). Master no `0a2f8b7` (#8).

---

## Contexto e verificação rápida

Auditoria feita a 2026-08-20:

- App em vanilla JS/HTML/CSS, sem build system nem package.json.
- CI atual: `node --check timeshift.js` + `sh -n install.sh` (push).
- **Zero testes automatizados** (só `node --check` + testes manuais).
- **Sem i18n** (`no po/ dir`), `index.html` com `lang="en"` fixo.
- **Sem ESLint/Prettier**.
- **Sem tags/releases Git** (`v0.1.0-beta` nunca foi tagado).
- `git-backup.sh` está versionado na raiz (marcado opcional no .gitignore).

---

## Recomendações por prioridade

### 1. Testes unitários dos parsers (rede de segurança) — recomendado primeiro

Hoje não há testes. Os parsers puros (`parseList`, `parseListHeader`,
flattening do `lsblk`, classificação Scheduled/On-demand) são ideais para
testes unitários **sem precisar de servidor/Cockpit**.

- Formato: JS simples com runner leve (ex.: Node `node:test`) ou pequeno
  script que corre os parsers com inputs fixos. Sem instalar dependências.
- Ganho: evitar regressões ao mexer na UI; passível de correr no CI.

### 2. CI mais sólida

No `.github/workflows/ci.yml`:

- Correr os testes unitários do ponto 1.
- Validar o `manifest.json` (schema mínimo / JSON válido + campos obrigatórios).
- Gerar artefacto de release (zip/tar com os 4 ficheiros) quando se fizer tag.

### 3. Versionamento real (tags + releases GitHub)

- `docs/VERSIONING.md` já define a convenção. Falta efetivamente criar a tag
  `v0.1.0-beta` e publicar uma Release no GitHub (com o artefacto do ponto 2).
- Manter `CHANGELOG.md` atualizado por release (secção `## vX.Y.Z`).

### 4. ESLint / Prettier (consistência de código)

- Config mínima (`eslint.config.js`), registar como script e incluir no CI.
- Sem build system: ESLint roda sobre os ficheiros estáticos diretamente.

### 5. i18n / traduções

- Integrar o mecanismo gettext do Cockpit (estrutura `po/`, `LINGUAS`,
  ficheiros `.po`, compilação `*.mo`).
- Alargar `lang` dinâmico no `index.html` em vez de `lang="en"` fixo.
- Primeiro alvo: Português (utilizador principal).

### 6. Housekeeping leve

- Migrar `git-backup.sh` para `tools/` (ou remover) — hoje está na raiz.
- Adicionar `CONTRIBUTING.md` apontando para `docs/PROCEDURES.md`.

---

## Ordem de execução sugerida (maior valor, menor risco)

1. Testes unitários dos parsers (introduz teste na CI junto com `node --check`).
2. ESLint mínimo na CI.
3. Tag `v0.1.0-beta` + Release GitHub com artefacto.
4. i18n (PT primeiro).
5. Housekeeping (`tools/`, `CONTRIBUTING.md`).

---

## Lembretes operacionais (desta sessão)

- **Fetch antes de `git reset --hard`** ao sincronizar máquinas (ref stale —
  ver `docs/PROCEDURES.md` secção 4/12).
- Fluxo: branch `feat/` → PR para `master` → CI `syntax-check` → approve →
  `gh auth switch -u LordFader` → squash merge → voltar a `PGodinho` → sync.
- O `install.sh` gera a build de produção e remove marcadores DEV
  (separador "Timeshift", sem badge DEV).
- Estável: `sudo sh /usr/share/cockpit/timeshift-dev/install.sh`.
- Deploy do `PROCEDURES.md` canónico para o estável:
  `sudo cp /usr/share/cockpit/timeshift-dev/docs/PROCEDURES.md /usr/share/cockpit/timeshift/PROCEDURES.md`
  (ainda pendente nesta máquina).