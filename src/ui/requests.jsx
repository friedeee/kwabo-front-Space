import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { api, db, fullName, requestById, serviceById, userById } from '../api/db.js';
import { DOC_TYPES, PAYMENT_METHODS } from '../data/catalog.js';
import { useFeedback } from './feedback.jsx';
import { Icon } from './Icon.jsx';
import { Logo, Photo, StatusBadge } from './kit.jsx';
import { fmtDate, fmtDateTime, money } from './format.js';

export const requestPath = (r, user) => (user.role === 'USER' ? `/espace/demandes/${r.id}` : `/admin/demandes/${r.id}`);
export const dueInvoiceOf = (r) => db.invoices.find((i) => i.requestId === r.id && i.status === 'due');

/* Ligne de demande avec la photo du service en vignette. */
export function RequestRow({ request: r, user }) {
    const s = serviceById(r.serviceId);
    return (
        <Link className="request-row" to={requestPath(r, user)}>
            <span className="request-thumb"><Photo name={s.image} small /><span className={`request-thumb-icon cat-${s.cat}`}><Icon name={s.icon} size={14} /></span></span>
            <span className="request-row-main">
                <strong>{r.title}</strong>
                <small>{r.tracking} · {r.city} · {fmtDate(r.createdAt)}</small>
            </span>
            <span className="request-row-side">
                {r.urgency === 'urgent' && <span className="badge badge-red"><Icon name="bolt" size={14} />Urgent</span>}
                <StatusBadge status={r.status} />
                <Icon name="chevron-right" size={18} />
            </span>
        </Link>
    );
}

/* Bandeau photo en tête d'une demande. */
export function RequestBanner({ request: r, children }) {
    const s = serviceById(r.serviceId);
    return (
        <section className="request-banner">
            <Photo name={s.image} eager />
            <div className="request-banner-text">
                <span className={`badge-on-photo cat-${s.cat}`}><Icon name={s.icon} size={16} />{s.name}</span>
                <p>{r.tracking} · {r.city} · demandée le {fmtDate(r.createdAt)}</p>
                {children}
            </div>
        </section>
    );
}

