# Cockpit Timeshift — Procedimentos de Desenvolvimento e Promoção

> **Documento operacional canónico** (versão versionada na DEV).
>
> Este ficheiro define o procedimento padrão para desenvolver, testar e
> promover alterações da versão **Timeshift Dev** para a versão **Timeshift Stable**.
>
> **Regra principal:** nunca desenvolver directamente na versão Stable.

---

## 1. Estrutura das instalações

Existem duas instalações independentes no Cockpit:

```text
/usr/share/cockpit/timeshift/
└── Stable

/usr/share/cockpit/timeshift-dev/
└── Development
```

### Stable

```text
/usr/share/cockpit/timeshift/
├── index.html      (build de produção, sem marcadores DEV)
├── manifest.json   (tool "timeshift", label "Timeshift")
├── timeshift.js
├── timeshift.css
└── README.md / PROCEDURES.md
```

### Dev

```text
/usr/share/cockpit/timeshift-dev/
├── README.md
├── LICENSE
├── CHANGELOG.md
├── install.sh
├── index.html
├── manifest.json
├── timeshift.js
├── timeshift.css
└── docs/
```

---

# 2. Regra de ouro

## NÃO editar directamente:

```text
/usr/share/cockpit/timeshift/
```

## Desenvolver exclusivamente em:

```text
/usr/share/cockpit/timeshift-dev/
```

A Stable é considerada a versão de referência funcional e deve permanecer
utilizável.

---

# 3. Antes de começar uma alteração

### Checklist

* [ ] Confirmar que a Stable está funcional.
* [ ] Confirmar que a DEV está acessível no Cockpit.
* [ ] Confirmar que estou a editar `/usr/share/cockpit/timeshift-dev/`.
* [ ] Confirmar que não estou a editar `/usr/share/cockpit/timeshift/`.
* [ ] Fazer `git status`.

Comandos:

```bash
cd /usr/share/cockpit/timeshift-dev
git status
```

---

# 4. Sincronizar a máquina com o servidor

O fetch antes de qualquer reset é **obrigatório** — sem ele o
`origin/master` local fica com um ref stale.

```bash
git fetch --prune origin
git reset --hard origin/master
git branch -vv
```

Confirmar que `master` aponta para o topo do servidor.

---

# 5. Desenvolvimento

Todas as alterações devem ser feitas na DEV, numa branch a partir de
`master`:

```bash
git switch -c feat/nome-da-funcionalidade
```

Exemplos usados no projecto:

```text
feat/gui-parity-device-restore
feat/gui-parity-schedule
feat/gui-parity-filters
feat/prod-build-strip-dev-markers
feat/settings-mode-validation
```

Normalmente os ficheiros alterados são:

```text
/usr/share/cockpit/timeshift-dev/index.html
/usr/share/cockpit/timeshift-dev/timeshift.js
/usr/share/cockpit/timeshift-dev/timeshift.css
/usr/share/cockpit/timeshift-dev/docs/
```

### Identificação DEV

O `manifest.json` da DEV identifica explicitamente a aplicação como
`Timeshift Dev` (tool `timeshift-dev`), e o `index.html`/`timeshift.css`
contêm marcadores DEV (`<span class="dev-badge">DEV</span>`, título
`Timeshift · Cockpit · DEV`, regra `.dev-badge`).

Não remover a identificação DEV enquanto o código estiver em
desenvolvimento. A remoção é feita automaticamente no momento da promoção.

---

# 6. Testes obrigatórios

Depois de cada alteração:

### Interface

* [ ] Overview abre correctamente.
* [ ] Snapshots abre correctamente.
* [ ] Schedule abre correctamente.
* [ ] Settings abre correctamente.
* [ ] Os sub-tabs não ficam bloqueados.
* [ ] A navegação funciona depois de uma operação.
* [ ] Não existem erros JavaScript no browser.

### Timeshift

```bash
sudo /usr/bin/timeshift --version
sudo /usr/bin/timeshift --list
```

A DEV deve conseguir ler a informação real do Timeshift.

---

# 7. Operações destrutivas

As operações seguintes actuam sobre o sistema real:

```text
Create
Delete
Delete all
Restore
```

Confirmar que estou na **Timeshift Dev** e que a operação é realmente
necessária. Nunca executar `Delete all` apenas para testar a interface.
Nunca testar `Restore` sem saber exactamente qual o snapshot seleccionado.

---

# 8. Verificação final da DEV

Antes de commit:

```bash
node --check timeshift.js
sh -n install.sh        # se install.sh foi alterado
git diff --stat
git diff
```

Checklist:

* [ ] Código funciona.
* [ ] Create testado.
* [ ] Delete testado.
* [ ] Restore testado ou conscientemente não testado.
* [ ] Schedule testado, se foi alterado.
* [ ] Console sem erros relacionados com a aplicação.
* [ ] Stable continua intacta.

---

# 9. Commit e Push

```bash
git add index.html timeshift.js timeshift.css manifest.json docs/ CHANGELOG.md
git status
git commit -m "feat: descrição da alteração"
git push -u origin feat/nome-da-funcionalidade
```

---

# 10. Pull Request e CI

Criar PR para `master`:

```bash
gh pr create \
  --repo LordFader/cockpit-timeshift \
  --base master \
  --head feat/nome-da-funcionalidade \
  --title "feat: ..." \
  --body "<!-- resumo -->"
```

Verificar o CI:

```bash
gh pr checks NUMERO --repo LordFader/cockpit-timeshift
```

O `master` está protegido: exige 1 review + CI `syntax-check` a passar.
Enquanto o CI não passar, o merge é bloqueado pela política da branch.

