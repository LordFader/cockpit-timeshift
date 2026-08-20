# Cockpit Timeshift Dev — Git Workflow

Este documento define o procedimento normal para desenvolver a versão DEV
do Cockpit Timeshift.

A versão DEV é desenvolvida directamente em:

    /usr/share/cockpit/timeshift-dev/

A versão estável encontra-se em:

    /usr/share/cockpit/timeshift/

## Regra principal

NUNCA desenvolver directamente em:

    /usr/share/cockpit/timeshift/

Apenas a versão DEV deve ser modificada durante o desenvolvimento.

A versão estável só recebe alterações depois de estas serem testadas
e aprovadas.

---

# 1. Estado inicial

Entrar no projecto:

    cd /usr/share/cockpit/timeshift-dev

Verificar:

    pwd

Deve apresentar:

    /usr/share/cockpit/timeshift-dev

Verificar Git:

    git status

---

# 2. Antes de qualquer alteração

Executar:

    git status

Confirmar que estamos no branch canónico:

    git branch --show-current

O branch normal de desenvolvimento é:

    master

Se houver alterações locais não relacionadas com o trabalho actual,
NÃO continuar sem perceber primeiro o que são.

---

# 3. Sincronizar a máquina

Antes de começar, alinhar sempre com o servidor (o fetch é obrigatório
antes de um reset, senão o `origin/master` local fica com um ref stale
como já aconteceu):

    git fetch --prune origin
    git reset --hard origin/master
    git branch -vv

Confirmar que `master` aponta para o topo do servidor
(ex.: `[origin/master]`).

---

# 4. Criar uma branch para uma alteração

Para uma nova funcionalidade:

    git switch -c feat/nome-da-funcionalidade

Para um bug:

    git switch -c fix/nome-do-bug

Exemplos reais usados:

    git switch -c feat/gui-parity-filters
    git switch -c feat/settings-mode-validation

---

# 5. Fazer alterações

Alterar apenas os ficheiros necessários.

Principais ficheiros:

    index.html
    timeshift.js
    timeshift.css
    manifest.json

Documentação:

    docs/

Não alterar ficheiros do Cockpit ou Timeshift do sistema.

---

# 6. Testar JavaScript

Antes de fazer commit:

    node --check timeshift.js

Se o comando terminar sem output, a sintaxe JavaScript está correcta.

Também validar o script de instalação:

    sh -n install.sh

---

# 7. Verificar ficheiros modificados

Executar:

    git status

Depois:

    git diff --stat

E:

    git diff

Nunca fazer commit sem verificar o diff.

---

# 8. Testar no Cockpit

Recarregar o Cockpit no browser.

Abrir:

    Timeshift Dev

Confirmar:

- Overview carrega
- versão do Timeshift aparece
- snapshots aparecem
- Create funciona
- Delete funciona
- Restore funciona
- Schedule não está quebrado
- Settings carregam
- não existem erros JavaScript no browser

---

# 9. Confirmar comunicação com Timeshift

No servidor:

    sudo timeshift --version

E:

    sudo timeshift --list

Confirmar que os dados apresentados pela aplicação correspondem
aos dados reais.

---

# 10. Commit

Adicionar apenas os ficheiros pretendidos:

    git add index.html timeshift.js timeshift.css manifest.json

Ou, se houver documentação:

    git add index.html timeshift.js timeshift.css manifest.json docs/

Verificar:

    git status

Depois:

    git commit -m "feat: descrição curta"

Exemplos:

    git commit -m "feat: add snapshot progress feedback"

    git commit -m "fix: refresh state before destructive operations"

    git commit -m "docs: improve development workflow"

---

# 11. Push

Depois do commit:

    git push -u origin nome-da-branch

Exemplo real usado:

    git push -u origin feat/settings-mode-validation

---

# 12. Pull Request

Criar Pull Request para o branch `master` (via GitHub CLI):

    gh pr create \
      --repo LordFader/cockpit-timeshift \
      --base master \
      --head nome-da-branch \
      --title "feat: ..." \
      --body "<!-- resumo -->"

Não fazer merge directo em `master` sem revisão.

O `master` está protegido: exige 1 review + CI `syntax-check` a passar.

---

# 13. CI

Verificar o estado do CI:

    gh pr checks NUMERO --repo LordFader/cockpit-timeshift

O CI corre:

- `node --check timeshift.js`
- `sh -n install.sh`

Aguardar `syntax-check: pass` antes de aprovar/mergear.

---

# 14. Aprovação e merge

Aprovar:

    gh pr review NUMERO --repo LordFader/cockpit-timeshift --approve

Fazer merge com squash (a conta que mergeia tem de ter permissão;
alternar conta se necessário):

    gh auth switch -u LordFader
    gh pr merge NUMERO \
      --repo LordFader/cockpit-timeshift --squash --delete-branch
    gh auth switch -u PGodinho

Voltar sempre à conta ativa normal após o merge.

---

# 15. Sincronizar a máquina após o merge

O fetch antes do reset é obrigatório (senão o `origin/master` local fica
com um ref stale, como já aconteceu na máquina do LordFader):

    git checkout master
    git fetch --prune origin
    git reset --hard origin/master
    git pull --ff-only origin master
    git log --oneline -3

Fazer o mesmo em qualquer outra máquina de desenvolvimento.

---

# 16. Release para versão estável

A versão DEV deve estar completamente testada e mergida em `master`
antes de promover para a versão estável.

Consultar:

    docs/RELEASE_WORKFLOW.md

---

# REGRAS DE SEGURANÇA

Nunca executar:

    rm -rf /usr/share/cockpit/timeshift/

sem confirmação explícita.

Nunca fazer:

    git reset --hard

sem verificar primeiro o estado do repositório.

Nunca desenvolver directamente em:

    /usr/share/cockpit/timeshift/

Nunca fazer alterações ao sistema apenas para "fazer funcionar"
o código sem perceber primeiro a causa.

---

# CHECKLIST RÁPIDO

[ ] Estou em /usr/share/cockpit/timeshift-dev
[ ] git fetch --prune origin
[ ] git reset --hard origin/master
[ ] git status verificado
[ ] branch de feature/fix criada a partir de master
[ ] alteração implementada
[ ] node --check timeshift.js
[ ] sh -n install.sh (se install.sh mudou)
[ ] git diff revisto
[ ] Cockpit Dev testado
[ ] Create testado
[ ] Delete testado
[ ] Restore testado
[ ] Schedule verificado
[ ] Settings verificados
[ ] console do browser sem erros relevantes
[ ] commit criado
[ ] push efectuado
[ ] PR criado para master
[ ] CI syntax-check pass
[ ] review + merge squash
[ ] master local sincronizado (fetch + reset --hard + pull --ff-only)
[ ] máquinas DEV sincronizadas