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

Usar o `install.sh` da DEV para instalar a versão de produção:

    sudo sh /usr/share/cockpit/timeshift-dev/install.sh

O script gera a build de produção a partir dos ficheiros da DEV, aplicando
transformações que removem os marcadores exclusivos do ambiente de
desenvolvimento:

- `manifest.json`: tool `timeshift-dev` → `timeshift`; label
  `Timeshift Dev` → `Timeshift` (o separador passa a chamar-se **Timeshift**).
- `index.html`: título `Timeshift · Cockpit · DEV` → `Timeshift · Cockpit` e
  badge `<span class="dev-badge">DEV</span>` removido.
- `timeshift.css`: regra `.dev-badge` (exclusiva do DEV) eliminada.
- `timeshift.js`: copiado tal qual (não tem marcadores DEV).

Os ficheiros em `/usr/share/cockpit/timeshift-dev/` ficam intactos: a DEV
mantém sempre os marcadores DEV enquanto estiver em desenvolvimento.

> **Regra:** nunca copiar manualmente os ficheiros DEV para a STABLE sem
> aplicar estas transformações, caso contrário o separador aparece como
> `Timeshift Dev` e o badge `DEV` fica visível na versão estável.

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