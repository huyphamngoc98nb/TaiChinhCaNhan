import { useState, useEffect } from 'react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { ReceiptStorageService } from '@/core/files/receipt-storage';

interface Props {
  existingPath?: string | null;
  onImageSelected: (base64: string) => void;
}

export function ReceiptCapture({ existingPath, onImageSelected }: Props) {
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (existingPath) {
      ReceiptStorageService.getReceiptDataUrl(existingPath).then(data => {
        if (data) setPreview(data);
      });
    }
  }, [existingPath]);

  const handleCapture = async () => {
    try {
      const image = await Camera.getPhoto({
        quality: 60,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Prompt
      });

      if (image.base64String) {
        onImageSelected(image.base64String);
        setPreview(`data:image/${image.format};base64,${image.base64String}`);
      }
    } catch (e) {
      // User cancelled or error
      console.log('Camera error/cancelled', e);
    }
  };

  return (
    <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Receipt (Optional)</label>
      
      {preview && (
        <div style={{ position: 'relative', width: '100%', height: '150px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)' }}>
          <img src={preview} alt="Receipt preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      )}

      <button 
        type="button"
        onClick={handleCapture}
        style={{ padding: '10px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer' }}
      >
        {preview ? 'Change Receipt' : 'Capture / Select Receipt'}
      </button>
    </div>
  );
}
