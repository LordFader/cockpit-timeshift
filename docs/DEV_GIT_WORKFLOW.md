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

# 2. Antes de começer qualquer alteração

Executar:

    git status

Depois:

    git log --oneline -5

Confirmar que estamos na branch correcta:

    git branch --show-current

A branch normal de desenvolvimento deve ser:

    dev

Se houver alterações locais não relacionadas com o trabalho actual,
NÃO continuar sem perceber primeiro o que são.

---

# 3. Criar uma branch para uma alteração significativa

Para uma nova funcionalidade:

    git switch dev
    git pull
    git switch -c feature/nome-da-funcionalidade

Exemplo:

    git switch -c feature/progress-dialog

Para um bug:

    git switch dev
    git pull
    git switch -c fix/nome-do-bug

Exemplo:

    git switch -c fix/schedule-refresh

---

# 4. Fazer alterações

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

# 5. Testar JavaScript

Antes de fazer commit:

    node --check timeshift.js

Se o comando terminar sem output, a sintaxe JavaScript está correcta.

---

# 6. Verificar ficheiros modificados

Executar:

    git status

Depois:

    git diff --stat

E:

    git diff

Nunca fazer commit sem verificar o diff.

---

# 7. Testar no Cockpit

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

# 8. Confirmar comunicação com Timeshift

No servidor:

    sudo timeshift --version

E:

    sudo timeshift --list

Confirmar que os dados apresentados pela aplicação correspondem
aos dados reais.

---

# 9. Commit

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

# 10. Push

Depois do commit:

    git push -u origin nome-da-branch

Exemplo:

    git push -u origin feature/progress-dialog

---

# 11. Pull Request

Criar Pull Request para:

    dev

Não fazer merge directamente em main sem revisão.

---

# 12. Depois de aprovado

Actualizar:

    git switch dev
    git pull

Testar novamente.

Só depois preparar uma release.

---

# 13. Release para versão estável

A versão DEV deve estar completamente testada antes de copiar
para a versão estável.

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
[ ] git status verificado
[ ] branch correcta
[ ] branch de feature/fix criada
[ ] alteração implementada
[ ] node --check timeshift.js
[ ] git diff revisto
[ ] Cockpit Dev testado
[ ] Create testado
[ ] Delete testado
[ ] Restore testado
[ ] Schedule verificado
[ ] Settings verificados
[ ] console do browser sem erros relevantes
[ ] git status revisto
[ ] commit criado
[ ] push efectuado