import { useEffect, useState } from 'react';
import type { ShareCard } from './shareCard';
import { Confetti } from '../fx/Effects';

interface Props {
  card: ShareCard;
  colors: string[];
  onClose: () => void;
}

export default function ShareModal({ card, colors, onClose }: Props) {
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const download = () => {
    const a = document.createElement('a');
    a.href = card.url;
    a.download = card.fileName;
    a.click();
  };

  const share = async () => {
    const file = new File([card.blob], card.fileName, { type: 'image/png' });
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Try On Batik Nusantara', text: card.text });
        setNote('Terima kasih sudah membagikan!');
        return;
      }
    } catch (err) {
      if ((err as DOMException)?.name === 'AbortError') return;
    }
    download();
    try {
      await navigator.clipboard.writeText(card.text);
      setNote('Browser ini belum bisa membagikan langsung. Foto sudah diunduh dan keterangannya disalin, tinggal tempel di media sosial.');
    } catch {
      setNote('Browser ini belum bisa membagikan langsung. Foto sudah diunduh.');
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal share-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Bagikan foto">
        <div className="polaroid-slot">
          <img src={card.url} alt="Hasil try-on batik" className="share-preview polaroid" />
        </div>
        <div className="share-side">
          <h2>Foto siap!</h2>
          <p className="muted">{card.text}</p>
          <div className="share-actions">
            <button className="btn btn-primary" onClick={share}>
              Bagikan
            </button>
            <button className="btn" onClick={download}>
              Unduh PNG
            </button>
            <button className="btn btn-ghost" onClick={onClose}>
              Foto ulang
            </button>
          </div>
          {note && <p className="share-note">{note}</p>}
        </div>
      </div>
      <Confetti trigger={1} colors={[...colors, '#d9a441', '#fff4dc']} />
    </div>
  );
}
