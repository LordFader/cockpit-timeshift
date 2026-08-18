# Cockpit Timeshift — Release Workflow

## Arquitectura

DEV:

    /usr/share/cockpit/timeshift-dev/

STABLE:

    /usr/share/cockpit/timeshift/

A DEV é a área de desenvolvimento.

A STABLE é a versão aprovada para utilização normal.

---

# Regra

Nunca desenvolver diretamente na STABLE.

As alterações seguem:

    DEV
     ↓
    TESTE
     ↓
    APROVAÇÃO
     ↓
    RELEASE
     ↓
    STABLE

---

# Antes da release

Na DEV:

    cd /usr/share/cockpit/timeshift-dev

Verificar:

    git status

    git log --oneline -5

Executar:

    node --check timeshift.js

Testar no Cockpit:

- Overview
- Create
- Delete
- Restore
- Schedule
- Settings

---

# Comparar DEV com STABLE

Executar:

    diff -u \
      /usr/share/cockpit/timeshift/timeshift.js \
      /usr/share/cockpit/timeshift-dev/timeshift.js

Se a alteração for intencional, continuar.

---

# Backup da STABLE

Antes de actualizar:

    sudo cp -a \
      /usr/share/cockpit/timeshift \
      /usr/share/cockpit/timeshift-backup-$(date +%Y%m%d-%H%M%S)

---

# Actualizar STABLE

Copiar apenas os ficheiros aprovados.

Exemplo:

    sudo cp \
      /usr/share/cockpit/timeshift-dev/index.html \
      /usr/share/cockpit/timeshift-dev/manifest.json \
      /usr/share/cockpit/timeshift-dev/timeshift.js \
      /usr/share/cockpit/timeshift-dev/timeshift.css \
      /usr/share/cockpit/timeshift/

---

# Verificação

Verificar:

    ls -la /usr/share/cockpit/timeshift/

Depois abrir o Cockpit e testar a versão STABLE.

---

# Regra importante

A STABLE não é actualizada simplesmente porque a DEV funciona.

A alteração deve primeiro estar:

- testada
- revista
- commitada
- documentada quando necessário

Só depois deve ser promovida.