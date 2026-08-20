# Contributing

Obrigado por contribuir para o Cockpit Timeshift.

## Processo de desenvolvimento

Todo o desenvolvimento acontece na instalação **DEV**
(`/usr/share/cockpit/timeshift-dev/`); a instalação **Stable**
(`/usr/share/cockpit/timeshift/`) nunca é editada directamente.

O procedimento completo está documentado em
[docs/PROCEDURES.md](docs/PROCEDURES.md) — lê-o antes de começar:

1. Confirma o estado (`git status`) e que estás na DEV.
2. Sincroniza com o servidor (`git fetch --prune origin` antes de
   `git reset --hard origin/master`).
3. Cria uma branch a partir de `master`.
4. Faz commit, abre PR para `master`, valida no CI (1 review + checks).
5. Merge squash como `LordFader`; volta à conta normal depois.
6. Sincroniza as máquinas após o merge.
7. Promove DEV → Stable apenas com `sudo sh timeshift-dev/install.sh`.

## Checks obrigatórios

Antes de commitar, todos os checks devem passar:

```bash
npm run lint
node --check parsers.js timeshift.js
node --test test/parsers.test.js
sh -n install.sh
```

## Convenções de código

Ver [AGENTS.md](AGENTS.md) (padrões de estilo JS/CSS/HTML e regras do
projecto) e [docs/VERSIONING.md](docs/VERSIONING.md) (convenção de
versões).

## Reportar problemas

Usa o GitHub Issues do repositório `LordFader/cockpit-timeshift`.
