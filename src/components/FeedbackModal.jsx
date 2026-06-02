import './FeedbackModal.css';

export default function FeedbackModal({
  open,
  onClose,
  variant = 'success',
  title,
  detail,
}) {
  if (!open) return null;

  const icon = variant === 'success' ? '✓' : variant === 'error' ? '!' : 'ℹ';

  return (
    <div
      className="feedback-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="feedback-modal-title"
      onClick={onClose}
    >
      <div
        className={`feedback-modal feedback-modal--${variant}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="feedback-modal__icon" aria-hidden="true">
          {icon}
        </div>
        <h2 id="feedback-modal-title" className="feedback-modal__title">
          {title}
        </h2>
        {detail ? (
          <p className="feedback-modal__detail">{detail}</p>
        ) : null}
        <button type="button" className="feedback-modal__btn" onClick={onClose}>
          Entendido
        </button>
      </div>
    </div>
  );
}
