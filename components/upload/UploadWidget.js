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
      setItems((prev) => [...prev, { localId, name: file.name, progress: 0, status: 'presign' }]);

      try {
        setItems((prev) => prev.map((item) =>
  item.localId === localId ? { ...item, status: 'uploading', progress: 1 } : item
));

const form = new FormData();
form.append('file', file);
form.append('userId', userId);
form.append('submissionId', submissionId);
form.append('fileKind', fileKind);

const uploadRes = await fetch('/api/uploads/upload', {
  method: 'POST',
  body: form,
});

const uploadData = await uploadRes.json();
if (!uploadRes.ok) {
  throw new Error(uploadData.error || 'Failed to upload file');
}

// если сервер вернул record (лучший вариант) - используем его
// если вернул только url/key - тоже норм, тогда record соберем минимально
const record = uploadData.record || {
  url: uploadData.url,
  key: uploadData.key,
  originalFileName: file.name,
  size: file.size,
  mimeType: file.type,
  userId,
  submissionId,
  fileKind,
};

setItems((prev) => prev.map((item) =>
  item.localId === localId
    ? { ...item, progress: 100, status: 'done', record }
    : item
));

onUploaded?.(record);

      } catch (error) {
        setItems((prev) => prev.map((item) => item.localId === localId ? {
          ...item,
          status: 'error',
          error: error.message,
        } : item));
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
            {item.name} — {item.status}
            {item.status === 'uploading' || item.status === 'done' ? ` (${item.progress}%)` : ''}
            {item.error ? ` — ${item.error}` : ''}
          </li>
        ))}
      </ul>
    </div>
  );
}
