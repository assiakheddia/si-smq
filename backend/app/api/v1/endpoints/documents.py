from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.document import Document
from app.schemas.document import DocumentCreate, DocumentUpdate, DocumentResponse, DocumentResponseDetail

router = APIRouter()

@router.get("/", response_model=List[DocumentResponse])
def list_documents(db: Session = Depends(get_db)):
    return db.query(Document).all()

@router.post("/upload", response_model=DocumentResponse)
def upload_document(
    file: UploadFile = File(...),
    data: DocumentCreate = Depends(),
    db: Session = Depends(get_db)
):
    # Upload MinIO délégué à document_service
    chemin_minio = f"documents/{file.filename}"
    document = Document(
        **data.model_dump(),
        nom_fichier=file.filename,
        chemin_minio=chemin_minio,
        taille_octets=0,  # sera mis à jour par le service
    )
    db.add(document)
    db.commit()
    db.refresh(document)
    return document

@router.get("/{id}", response_model=DocumentResponseDetail)
def get_document(id: int, db: Session = Depends(get_db)):
    d = db.query(Document).filter(Document.id == id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Document non trouvé")
    return d

@router.put("/{id}", response_model=DocumentResponse)
def update_document(id: int, data: DocumentUpdate, db: Session = Depends(get_db)):
    d = db.query(Document).filter(Document.id == id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Document non trouvé")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(d, key, value)
    db.commit()
    db.refresh(d)
    return d

@router.delete("/{id}")
def delete_document(id: int, db: Session = Depends(get_db)):
    d = db.query(Document).filter(Document.id == id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Document non trouvé")
    # Supprimer de MinIO via document_service
    db.delete(d)
    db.commit()
    return {"message": "Document supprimé"}

@router.get("/{id}/download")
def download_document(id: int, db: Session = Depends(get_db)):
    d = db.query(Document).filter(Document.id == id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Document non trouvé")
    # Générer presigned URL MinIO via document_service
    return {"url": f"https://minio/{d.chemin_minio}?token=presigned"}