import os
import json
from fastapi import APIRouter, UploadFile, File, Form
from services import (
    get_transactions, create_transaction, update_transaction, delete_transaction,
    import_csv_generic, import_icici_csv,
)
from services.pdf_import import parse_pdf_preview, import_pdf_with_mapping
from services.extract_transactions import preview_bank_pdf, import_bank_pdf
from routes.common import serialize

router = APIRouter()


@router.get("/api/transactions")
def api_get_transactions():
    return serialize(get_transactions())


@router.post("/api/transactions")
def api_create_transaction(data: dict):
    return serialize(create_transaction(data))


@router.put("/api/transactions/{tx_id}")
def api_update_transaction(tx_id: int, data: dict):
    return serialize(update_transaction(tx_id, data))


@router.delete("/api/transactions/{tx_id}")
def api_delete_transaction(tx_id: int):
    delete_transaction(tx_id)
    return {"status": "ok"}


@router.post("/api/import")
async def api_import_statement(file: UploadFile = File(...), mapping: str = Form("")):
    os.makedirs("uploads", exist_ok=True)
    file_path = f"uploads/{file.filename}"
    with open(file_path, "wb") as f:
        f.write(await file.read())

    if mapping:
        mapping_dict = json.loads(mapping)
        count = import_csv_generic(file_path, mapping_dict)
        return {"status": "ok", "file": file.filename, "imported": count}
    else:
        import_icici_csv(file_path)
        return {"status": "ok", "file": file.filename}


@router.post("/api/import/pdf-preview")
async def api_import_pdf_preview(file: UploadFile = File(...)):
    os.makedirs("uploads", exist_ok=True)
    file_path = f"uploads/{file.filename}"
    with open(file_path, "wb") as f:
        f.write(await file.read())
    result = parse_pdf_preview(file_path)
    print(f"PDF preview result: {result}")
    return result


@router.post("/api/import/pdf")
async def api_import_pdf(file: UploadFile = File(...), mapping: str = Form("")):
    os.makedirs("uploads", exist_ok=True)
    file_path = f"uploads/{file.filename}"
    with open(file_path, "wb") as f:
        f.write(await file.read())
    mapping_dict = json.loads(mapping)
    count = import_pdf_with_mapping(file_path, mapping_dict)
    return {"status": "ok", "file": file.filename, "imported": count}


@router.post("/api/import/bank-pdf-preview")
async def api_import_bank_pdf_preview(file: UploadFile = File(...)):
    os.makedirs("uploads", exist_ok=True)
    file_path = f"uploads/{file.filename}"
    with open(file_path, "wb") as f:
        f.write(await file.read())
    result = preview_bank_pdf(file_path)
    return result


@router.post("/api/import/bank-pdf")
async def api_import_bank_pdf(file: UploadFile = File(...)):
    os.makedirs("uploads", exist_ok=True)
    file_path = f"uploads/{file.filename}"
    with open(file_path, "wb") as f:
        f.write(await file.read())
    count = import_bank_pdf(file_path)
    return {"status": "ok", "file": file.filename, "imported": count}
