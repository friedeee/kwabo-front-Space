import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { motion } from 'motion/react';
import { api, db, fullName, requestById, serviceById, userById } from '../api/db.js';
import { useUser } from '../api/hooks.js';
import { CATEGORIES, DOC_TYPES, STATUS } from '../data/catalog.js';
import { Icon } from '../ui/Icon.jsx';
import { Field, formValues, useFormErrors } from '../ui/Field.jsx';
import { useFeedback } from '../ui/feedback.jsx';
import { Avatar, EmptyState, Pagination, Photo, StatusBadge, StatusSteps } from '../ui/kit.jsx';
import { Page } from '../ui/layouts.jsx';
import { DocumentList, dueInvoiceOf, HistoryCard, InvoiceBadge, InvoiceView, RequestBanner, RequestInfoCard, Thread } from '../ui/requests.jsx';
import { downloadCsv, fmtDate, fmtDateTime, money, normalize, plural } from '../ui/format.js';

const LIST_SIZE = 10;
const SUFFIX = 'Administration KWABO';
const filters = { q: '', status: 'all', operator: 'all', category: 'all', urgency: 'all', view: 'list' };

/* ---------- Liste et tableau par statut ---------- */
export function Requests() {
    const user = useUser('admin');
    const isAdmin = user.role === 'ADMIN';
    const [params] = useSearchParams();
    const { confirm, toast } = useFeedback();
    const [state, setState] = useState(() => ({ ...filters, status: params.get('statut') ?? filters.status }));
    const [page, setPage] = useState(1);
    const [over, setOver] = useState(null);
    useEffect(() => { Object.assign(filters, state); }, [state]);
    const set = (key, value) => { setState((s) => ({ ...s, [key]: value })); setPage(1); };
    const needle = normalize(state.q.trim());
    const all = api.visibleRequests(user);
    const list = all.filter((r) => (state.status === 'all' || r.status === state.status)
        && (state.operator === 'all' || (state.operator === 'none' ? !r.operatorId : r.operatorId === state.operator))
        && (state.category === 'all' || serviceById(r.serviceId).cat === state.category)
        && (state.urgency === 'all' || r.urgency === state.urgency)
        && (!needle || normalize(`${r.title} ${r.tracking} ${fullName(userById(r.userId))}`).includes(needle)));
    const pages = Math.max(1, Math.ceil(list.length / LIST_SIZE));
    const current = Math.min(page, pages);

    const exportCsv = () => {
        downloadCsv('kwabo-demandes.csv', [['Suivi', 'Titre', 'Service', 'Client', 'Agent', 'Statut', 'Urgence', 'Date'],
            ...list.map((r) => [r.tracking, r.title, serviceById(r.serviceId).name, fullName(userById(r.userId)), r.operatorId ? fullName(userById(r.operatorId)) : '', STATUS[r.status].label, r.urgency === 'urgent' ? 'Urgent' : 'Normale', fmtDate(r.createdAt)])]);
        toast('kwabo-demandes.csv téléchargé.');
    };
    /* Glisser une carte dans une autre colonne change le statut. */
    const drop = async (event, status) => {
        event.preventDefault();
        setOver(null);
        const r = requestById(event.dataTransfer.getData('text/plain'));
        if (!r || r.status === status) return;
        if (status === 'cancelled' && !(await confirm({ title: 'Annuler cette demande ?', body: `« ${r.title} » sera annulée, et son devis en attente aussi.`, confirm: 'Annuler la demande', danger: true }))) return;
        api.setStatus(r, status);
        toast(`Statut : ${STATUS[status].label}. Le client est prévenu.`);
    };
    const select = (id, key, label, options) => (
        <><label className="sr-only" htmlFor={id}>{label}</label>
            <select id={id} className="select-inline" value={state[key]} onChange={(event) => set(key, event.target.value)}>{options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></>
    );
    return (
        <Page title={isAdmin ? 'Demandes' : 'Demandes attribuées'} subtitle={plural(all.length, 'demande')} suffix={SUFFIX}>
            <div className="toolbar">
                <div className="search-field"><Icon name="magnifying-glass" size={18} /><label className="sr-only" htmlFor="requests-filter-q">Filtrer les demandes</label>
                    <input id="requests-filter-q" type="search" placeholder="Filtrer : titre, suivi ou client…" value={state.q} onChange={(event) => set('q', event.target.value)} /></div>
                {select('filter-status', 'status', 'Statut', [['all', 'Tous les statuts'], ...Object.keys(STATUS).map((k) => [k, STATUS[k].label])])}
                {isAdmin && select('filter-operator', 'operator', 'Agent', [['all', 'Tous les agents'], ['none', 'Non attribuées'], ...api.operators().map((o) => [o.id, fullName(o)])])}
                {select('filter-category', 'category', 'Univers', [['all', 'Tous les univers'], ...CATEGORIES.map((c) => [c.id, c.short])])}
                {select('filter-urgency', 'urgency', 'Urgence', [['all', 'Toute urgence'], ['urgent', 'Urgentes'], ['normal', 'Normales']])}
            </div>
            <div className="toolbar toolbar-between">
                <div className="segmented" role="group" aria-label="Affichage">
                    <button type="button" aria-pressed={state.view === 'list'} onClick={() => set('view', 'list')}><Icon name="bars-3" size={18} />Liste</button>
                    <button type="button" aria-pressed={state.view === 'kanban'} onClick={() => set('view', 'kanban')}><Icon name="squares-2x2" size={18} />Tableau</button>
                </div>
                <button className="btn btn-ghost btn-sm" type="button" onClick={exportCsv}><Icon name="arrow-down-tray" size={18} />Exporter en CSV</button>
            </div>
            {state.view === 'kanban' ? (
                <div className="kanban">
                    {Object.keys(STATUS).map((key) => {
                        const cards = list.filter((r) => r.status === key);
                        return (
                            <section key={key} className={`kanban-col ${over === key ? 'is-over' : ''}`} aria-label={STATUS[key].label} data-status={key}
                                onDragOver={(event) => { event.preventDefault(); setOver(key); }} onDragLeave={() => setOver(null)} onDrop={(event) => drop(event, key)}>
                                <header><StatusBadge status={key} /><strong>{cards.length}</strong></header>
                                <div className="kanban-cards">
                                    {cards.map((r) => {
                                        const s = serviceById(r.serviceId);
                                        return (
                                            <motion.div key={r.id} layout layoutId={`card-${r.id}`} transition={{ type: 'spring', stiffness: 400, damping: 34 }}>
                                                <Link className="kanban-card" to={`/admin/demandes/${r.id}`} draggable data-id={r.id} onDragStart={(event) => { event.dataTransfer.setData('text/plain', r.id); event.dataTransfer.effectAllowed = 'move'; }}>
                                                    <span className="kanban-photo"><Photo name={s.image} small /><span className={`request-thumb-icon cat-${s.cat}`}><Icon name={s.icon} size={14} /></span></span>
                                                    <strong>{r.title}</strong>
                                                    <small>{r.tracking}</small>
                                                    <small>{fullName(userById(r.userId))}</small>
                                                    <span className="kanban-foot">{r.urgency === 'urgent' && <span className="badge badge-red"><Icon name="bolt" size={14} />Urgent</span>}{r.operatorId ? <Avatar name={fullName(userById(r.operatorId))} size="avatar-xs" /> : <span className="muted small-text">Sans agent</span>}</span>
                                                </Link>
                                            </motion.div>
                                        );
                                    })}
                                    {cards.length === 0 && <p className="muted small-text kanban-empty">Aucune demande</p>}
                                </div>
                            </section>
                        );
                    })}
                </div>
            ) : (
                <section className="card">
                    {list.length ? (
                        <>
                            <div className="table-wrap"><table className="table table-cards"><thead><tr><th>Suivi</th><th>Demande</th><th>Client</th><th>Agent</th><th>Statut</th><th>Date</th></tr></thead><tbody>
                                {list.slice((current - 1) * LIST_SIZE, current * LIST_SIZE).map((r) => {
                                    const unread = api.messagesOf(r.id).filter((m) => m.from === 'client' && !m.read).length;
                                    return (
                                        <tr key={r.id}>
                                            <td data-label="Suivi" className="nowrap">{r.tracking}</td>
                                            <td data-label="Demande"><span className="table-request"><span className="request-thumb request-thumb-sm"><Photo name={serviceById(r.serviceId).image} small /></span><Link className="table-link" to={`/admin/demandes/${r.id}`}>{r.title}</Link>
                                                {r.urgency === 'urgent' && <span className="badge badge-red"><Icon name="bolt" size={14} />Urgent</span>}{unread > 0 && <span className="count count-gold" title="Messages non lus">{unread}</span>}</span></td>
                                            <td data-label="Client">{fullName(userById(r.userId))}</td>
                                            <td data-label="Agent">{r.operatorId ? fullName(userById(r.operatorId)) : <span className="muted">Non attribuée</span>}</td>
                                            <td data-label="Statut"><StatusBadge status={r.status} /></td>
                                            <td data-label="Date" className="nowrap">{fmtDate(r.createdAt)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody></table></div>
                            <Pagination page={current} pages={pages} onPage={setPage} />
                        </>
                    ) : <EmptyState icon="magnifying-glass" title="Aucune demande" body="Changez votre recherche ou vos filtres." />}
                </section>
            )}
        </Page>
    );
}

/* ---------- Détail d'une demande ---------- */
export function RequestDetail() {
    const user = useUser('admin');
    const isAdmin = user.role === 'ADMIN';
    const { id } = useParams();
    const { confirm, open, toast } = useFeedback();
    const docForm = useFormErrors();
    const noteForm = useFormErrors();
    const quoteForm = useFormErrors();
    const r = api.visibleRequests(user).find((x) => x.id === id);
    useEffect(() => { if (r) api.markThreadRead(r.id, 'team'); }, [r?.id, r && api.messagesOf(r.id).length]);
    if (!r) {
        return <Page title="Demande introuvable" suffix={SUFFIX}><EmptyState icon="magnifying-glass" title="Demande introuvable" body="Elle n'existe pas ou ne vous est pas attribuée."><Link className="btn btn-primary" to="/admin/demandes">Retour aux demandes</Link></EmptyState></Page>;
    }
    const client = userById(r.userId);
    const due = dueInvoiceOf(r);
    const invoices = db.invoices.filter((i) => i.requestId === r.id);
    const review = db.reviews.find((a) => a.requestId === r.id);

    const changeStatus = async (event) => {
        event.preventDefault();
        const status = event.currentTarget.elements.statusValue.value;
        if (status === r.status) return;
        if (status === 'cancelled' && !(await confirm({ title: 'Annuler cette demande ?', body: 'Le client sera prévenu et son devis en attente sera annulé.', confirm: 'Annuler la demande', danger: true }))) return;
        api.setStatus(r, status);
        toast(`Statut : ${STATUS[status].label}. Le client est prévenu.`);
    };
    const assign = (event) => {
        event.preventDefault();
        const operatorId = event.currentTarget.elements.operatorId.value;
        if (operatorId === (r.operatorId ?? '')) return;
        api.assign(r, operatorId);
        toast(operatorId ? `Attribuée à ${fullName(userById(operatorId))}.` : 'Attribution retirée.');
    };
    const sendQuote = (event) => {
        event.preventDefault();
        const v = formValues(event.currentTarget);
        const amount = Number(v.quoteAmount);
        const found = {};
        if (!(amount > 0)) found.quoteAmount = 'Saisissez un montant supérieur à 0.';
        if (!v.quoteLabel.trim()) found.quoteLabel = 'Saisissez l\'objet du devis.';
        if (!quoteForm.setErrors(found)) return;
        api.sendQuote(r, amount, v.quoteLabel.trim());
        event.currentTarget.elements.quoteAmount.value = '';
        toast('Devis envoyé au client.');
    };
    const addDocument = (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const name = form.elements.docName.value.trim();
        if (!docForm.setErrors(name ? {} : { docName: 'Donnez un nom au document.' })) return;
        api.addDocument(r, form.elements.docType.value, name);
        form.reset();
        toast('Document déposé. Il est visible par le client.');
    };
    const addNote = (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const text = form.elements.noteText.value.trim();
        if (!noteForm.setErrors(text ? {} : { noteText: 'Écrivez votre note.' })) return;
        api.addNote(r, user, text);
        form.reset();
        toast('Note enregistrée.');
    };
    return (
        <Page title={r.title} subtitle={`${r.tracking} · ${serviceById(r.serviceId).name}`} suffix={SUFFIX}>
            <Link className="breadcrumb" to="/admin/demandes"><Icon name="arrow-left" size={16} />Demandes</Link>
            <RequestBanner request={r}><StatusSteps status={r.status} /></RequestBanner>
            <div className="detail-grid">
                <div className="stack">
                    <RequestInfoCard request={r} />
                    <section className="card"><h2>Messages avec le client</h2><Thread request={r} user={user} /></section>
                    <section className="card"><h2>Documents</h2>
                        {api.documentsOf(r.id).length ? <DocumentList documents={api.documentsOf(r.id)} /> : <p className="muted">Aucun document pour le moment.</p>}
                        <form className="doc-form" ref={docForm.formRef} onSubmit={addDocument} noValidate>
                            <h3>Déposer un document</h3>
                            <div className="form-grid">
                                <Field name="docType" label="Type" type="select" required placeholderOption={false} options={Object.entries(DOC_TYPES).map(([value, t]) => ({ value, label: t.label }))} />
                                <Field name="docName" label="Nom du document" required placeholder="Rapport semaine 5.pdf" error={docForm.errors.docName} />
                            </div>
                            <button className="btn btn-ghost" type="submit"><Icon name="plus" size={18} />Déposer</button>
                        </form>
                    </section>
                    <section className="card card-note"><h2><Icon name="lock-closed" />Notes internes</h2><p className="muted small-text">Jamais visibles par le client.</p>
                        {(r.notes ?? []).map((n) => <motion.div key={n.at} className="note" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}><p>{n.text}</p><small>{n.author} · {fmtDateTime(n.at)}</small></motion.div>)}
                        <form ref={noteForm.formRef} onSubmit={addNote} noValidate>
                            <Field name="noteText" label="Ajouter une note" type="textarea" rows={2} optionalMark={false} error={noteForm.errors.noteText} />
                            <button className="btn btn-ghost btn-sm" type="submit">Enregistrer la note</button>
                        </form>
                    </section>
                </div>
                <aside className="stack">
                    <section className="card"><div className="card-head"><h2>Client</h2>{isAdmin && <Link to={`/admin/clients/${client.id}`}>Fiche</Link>}</div>
                        <div className="client-mini"><Avatar name={fullName(client)} /><span><strong>{fullName(client)}</strong><small>{client.country}</small></span></div>
                        <ul className="contact-list"><li><Icon name="envelope" size={18} /><a href={`mailto:${client.email}`}>{client.email}</a></li><li><Icon name="phone" size={18} /><a href={`tel:${client.phone.replace(/\s/g, '')}`}>{client.phone}</a></li></ul>
                    </section>
                    <form className="card form-card" onSubmit={changeStatus} noValidate key={`status-${r.status}`}>
                        <h2>Statut</h2>
                        <Field name="statusValue" label="Statut de la demande" type="select" required placeholderOption={false} defaultValue={r.status} options={Object.keys(STATUS).map((k) => ({ value: k, label: STATUS[k].label }))} />
                        <button className="btn btn-primary btn-block" type="submit">Mettre à jour</button>
                    </form>
                    {isAdmin && <>
                        <form className="card form-card" onSubmit={assign} noValidate key={`op-${r.operatorId}`}>
                            <h2>Agent terrain</h2>
                            <Field name="operatorId" label="Attribuer à" type="select" optionalMark={false} placeholderOption="Personne pour le moment" defaultValue={r.operatorId ?? ''} options={api.operators().filter((o) => !o.suspended).map((o) => ({ value: o.id, label: fullName(o) }))} />
                            <button className="btn btn-ghost btn-block" type="submit">Attribuer</button>
                        </form>
                        <form className="card form-card" ref={quoteForm.formRef} onSubmit={sendQuote} noValidate>
                            <h2>Devis</h2>
                            {r.quote && <p className="notice"><Icon name="document-text" /><span>{due ? 'En attente de paiement' : 'Dernier devis'} : <strong>{money(r.quote.amount)}</strong>, {r.quote.label}</span></p>}
                            <Field name="quoteAmount" label="Montant (€)" type="number" required min="1" inputMode="decimal" error={quoteForm.errors.quoteAmount} />
                            <Field name="quoteLabel" label="Objet" required defaultValue={serviceById(r.serviceId).name} error={quoteForm.errors.quoteLabel} />
                            <button className="btn btn-gold btn-block" type="submit">{r.quote ? 'Envoyer un nouveau devis' : 'Envoyer le devis'}</button>
                        </form>
                        {invoices.length > 0 && <section className="card"><h2>Factures</h2><ul className="mini-invoices">{invoices.map((i) => <li key={i.id}><button className="link-btn" type="button" onClick={() => open(<InvoiceView invoice={i} />, { wide: true })}>{i.id}</button><strong>{money(i.amount)}</strong><InvoiceBadge invoice={i} /></li>)}</ul></section>}
                    </>}
                    {r.rating && <section className="card"><h2>Avis du client</h2><p className="rating-readout"><Icon name="star" size={20} /><strong>{r.rating} sur 5</strong></p>{review?.comment && <p className="muted">{review.comment}</p>}</section>}
                    <HistoryCard request={r} />
                </aside>
            </div>
        </Page>
    );
}

/* ---------- Messagerie de l'équipe ---------- */
export function Inbox() {
    const user = useUser('admin');
    const { id } = useParams();
    const requests = api.visibleRequests(user);
    const selected = id ? requests.find((r) => r.id === id) : null;
    useEffect(() => { if (selected) api.markThreadRead(selected.id, 'team'); }, [selected?.id, selected && api.messagesOf(selected.id).length]);
    const threads = requests.map((r) => {
        const messages = api.messagesOf(r.id);
        return { r, last: messages.at(-1), unread: messages.filter((m) => m.from === 'client' && !m.read).length };
    }).filter((t) => t.last || t.r.id === id).sort((a, b) => (b.unread - a.unread) || new Date(b.last?.at ?? 0) - new Date(a.last?.at ?? 0));
    return (
        <Page title="Messagerie" subtitle="Les discussions avec les clients, par demande" suffix={SUFFIX}>
            {threads.length ? (
                <div className={`messenger ${selected ? 'has-thread' : ''}`}>
                    <nav className="messenger-list" aria-label="Discussions">
                        {threads.map(({ r, last, unread }) => (
                            <Link key={r.id} to={`/admin/messages/${r.id}`} aria-current={selected?.id === r.id ? 'true' : undefined}>
                                <Avatar name={fullName(userById(r.userId))} size="avatar-sm" />
                                <span className="messenger-item"><strong>{fullName(userById(r.userId))}</strong><small>{r.title}</small><small>{last ? (last.text || last.attachment) : ''}</small></span>
                                {unread > 0 && <span className="count count-gold">{unread}</span>}
                            </Link>
                        ))}
                    </nav>
                    <section className="messenger-thread">
                        {selected ? <>
                            <header><Link className="icon-btn messenger-back" to="/admin/messages" aria-label="Retour aux discussions"><Icon name="arrow-left" /></Link>
                                <span className="request-thumb request-thumb-sm"><Photo name={serviceById(selected.serviceId).image} small /></span>
                                <div><Link to={`/admin/demandes/${selected.id}`}><strong>{selected.title}</strong></Link><small className="muted">{selected.tracking} · {fullName(userById(selected.userId))}</small></div><StatusBadge status={selected.status} /></header>
                            <Thread request={selected} user={user} />
                        </> : <EmptyState icon="chat-bubble-left-right" title="Choisissez une discussion" body="Les discussions non lues sont en haut de la liste." />}
                    </section>
                </div>
            ) : <EmptyState icon="chat-bubble-left-right" title="Aucune discussion" body="Les messages des clients apparaîtront ici." />}
        </Page>
    );
}
