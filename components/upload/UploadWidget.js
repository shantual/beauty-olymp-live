import { useMemo, useState } from 'react';

function uploadWithProgress(url, file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.setRequestHeader('Content-Type', file.type);

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      const progress = Math.round((event.loaded / event.total) * 100);
      onProgress(progress);
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.send(file);
  });
}

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
        const presignRes = await fetch('/api/uploads/presign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            originalFileName: file.name,
            mimeType: file.type,
            size: file.size,
            userId,
            submissionId,
            fileKind,
          }),
        });

        const presignData = await presignRes.json();
        if (!presignRes.ok) {
          throw new Error(presignData.error || 'Failed to get upload URL');
        }

        setItems((prev) => prev.map((item) => item.localId === localId ? { ...item, status: 'uploading' } : item));

        await uploadWithProgress(presignData.uploadUrl, file, (progress) => {
          setItems((prev) => prev.map((item) => item.localId === localId ? { ...item, progress } : item));
        });

        const completeRes = await fetch('/api/uploads/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            objectKey: presignData.objectKey,
            originalFileName: file.name,
            size: file.size,
            mimeType: file.type,
            userId,
            submissionId,
          }),
        });

        const completeData = await completeRes.json();
        if (!completeRes.ok) {
          throw new Error(completeData.error || 'Failed to finalize upload');
        }

        setItems((prev) => prev.map((item) => item.localId === localId ? {
          ...item,
          progress: 100,
          status: 'done',
          record: completeData.record,
        } : item));

        onUploaded?.(completeData.record);
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
