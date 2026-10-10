"""Preset PNGs use the existing user-global attachment and category sync path."""
from __future__ import annotations

from base64 import b64decode

from sqlalchemy import select
from test_category_parent_links import categories, create, full_snapshot
from test_category_parent_links import workspace as workspace  # noqa: F401

from src.models import AttachmentFile
from src.routers import attachments


def test_preset_icon_upload_dedup_and_sync_without_ledger(workspace, tmp_path, monkeypatch):
    client, token, _, _, sessions = workspace
    monkeypatch.setattr(attachments, "_attachment_root", lambda: tmp_path)
    png = b64decode(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aXioAAAAASUVORK5CYII="
    )
    headers = {"Authorization": f"Bearer {token}"}
    response = client.post("/api/v1/attachments/category-icons/upload", headers=headers,
                           files={"file": ("gas.png", png, "image/png")})
    assert response.status_code == 200, response.text
    out = response.json()
    again = client.post("/api/v1/attachments/category-icons/upload", headers=headers,
                        files={"file": ("gas.png", png, "image/png")})
    assert again.status_code == 200, again.text
    assert again.json()["file_id"] == out["file_id"]
    with sessions() as db:
        row = db.scalar(select(AttachmentFile).where(AttachmentFile.id == out["file_id"]))
        assert row is not None
        assert row.ledger_id is None
        assert row.attachment_kind == "category_icon"
    category_id = create(workspace, "天然气", icon="category", icon_type="custom",
                         custom_icon_path="", icon_cloud_file_id=out["file_id"],
                         icon_cloud_sha256=out["sha256"])
    category = next(c for c in categories(workspace) if c["id"] == category_id)
    assert category["icon_type"] == "custom"
    assert category["icon_cloud_file_id"] == out["file_id"]
    snapshot = full_snapshot(workspace)
    assert out["file_id"] in str(snapshot)
    image = client.get(f"/api/v1/attachments/{out['file_id']}", headers=headers)
    assert image.status_code == 200
    assert image.content == png
