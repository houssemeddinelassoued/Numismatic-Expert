# Expert Numismatique

Outil de tous les jours pour gérer et expertiser une collection de pièces et de billets, en français, anglais ou arabe (une langue à la fois, arabe en lecture de droite à gauche). Il tourne comme un *artifact* privé sur claude.ai : la page, ses données et ses images y sont stockées, et Claude réalise les expertises depuis la page.

## Fonctionnalités

| Onglet | Rôle |
|---|---|
| **Expertiser** | Expertise par Claude à partir d’une description et de photos (collage Ctrl+V). Sources croisées (Numista, Krause/Pick, ventes publiques, PCGS/NGC/PMG), prix Numista par grade et tirage pris en compte, liens « Vérifier en direct », **double avis** pour les objets de valeur. Chaque expertise est rattachée à son objet et forme un historique. |
| **Collection** | Recherche, filtres (pays, grade, album, vendeur, statut, données à compléter…), tris, vignettes ou liste, fiche complète modifiable avec images, liens, prix Numista par grade, historique des estimations et **étiquettes PDF avec QR code**. |
| **Achat** | Mode téléphone : « Je l’ai déjà ? » par P#, KM#, N# ou texte, variétés proches, ajout rapide avec photo, achats récents et budget du mois. |
| **Tableau de bord** | Valeur estimée, dépenses par mois et budget, écart prix payé / estimation par vendeur, croissance, grades, carte du monde, continents, pays, époques, albums, meilleures affaires, objets les plus précieux, rareté (tirage), données à compléter, liste d’échange. |
| **Import / Export** | Import de l’export CSV Numista (réimport sans doublon), export au format Numista, CSV complet, sauvegarde et restauration JSON. |

Identifiant unique par objet : code pays ISO à 2 lettres + référence catalogue, par exemple `AF-P60b` (Pick), `TN-KM104-1851` (Krause + année pour les pièces) ou `XX-N12345` (Numista).

## Structure

```
cabinet-numismatique.html   page (squelette, onglets, dialogues)
cabinet.css, cabinet-ext.css
cn-logic.js        logique pure : CSV, pays, identifiants, mapping Numista (testable sous Node)
cn-i18n.js, cn-i18n-ext.js, cn-content.js   textes FR/EN/AR, grades, guide, glossaire
cn-core.js         DOM, langue, thème, infobulles, stockage (blocs de 120 objets), images
cn-appraise.js     expertise, double avis, rattachement, traduction
cn-collection.js   collection et fiche objet
cn-dash.js         tableau de bord
cn-buy.js          mode achat
cn-labels.js       étiquettes PDF (jsPDF + qrcode-generator chargés depuis cdnjs)
cn-io.js           import, export, sauvegarde
cn-main.js         démarrage, onglets, réglages, raccourcis, liens #ID
data/world.json    contours des pays (Natural Earth via world-atlas), projetés et indexés par code ISO
tools/numista_sync.js    synchronisation avec l’API Numista (collection, prix par grade)
tools/numista_photos.py  vignettes de catalogue Numista assemblées en planches WebP
tests/             aperçu local, environnement simulé, test de bout en bout
```

## Développement local

```bash
npm install                    # jsdom, pour les tests
npm run preview                # sert le projet sur http://127.0.0.1:8765
# puis ouvrir http://127.0.0.1:8765/tests/preview.html?csv=tests/fixture.csv&tab=dash
npm test -- chemin/vers/export-numista.csv
```

`tests/preview.html` charge l’outil avec un stockage en mémoire (`tests/mock-runtime.js`) ; `tests/fixture.csv` contient des données fictives. Placez vos propres exports dans `tests/.local/`, dossier ignoré par Git.

## Numista

La clé API reste hors du dépôt (par exemple `~/numista-api-key.txt`), le cache aussi (`~/.cabinet-numista-cache`).

```bash
node tools/numista_sync.js pull --cache ~/.cabinet-numista-cache --key ~/numista-api-key.txt
node tools/numista_sync.js sync --cache ~/.cabinet-numista-cache --key ~/numista-api-key.txt --db <export des blocs inv> --out <dossier> --prices 80
node tools/numista_sync.js push --cache ~/.cabinet-numista-cache --key ~/numista-api-key.txt --db <blocs>          # liste les écarts, --apply pour les envoyer
python tools/numista_photos.py fetch <export.csv> ~/.cabinet-numista-cache ~/numista-api-key.txt
python tools/numista_photos.py build <export.csv> ~/.cabinet-numista-cache numista-photos
```

L’offre gratuite de l’API compte 2 000 requêtes par mois : une synchronisation coûte 2 requêtes, un prix par grade 1 requête par émission, une fiche de type 1 requête (photos).

## Données et licences

- Les données et photos Numista sont utilisées dans un projet personnel et privé (licence de l’API Numista, article 8.4) avec la mention « Source : Numista » et les crédits des photos. Le dossier `numista-photos/` n’est pas versionné et l’outil doit rester privé.
- Contours des pays : Natural Earth (domaine public), via le paquet `world-atlas`.
- Les estimations sont indicatives ; faites authentifier les pièces de valeur.