---

# 11. Aprovação e merge

```bash
gh pr review NUMERO --repo LordFader/cockpit-timeshift --approve

gh auth switch -u LordFader
gh pr merge NUMERO \
  --repo LordFader/cockpit-timeshift --squash --delete-branch
gh auth switch -u PGodinho
```

Voltar sempre à conta ativa normal após o merge.

---

# 12. Sincronizar as máquinas após o merge

Em cada máquina de desenvolvimento (incluindo a do LordFader):

```bash
cd /usr/share/cockpit/timeshift-dev
git fetch --prune origin
git reset --hard origin/master
git pull --ff-only origin master
git log --oneline -3
```

> Lembrete: o fetch antes do reset é o que evita o problema do ref stale
> (já aconteceu: reset apontou para `cb45021` em vez do topo real).

---

# 13. Promoção DEV → Stable

Só promover depois de a DEV estar validada e mergida em `master`.

### Passo 1 — Backup da Stable

```bash
sudo cp -a \
  /usr/share/cockpit/timeshift \
  /usr/share/cockpit/timeshift-backup-$(date +%Y%m%d-%H%M%S)
```

### Passo 2 — Instalar a build de produção

O `install.sh` da DEV gera a build de produção a partir dos ficheiros DEV,
removendo os marcadores exclusivos do ambiente de desenvolvimento:

```bash
# Regenerar bundles i18n se alterou ficheiros .po
node scripts/po2js.js
sudo sh /usr/share/cockpit/timeshift-dev/install.sh
```

Transformações aplicadas pelo `install.sh`:

- `manifest.json`: tool `timeshift-dev` → `timeshift`; label
  `Timeshift Dev` → `Timeshift` (o separador passa a chamar-se **Timeshift**).
- `index.html`: título `Timeshift · Cockpit · DEV` → `Timeshift · Cockpit` e
  badge `<span class="dev-badge">DEV</span>` removido.
- `timeshift.css`: regra `.dev-badge` (exclusiva do DEV) eliminada.
- `timeshift.js`: copiado tal qual (não tem marcadores DEV).

Os ficheiros em `/usr/share/cockpit/timeshift-dev/` ficam intactos.

> **Regra:** nunca copiar manualmente os ficheiros DEV para a STABLE sem
> aplicar estas transformações, caso contrário o separador aparece como
> `Timeshift Dev` e o badge `DEV` fica visível na versão estável.

---

# 14. Verificar a Stable depois da promoção

Abrir `Cockpit → Timeshift` (hard refresh se necessário).

Confirmar:

* [ ] O separador diz **Timeshift** (não "Timeshift Dev").
* [ ] Não existe badge `DEV` no topo da página.
* [ ] Overview funciona.
* [ ] Snapshots funciona.
* [ ] Create funciona.
* [ ] Delete funciona.
* [ ] Restore funciona.
* [ ] Schedule funciona, se aplicável.
* [ ] Settings funciona.
* [ ] Não existem erros JavaScript.

Confirmar directamente:

```bash
sudo /usr/bin/timeshift --list
```

---

# 15. Se a promoção correr mal

Restaurar o backup:

```bash
sudo rm -rf /usr/share/cockpit/timeshift
sudo mv /usr/share/cockpit/timeshift-backup-* /usr/share/cockpit/timeshift
```

Depois verificar e reabrir `Cockpit → Timeshift`.

---

# 16. Após uma promoção bem sucedida

Se a Stable estiver confirmada como funcional:

```bash
sudo rm -rf /usr/share/cockpit/timeshift-backup-*
```

Antes de apagar o backup, confirmar todos os pontos da verificação.

---

# 17. Actualização da documentação e versionamento

Quando uma alteração for promovida:

- Actualizar `/usr/share/cockpit/timeshift-dev/CHANGELOG.md` (versão, data,
  alterações, bugs corrigidos, funcionalidades).
- Se o procedimento mudar, actualizar `docs/`.
- A versão publicada deve ser identificável no Git através de uma tag:

```bash
git tag v0.1.1-beta
git push origin v0.1.1-beta
```

---

# 18. Fluxo resumido

```text
DEV (branch/PR/CI/squash em master)
        ↓
  Sincronizar máquinas (fetch + reset --hard origin/master)
        ↓
  Backup da Stable
        ↓
  sudo sh timeshift-dev/install.sh   ← build de produção (sem marcadores DEV)
        ↓
  Testar Stable (separador "Timeshift")
        ↓
  release (tag)
```

---

# 19. Regra final

> **DEV primeiro. Stable depois.**

Nunca fazer desenvolvimento experimental directamente em
`/usr/share/cockpit/timeshift/`.

A Stable deve estar sempre disponível como fallback.

---

## Comandos essenciais

### Estado DEV

```bash
cd /usr/share/cockpit/timeshift-dev
git status
```

### Sincronizar com servidor

```bash
git fetch --prune origin
git reset --hard origin/master
```

### Timeshift

```bash
sudo timeshift --version
sudo timeshift --list
```

### Backup Stable

```bash
sudo cp -a /usr/share/cockpit/timeshift \
           /usr/share/cockpit/timeshift-backup-$(date +%Y%m%d-%H%M%S)
```

### Promoção

```bash
sudo sh /usr/share/cockpit/timeshift-dev/install.sh
```

### Rollback

```bash
sudo rm -rf /usr/share/cockpit/timeshift
sudo mv /usr/share/cockpit/timeshift-backup-* /usr/share/cockpit/timeshift
```

---

**Estado:** documento operacional canónico (versão DEV).

**Princípio:** preservar sempre uma versão funcional conhecida antes de
promover alterações.