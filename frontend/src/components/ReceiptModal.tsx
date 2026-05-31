import { X, Printer } from 'lucide-react';
import { Receipt } from '../types/domain';
import { Button } from './Button';

export function ReceiptModal({ receipt, onClose }: { receipt: Receipt | null; onClose: () => void }) {
  if (!receipt) {
    return null;
  }

  return (
    <div className="modalBackdrop" role="dialog" aria-modal="true">
      <article className="modal receipt">
        <header className="modalHeader">
          <div>
            <p className="eyebrow">Чек оплаты</p>
            <h2>{receipt.number}</h2>
          </div>
          <Button variant="ghost" icon={<X size={18} />} aria-label="Закрыть" onClick={onClose} />
        </header>
        <div className="receiptMeta">
          <span>{receipt.carSnapshot?.title}</span>
          <span>{new Date(receipt.issuedAt).toLocaleString('ru-RU')}</span>
        </div>
        <div className="receiptLines">
          {receipt.lines.map((line, index) => (
            <div key={`${line.label}-${index}`}>
              <span>{line.label}</span>
              <strong>{line.amount.toLocaleString('ru-RU')} ₽</strong>
            </div>
          ))}
        </div>
        <footer className="receiptTotal">
          <span>Итого</span>
          <strong>{receipt.totalAmount.toLocaleString('ru-RU')} ₽</strong>
        </footer>
        <Button variant="secondary" icon={<Printer size={18} />} onClick={() => window.print()}>
          Печать
        </Button>
      </article>
    </div>
  );
}
