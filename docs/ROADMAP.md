# Roadmap — Próxima Sessão

> Documento de handoff: recomendações para promover a app Cockpit Timeshift
> de beta para um nível mais profissional.
>
> Estado atual: Fases 1–3 de paridade GUI concluídas + hardening de Settings
> (mode BTRFS/RSYNC, validação executável, retention dropdowns, defaults
> recomendados). R#1 (testes parsers), R#2 (CI + manifest + artefacto),
> R#3 (tag `v0.1.0-beta` + Release) e R#4 (ESLint) concluídos. Master no
> `4ef5c9a` (#12); release `v0.1.0-beta` publicada.

---

## Contexto e verificação rápida

Auditoria feita a 2026-08-20:

- App em vanilla JS/HTML/CSS, sem build system nem package.json.
- CI atual: `node --check timeshift.js` + `sh -n install.sh` (push).
- **Zero testes automatizados** ~~(resolvido — R#1: `test/parsers.test.js`)~~.
- **Sem i18n** (`no po/ dir`), `index.html` com `lang="en"` fixo.
- **Sem ESLint/Prettier** ~~(resolvido — R#4: `eslint.config.js` na CI)~~.
- **Sem tags/releases Git** ~~(resolvido — R#3: tag `v0.1.0-beta` + Release)~~.
- `git-backup.sh` está em `tools/` (marcado opcional no .gitignore).

---

## Recomendações por prioridade

### 1. Testes unitários dos parsers (rede de segurança) — ✅ concluído (PR #10)

`test/parsers.test.js` (Node `node:test`, 13 testes) cobre `parseList`,
`parseHeader`, `readScheduleLevels`, `flattenDevices` e helpers; parsers
extraídos para `parsers.js` partilhado (browser + Node).

### 2. CI mais sólida — ✅ concluído (PR #12)

No `.github/workflows/ci.yml`:

- Testes unitários correm no CI.
- `scripts/validate-manifest.js` valida o `manifest.json` (dev e build de
  produção) no CI.
- `.github/workflows/release.yml` gera artefacto (tar.gz) + Release GitHub
  em tags `v*`.

### 3. Versionamento real (tags + releases GitHub) — ✅ concluído

- Tag `v0.1.0-beta` criada e Release publicada (artefacto de produção).
- `CHANGELOG.md` mantém secções por release (`## vX.Y.Z`).

### 4. ESLint / Prettier (consistência de código) — ✅ concluído (PR #11)

- `eslint.config.js` (flat config), `npm run lint`, job de lint na CI.
- Prettier não configurado (fora de âmbito por agora).

### 5. i18n / traduções

- Integrar o mecanismo gettext do Cockpit (estrutura `po/`, `LINGUAS`,
  ficheiros `.po`, compilação `*.mo`).
- Alargar `lang` dinâmico no `index.html` em vez de `lang="en"` fixo.
- Primeiro alvo: Português (utilizador principal).

### 6. Housekeeping leve — ✅ concluído

- `git-backup.sh` migrado para `tools/`.
- `CONTRIBUTING.md` adicionado (aponta para `docs/PROCEDURES.md`).

---

## Ordem de execução sugerida (maior valor, menor risco)

1. ~~Testes unitários dos parsers~~ ✅
2. ~~ESLint mínimo na CI~~ ✅
3. ~~Tag `v0.1.0-beta` + Release GitHub com artefacto~~ ✅
4. **i18n (PT primeiro).** ← próximo
5. ~~Housekeeping (`tools/`, `CONTRIBUTING.md`)~~ ✅

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