export function RequestInfoCard({ request: r }) {
    const s = serviceById(r.serviceId);
    const details = s.fields.filter((f) => r.details?.[f.name]).map((f) => [f.label, r.details[f.name]]);
    const rows = [
        ['Service', s.name], ['Ville', r.city], ['Urgence', r.urgency === 'urgent' ? 'Urgent' : 'Normale'],
        ...(r.budget ? [['Budget indiqué', r.budget]] : []), ['Date de la demande', fmtDate(r.createdAt)], ...details,
    ];
    return (
        <section className="card">
            <h2>Informations</h2>
            <dl className="info-list">{rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
            {r.description && <><h3>Description</h3><p>{r.description}</p></>}
        </section>
    );
}

export function HistoryCard({ request: r }) {
    return (
        <section className="card">
            <h2>Historique</h2>
            <ol className="timeline">
                {[...r.history].reverse().map((h, i) => (
                    <motion.li key={`${h.at}-${i}`} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                        <strong>{h.text}</strong><small>{fmtDateTime(h.at)}</small>
                    </motion.li>
                ))}
            </ol>
        </section>
    );
}

/* Documents : les photos et vidéos montrent une miniature, les autres une icône. */
export function DocumentList({ documents, grid = false }) {
    const { open, toast } = useFeedback();
    const media = documents.filter((d) => d.image);
    const files = documents.filter((d) => !d.image);
    return (
        <>
            {media.length > 0 && (
                <ul className="media-grid">
                    {media.map((d) => (
                        <li key={d.id}>
                            <button type="button" className="media-tile" onClick={() => open(<MediaViewer documents={media} startId={d.id} />, { wide: true })} aria-label={`Voir ${d.name}`}>
                                <Photo name={d.image} small />
                                {d.type === 'video' && <span className="media-play"><Icon name="play" size={22} /></span>}
                                <span className="media-caption"><Icon name={DOC_TYPES[d.type].icon} size={14} />{fmtDate(d.createdAt)}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
            {files.length > 0 && (
                <ul className={`doc-list ${grid ? 'doc-list-grid' : ''}`}>
                    {files.map((d) => (
                        <li className="doc-item" key={d.id}>
                            <span className="tile tile-sm"><Icon name={DOC_TYPES[d.type].icon} size={18} /></span>
                            <span className="doc-item-main"><strong>{d.name}</strong><small>{DOC_TYPES[d.type].label} · {fmtDate(d.createdAt)}</small></span>
                            <button className="icon-btn" type="button" onClick={() => open(<DocumentPreview document={d} />, { wide: true })} aria-label={`Voir ${d.name}`} title="Voir"><Icon name="eye" /></button>
                            <button className="icon-btn" type="button" onClick={() => toast('Démonstration : le vrai fichier se téléchargera ici.')} aria-label={`Télécharger ${d.name}`} title="Télécharger"><Icon name="arrow-down-tray" /></button>
                        </li>
                    ))}
                </ul>
            )}
        </>
    );
}

function DocumentPreview({ document: d }) {
    return (
        <>
            <h2 className="dialog-title" id="dialog-heading">{d.name}</h2>
            <div className="doc-preview"><Icon name={DOC_TYPES[d.type].icon} size={56} /><p><strong>{DOC_TYPES[d.type].label}</strong></p><p className="muted">Aperçu de démonstration : le vrai fichier s'affichera ici.</p></div>
            <p className="muted">Ajouté le {fmtDate(d.createdAt)}</p>
        </>
    );
}

/* Visionneuse des photos et vidéos d'une mission, avec flèches et clavier. */
function MediaViewer({ documents, startId }) {
    const [index, setIndex] = useState(Math.max(0, documents.findIndex((d) => d.id === startId)));
    const d = documents[index];
    const go = (step) => setIndex((index + step + documents.length) % documents.length);
    useEffect(() => {
        const onKey = (event) => {
            if (event.key === 'ArrowRight') go(1);
            if (event.key === 'ArrowLeft') go(-1);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    });
    return (
        <div className="viewer">
            <h2 className="dialog-title" id="dialog-heading">{d.name}</h2>
            <div className="viewer-stage">
                <AnimatePresence mode="wait">
                    <motion.div key={d.id} className="viewer-image" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                        <Photo name={d.image} eager />
                        {d.type === 'video' && <span className="media-play media-play-lg"><Icon name="play" size={34} /></span>}
                    </motion.div>
                </AnimatePresence>
                {documents.length > 1 && <>
                    <button className="viewer-nav viewer-prev" type="button" onClick={() => go(-1)} aria-label="Précédent"><Icon name="chevron-left" size={24} /></button>
                    <button className="viewer-nav viewer-next" type="button" onClick={() => go(1)} aria-label="Suivant"><Icon name="chevron-right" size={24} /></button>
                </>}
            </div>
            <p className="muted">{DOC_TYPES[d.type].label} du {fmtDate(d.createdAt)} · {index + 1} sur {documents.length}{d.type === 'video' ? ' · Démonstration : la vidéo se lira ici.' : ''}</p>
        </div>
    );
}

/* Fil de discussion d'une demande, avec pièce jointe. */
export function Thread({ request: r, user, fill = false }) {
    const messages = api.messagesOf(r.id);
    const mine = user.role === 'USER' ? 'client' : 'team';
    const box = useRef(null);
    const [attachment, setAttachment] = useState('');
    useEffect(() => { if (box.current) box.current.scrollTop = box.current.scrollHeight; }, [messages.length]);
    const send = (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const text = form.elements.text.value.trim();
        const file = form.elements.attachment.files[0];
        if (!text && !file) { form.elements.text.focus(); return; }
        api.sendMessage(requestById(r.id), user, text, file?.name);
        form.reset();
        setAttachment('');
        form.elements.text.focus();
    };
    return (
        <div className={`thread ${fill ? 'thread-fill' : ''}`}>
            <div className="thread-messages" ref={box} role="log" aria-label="Messages de la demande">
                {messages.length === 0 && <p className="muted thread-empty">Aucun message pour le moment. Posez votre question ici.</p>}
                <AnimatePresence initial={false}>
                    {messages.map((m) => (
                        <motion.div key={m.id} className={`bubble ${m.from === mine ? 'bubble-mine' : ''}`} initial={{ opacity: 0, y: 10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}>
                            <span className="bubble-author">{m.author}</span>
                            {m.text && <p>{m.text}</p>}
                            {m.attachment && <span className="bubble-file"><Icon name="paper-clip" size={16} />{m.attachment}</span>}
                            <time dateTime={m.at}>{fmtDateTime(m.at)}</time>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
            {r.status === 'cancelled' ? <p className="notice">Cette demande est annulée : la discussion est fermée.</p> : (
                <form className="thread-form" onSubmit={send} noValidate>
                    {attachment && <p className="attachment-name">Pièce jointe : {attachment}</p>}
                    <div className="thread-form-row">
                        <label className="icon-btn attach" title="Joindre un fichier"><Icon name="paper-clip" /><span className="sr-only">Joindre un fichier</span>
                            <input className="sr-only" type="file" name="attachment" onChange={(event) => setAttachment(event.target.files[0]?.name ?? '')} />
                        </label>
                        <label className="sr-only" htmlFor={`message-${r.id}`}>Votre message</label>
                        <textarea id={`message-${r.id}`} name="text" rows={1} placeholder="Écrivez votre message…"
                            onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); event.currentTarget.form.requestSubmit(); } }} />
                        <button className="btn btn-primary btn-icon" type="submit" aria-label="Envoyer"><Icon name="paper-airplane" size={18} /></button>
                    </div>
                </form>
            )}
        </div>
    );
}

export function InvoiceBadge({ invoice }) {
    const map = {
        due: ['badge-gold', 'clock', 'À payer'], paid: ['badge-green', 'check-circle', 'Payée'],
        cancelled: ['badge-neutral', 'x-circle', 'Annulée'], refunded: ['badge-red', 'arrow-left', 'Remboursée'],
    };
    const [tone, icon, label] = map[invoice.status];
    return <span className={`badge ${tone}`}><Icon name={icon} size={14} />{label}</span>;
}

export function InvoiceView({ invoice: i }) {
    const { close } = useFeedback();
    const user = userById(i.userId);
    return (
        <>
            <div className="invoice">
                <div className="invoice-head"><Logo /><div><h2 className="dialog-title" id="dialog-heading">Facture {i.id}</h2><InvoiceBadge invoice={i} /></div></div>
                <dl className="info-list">
                    <div><dt>Client</dt><dd>{fullName(user)}</dd></div>
                    <div><dt>Date</dt><dd>{fmtDate(i.createdAt)}</dd></div>
                    {i.paidAt && <><div><dt>Payée le</dt><dd>{fmtDate(i.paidAt)}</dd></div><div><dt>Moyen</dt><dd>{PAYMENT_METHODS[i.method]?.label}</dd></div></>}
                    <div><dt>Objet</dt><dd>{i.label}</dd></div>
                </dl>
                <p className="invoice-total"><span>Total</span><strong>{money(i.amount)}</strong></p>
            </div>
            <div className="dialog-actions no-print">
                <button className="btn btn-ghost" type="button" onClick={() => window.print()}><Icon name="printer" size={18} />Imprimer ou PDF</button>
                <button className="btn btn-primary" type="button" onClick={close}>Fermer</button>
            </div>
        </>
    );
}

/* Paiement simulé : choix du moyen, puis page du prestataire (aucune donnée de carte chez KWABO). */
export function PayFlow({ invoiceId }) {
    const { close, toast } = useFeedback();
    const [method, setMethod] = useState(null);
    const i = db.invoices.find((x) => x.id === invoiceId);
    if (method) {
        const m = PAYMENT_METHODS[method];
        return (
            <>
                <h2 className="dialog-title" id="dialog-heading">Page du prestataire</h2>
                <div className="doc-preview"><Icon name={m.icon} size={48} /><p><strong>{m.label} : {money(i.amount)}</strong></p><p className="muted">Démonstration : aucun paiement réel. Ici, le client serait sur la page sécurisée du prestataire.</p></div>
                <div className="dialog-actions">
                    <button className="btn btn-ghost" type="button" onClick={() => { close(); toast('Le paiement a échoué. Aucun montant n\'a été prélevé, vous pouvez réessayer.'); }}>Simuler un échec</button>
                    <button className="btn btn-primary" type="button" data-autofocus onClick={() => { api.payInvoice(i.id, method); close(); toast('Paiement confirmé. Merci !'); }}>Simuler le paiement</button>
                </div>
            </>
        );
    }
    return (
        <>
            <h2 className="dialog-title" id="dialog-heading">Payer {money(i.amount)}</h2>
            <p className="muted">{i.label}</p>
            <form onSubmit={(event) => { event.preventDefault(); setMethod(event.currentTarget.elements.method.value); }} noValidate>
                <fieldset className="pay-options"><legend className="sr-only">Moyen de paiement</legend>
                    {Object.entries(PAYMENT_METHODS).map(([key, m], index) => (
                        <label className="pay-option" key={key}>
                            <input type="radio" name="method" value={key} defaultChecked={index === 0} />
                            <span className="tile tile-sm"><Icon name={m.icon} size={18} /></span>
                            <span><strong>{m.label}</strong><small>{m.via}</small></span>
                        </label>
                    ))}
                </fieldset>
                <p className="muted small"><Icon name="lock-closed" size={16} />Vous serez redirigé vers le prestataire. KWABO ne voit jamais les données de votre carte.</p>
                <div className="dialog-actions"><button className="btn btn-ghost" type="button" onClick={close}>Annuler</button><button className="btn btn-primary" type="submit">Continuer</button></div>
            </form>
        </>
    );
}

export function NotificationItem({ notification: n }) {
    const navigate = useNavigate();
    return (
        <li>
            <a className={`notif ${n.read ? '' : 'is-unread'}`} href={n.href} onClick={(event) => { event.preventDefault(); api.markNotificationRead(n.id); navigate(n.href); }}>
                <span className="notif-dot" aria-hidden="true" />
                <span><span className="notif-text">{n.text}{!n.read && <span className="sr-only"> (non lue)</span>}</span><small>{fmtDateTime(n.at)}</small></span>
            </a>
        </li>
    );
}
