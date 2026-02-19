import { useMemo, useState } from 'react';

export default function UploadWidget({
  userId,
  submissionId,
  fileKind,
  label,
  accept,
  onUploaded,
  maxFiles = 20,
}) {
  const [items, setItems] = useState([]);

  const uploaded = useMemo(
    () => items.filter((item) => item.status === 'done').map((item) => item.record),
    [items]
  );

  async function handleFilesChange(event) {
    const selected = Array.from(event.target.files || []).slice(0, maxFiles);

    for (const file of selected) {
      const localId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

      // создаем запись в списке
      setItems((prev) => [
        ...prev,
        { localId, name: file.name, progress: 0, status: 'uploading' },
      ]);

      try {
        // помечаем как uploading
        setItems((prev) =>
          prev.map((item) =>
            item.localId === localId ? { ...item, status: 'uploading', progress: 1 } : item
          )
        );

        const form = new FormData();
        form.append('file', file);
        form.append('userId', userId);
        form.append('submissionId', submissionId);
        form.append('fileKind', fileKind);
        form.append('originalFileName', file.name);
        form.append('clientMimeType', file.type || '');


        const uploadRes = await fetch('/api/uploads/upload', {
          method: 'POST',
          body: form,
        });

        // Важно: иногда сервер может вернуть не-JSON при 500, поэтому страхуемся
        let uploadData = null;
        try {
          uploadData = await uploadRes.json();
        } catch {
          uploadData = null;
        }

        if (!uploadRes.ok) {
          const errMsg = uploadData?.error || `Upload failed with status ${uploadRes.status}`;
          throw new Error(errMsg);
        }

        const rawRecord = uploadData?.record || {};

const record = {
  ...rawRecord,
  // гарантируем, что есть ссылка на файл
  objectUrl:
    rawRecord.objectUrl ||          // если бэкенд вернул camelCase
    rawRecord.object_url ||         // если snake_case из Supabase
    uploadData?.objectUrl ||        // поле из upload.js
    uploadData?.url ||              // ещё fallback
    null,
  url: rawRecord.url || uploadData?.url || null,
  key: rawRecord.key || uploadData?.key || null,
  originalFileName:
    rawRecord.originalFileName ||
    rawRecord.original_name ||
    file.name,
  size: rawRecord.size ?? file.size,
  mimeType: rawRecord.mimeType || rawRecord.mime || file.type,
  userId,
  submissionId,
  fileKind,
};



        setItems((prev) =>
          prev.map((item) =>
            item.localId === localId
              ? { ...item, progress: 100, status: 'done', record }
              : item
          )
        );

        onUploaded?.(record);
      } catch (error) {
        setItems((prev) =>
          prev.map((item) =>
            item.localId === localId
              ? { ...item, status: 'error', error: error?.message || 'Upload failed' }
              : item
          )
        );
      }
    }

    event.target.value = '';
  }

  return (
    <div className="card">
      <h4>{label}</h4>
      <input type="file" accept={accept} multiple onChange={handleFilesChange} />
      <small>Загружено: {uploaded.length}</small>
      <ul>
        {items.map((item) => (
          <li key={item.localId}>
            {item.name} - {item.status}
            {item.status === 'uploading' || item.status === 'done' ? ` (${item.progress}%)` : ''}
            {item.error ? ` - ${item.error}` : ''}
          </li>
        ))}
      </ul>
    </div>
  );
}
