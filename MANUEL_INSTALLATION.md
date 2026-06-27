# Manuel d'installation et d'utilisation — SI-SMQ

## Prérequis

**Docker Desktop** doit être installé (gratuit) : https://www.docker.com/products/docker-desktop/
C'est le seul logiciel à installer manuellement — il fournit Docker et Docker Compose. Une fois installé, lancer Docker Desktop avant l'étape suivante.

## Démarrage

Depuis la racine du projet :

```bash
docker-compose up --build
```

Cela démarre automatiquement tous les composants nécessaires : base de données PostgreSQL, cache Redis, stockage de documents MinIO, backend (API) et frontend. Les tables, les comptes de démonstration et la configuration de l'IA sont initialisés automatiquement au premier démarrage — aucune autre action n'est requise.

Une fois les services lancés :

- **Application** : http://localhost:5173
- **Documentation API (Swagger)** : http://localhost:8000/docs
- **Vérification rapide du backend** : http://localhost:8000/health → doit répondre `{"status": "ok"}`

## Comptes de connexion

Les comptes suivants sont créés automatiquement au premier démarrage et permettent de tester l'application selon différents rôles.

| Email | Mot de passe | Rôle |
|---|---|---|
| admin@si-smq.local | my_password | Direction (administrateur) |
| directeur@si-smq.local | demo1234 | Direction |
| leila.bensalem@si-smq.local | demo1234 | Préparateur — Responsable Qualité |
| karim.hadj@si-smq.local | demo1234 | Auditeur Interne |
| sofia.amrani@si-smq.local | demo1234 | Auditeur Interne |
| ahmed.benali@si-smq.local | demo1234 | Préparateur — Chef d'équipe |
| nadia.ferhat@si-smq.local | demo1234 | Préparateur — Directrice de thèse |
| fatima.kaci@si-smq.local | demo1234 | Préparateur — Responsable financière |
| yacine.tlemcani@si-smq.local | demo1234 | Préparateur — Doctorant |
| amira.saadi@si-smq.local | demo1234 | Préparateur — Doctorante |

---

## Annexe (non nécessaire pour une utilisation standard)

### Architecture

| Composant | Rôle |
|---|---|
| backend (FastAPI/Python) | API REST, logique métier, authentification JWT, analyse IA |
| frontend (React + Vite) | Interface web |
| PostgreSQL 16 | Base de données principale |
| Redis 7 | Cache applicatif |
| MinIO | Stockage des documents (PDF, Word, Excel...), compatible S3 |

### Console MinIO

Pour consulter directement les fichiers stockés : http://localhost:9001 — identifiants `minioadmin` / `minioadmin`. Le bucket `si-smq-documents` est créé automatiquement dès la première opération sur un document.

### Connexion Google OAuth (optionnelle)

Désactivée par défaut — la connexion classique par email/mot de passe (comptes ci-dessus) suffit pour tout tester. Pour l'activer, renseigner `GOOGLE_CLIENT_ID` et `GOOGLE_CLIENT_SECRET` dans un fichier `backend/.env` (voir `backend/.env.example`), puis ajouter `env_file: [./backend/.env]` au service `backend` dans `docker-compose.yml`.

### Lancement en mode développement (sans Docker)

Backend :
```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows (source venv/bin/activate sur Linux/Mac)
pip install -r requirements.txt
cp .env.example .env           # adapter POSTGRES_HOST=localhost
uvicorn app.main:app --reload --port 8000
```
Nécessite PostgreSQL, Redis et MinIO disponibles (ex. via `docker-compose up db redis minio`).

Frontend :
```bash
cd frontend
npm install
npm run dev
```

### Dépannage courant

| Problème | Solution |
|---|---|
| `docker-compose up` échoue | Vérifier qu'aucun service local n'occupe déjà les ports 5432, 6379, 8000, 9000, 9001, 5173 |
| Backend ne se connecte pas à PostgreSQL | Vérifier que `POSTGRES_HOST=db` (déjà configuré par défaut dans docker-compose.yml) |
| Erreur lors de l'upload d'un document | Vérifier que le service `minio` est bien démarré (`docker-compose logs minio`) |
| Page blanche sur le frontend | Vérifier les logs du backend : `docker-compose logs backend` |
