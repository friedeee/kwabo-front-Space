import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { motion } from 'motion/react';
import { api, db, requestById, serviceById } from '../api/db.js';
import { useData, useUser } from '../api/hooks.js';
import { CITIES, SERVICES, STATUS } from '../data/catalog.js';
import { Icon, WhatsAppIcon } from '../ui/Icon.jsx';
import { Field, FormError, formValues, useFormErrors } from '../ui/Field.jsx';
import { useFeedback } from '../ui/feedback.jsx';
import { EmptyState, Pagination, Photo, StatRow, StatusSteps } from '../ui/kit.jsx';
import { Page } from '../ui/layouts.jsx';
import { DocumentList, dueInvoiceOf, HistoryCard, NotificationItem, PayFlow, RequestBanner, RequestInfoCard, RequestRow, Thread } from '../ui/requests.jsx';
import { Catalog, ServiceGrid } from '../ui/services.jsx';
import { fmtDate, fmtDateTime, money, normalize, plural, waLink } from '../ui/format.js';

const PAGE_SIZE = 5;

function DueAlert({ invoice }) {
    const { open } = useFeedback();
    return (
        <motion.div className="alert" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
            <span className="tile tile-sm alert-pulse"><Icon name="banknotes" size={18} /></span>
            <p><strong>Un devis attend votre paiement.</strong> {invoice.label} : {money(invoice.amount)}. La mission démarre dès le paiement.</p>
            <button className="btn btn-gold btn-sm" type="button" onClick={() => open(<PayFlow invoiceId={invoice.id} />)}>Payer</button>
        </motion.div>
    );
}

/* ---------- Tableau de bord ---------- */
export function Dashboard() {
    const user = useUser('client');
    const requests = api.requestsOf(user);
    const count = (status) => requests.filter((r) => r.status === status).length;
    const unread = api.notificationsOf(user).filter((n) => !n.read);
    const due = api.invoicesOf(user).filter((i) => i.status === 'due');
    const active = requests.find((r) => r.status === 'active');
    const activeService = active ? serviceById(active.serviceId) : null;
    const activeMedia = active ? api.documentsOf(active.id).filter((d) => d.image) : [];
    const lastDocs = db.documents.filter((d) => !d.image && requests.some((r) => r.id === d.requestId)).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 3);
    return (
        <Page title="Tableau de bord">
            <section className="welcome welcome-photo">
                <Photo name={activeService?.image ?? 'ganvie'} eager />
                <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}>
                    <h2>Bonjour {user.firstName}</h2>
                    <p>{active ? `Votre mission « ${active.title} » avance. Tout est à jour ci-dessous.` : 'Dites-nous ce dont vous avez besoin au Bénin, nous nous en occupons.'}</p>
                </motion.div>
                <Link className="btn btn-gold btn-lg" to="/espace/nouvelle-demande"><Icon name="plus-circle" />Nouvelle demande</Link>
            </section>
            <StatRow items={[
                { icon: 'clipboard-document-list', value: requests.length, label: 'Demandes au total', to: '/espace/demandes' },
                { icon: 'clock', value: count('pending'), label: 'En attente', tone: 'gold' },
                { icon: 'bolt', value: count('active'), label: 'En cours', tone: 'green' },
                { icon: 'check-circle', value: count('done'), label: 'Terminées' },
            ]} />
            {due.map((i) => <DueAlert key={i.id} invoice={i} />)}
            <div className="dash-grid">
                <div className="stack">
                    {active && (
                        <section className="card mission-card">
                            <div className="mission-photo"><Photo name={activeService.image} small /><span className={`badge-on-photo cat-${activeService.cat}`}><Icon name={activeService.icon} size={16} />Mission en cours</span></div>
                            <div className="mission-body">
                                <div className="card-head"><h2>{active.title}</h2><Link to={`/espace/demandes/${active.id}`}>Ouvrir</Link></div>
                                <StatusSteps status={active.status} />
                                <p className="muted last-event"><Icon name="clock" size={16} />Dernière mise à jour : {active.history.at(-1).text}, {fmtDateTime(active.history.at(-1).at)}</p>
                                {activeMedia.length > 0 && <><h3>Dernières photos et vidéos</h3><DocumentList documents={activeMedia.slice(0, 3)} /></>}
                            </div>
                        </section>
                    )}
                    <section className="card"><div className="card-head"><h2>Mes dernières demandes</h2><Link to="/espace/demandes">Tout voir</Link></div>
                        {requests.length
                            ? <div className="request-list">{requests.slice(0, 3).map((r) => <RequestRow key={r.id} request={r} user={user} />)}</div>
                            : <EmptyState icon="clipboard-document-list" title="Aucune demande" body="Votre première demande prend moins de 3 minutes."><Link className="btn btn-primary" to="/espace/nouvelle-demande">Faire une demande</Link></EmptyState>}
                    </section>
                </div>
                <div className="stack">
                    <section className="card"><div className="card-head"><h2>Notifications</h2><Link to="/espace/notifications">Tout voir</Link></div>
                        {unread.length ? <ul className="notif-list">{unread.slice(0, 3).map((n) => <NotificationItem key={n.id} notification={n} />)}</ul> : <p className="muted">Rien de nouveau. Vous êtes à jour.</p>}
                    </section>
                    {lastDocs.length > 0 && <section className="card"><div className="card-head"><h2>Derniers documents</h2><Link to="/espace/documents">Tout voir</Link></div><DocumentList documents={lastDocs} /></section>}
                    <a className="card card-link card-whatsapp" href={waLink()} target="_blank" rel="noopener"><WhatsAppIcon size={26} /><span><strong>Une urgence ?</strong><small>Notre équipe à Cotonou répond sur WhatsApp.</small></span></a>
                </div>
            </div>
            <section className="section-in-app"><div className="card-head"><h2>Services les plus demandés</h2><Link to="/espace/services">Voir le catalogue</Link></div>
                <ServiceGrid compact services={SERVICES.filter((s) => s.popular && s.available).slice(0, 4)} linkTo={(s) => `/espace/nouvelle-demande?service=${s.id}`} />
            </section>
        </Page>
    );
}

/* ---------- Catalogue et nouvelle demande ---------- */
export function ClientCatalog() {
    useData();
    const [params] = useSearchParams();
    return (
        <Page title="Catalogue" subtitle="Choisissez un service pour faire votre demande">
            <Catalog initialQuery={params.get('q') ?? ''} initialCategory={params.get('cat') ?? 'all'} linkTo={(s) => `/espace/nouvelle-demande?service=${s.id}`} />
        </Page>
    );
}

function WizardSteps({ step }) {
    return (
        <ol className="wizard">
            {['Choix du service', 'Votre besoin', 'Confirmation'].map((label, i) => (
                <li key={label} className={`${i + 1 < step ? 'is-done' : ''} ${i + 1 === step ? 'is-current' : ''}`} aria-current={i + 1 === step ? 'step' : undefined}>
                    <span>{i + 1 < step ? <Icon name="check" size={16} /> : i + 1}</span>{label}
                </li>
            ))}
        </ol>
    );
}

export function NewRequest() {
    const user = useUser('client');
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const { toast } = useFeedback();
    const { errors, setErrors, formRef } = useFormErrors();
    const created = params.get('confirmee') ? requestById(params.get('confirmee')) : null;
    const service = serviceById(params.get('service'));

    if (created) {
        return (
            <Page title="Nouvelle demande">
                <WizardSteps step={3} />
                <section className="card confirm-card">
                    <svg className="confirm-check" viewBox="0 0 52 52" aria-hidden="true">
                        <motion.circle cx="26" cy="26" r="24" fill="none" strokeWidth="3" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6 }} />
                        <motion.path d="M15 27l7 7 15-16" fill="none" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.5, duration: 0.4 }} />
                    </svg>
                    <h2>Votre demande est bien reçue</h2>
                    <p className="muted">Gardez ce numéro de suivi. Vous le retrouvez aussi dans « Mes demandes ».</p>
                    <motion.p className="tracking" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.8, type: 'spring' }}>
                        <strong>{created.tracking}</strong>
                        <button className="icon-btn" type="button" aria-label="Copier le numéro de suivi" title="Copier"
                            onClick={async () => { try { await navigator.clipboard.writeText(created.tracking); toast('Copié.'); } catch { toast(`À copier : ${created.tracking}`); } }}>
                            <Icon name="clipboard-document" />
                        </button>
                    </motion.p>
                    <ol className="mini-steps"><li>Notre équipe étudie votre besoin.</li><li>Vous recevez un devis sous 12 h, par notification et par e-mail.</li><li>La mission démarre après votre paiement.</li></ol>
                    <div className="btn-row btn-row-center">
                        <Link className="btn btn-primary" to={`/espace/demandes/${created.id}`}>Suivre ma demande</Link>
                        <Link className="btn btn-ghost" to="/espace">Retour au tableau de bord</Link>
                    </div>
                </section>
            </Page>
        );
    }
    if (!service || !service.available) {
        return (
            <Page title="Nouvelle demande" subtitle="Moins de 3 minutes">
                <WizardSteps step={1} />
                <Catalog linkTo={(s) => `/espace/nouvelle-demande?service=${s.id}`} />
            </Page>
        );
    }
    const submit = (event) => {
        event.preventDefault();
        const v = formValues(event.currentTarget);
        const found = {};
        if (!v.title.trim()) found.title = 'Donnez un titre à votre demande.';
        if (!v.city) found.city = 'Choisissez une ville.';
        if (!v.description.trim()) found.description = 'Décrivez votre besoin en quelques mots.';
        service.fields.filter((f) => f.required && !String(v[f.name] ?? '').trim()).forEach((f) => { found[f.name] = 'Ce champ est obligatoire.'; });
        if (!setErrors(found)) return;
        const details = {};
        service.fields.forEach((f) => {
            const value = v[f.name];
            if (value instanceof File) { if (value.name) details[f.name] = value.name; } else if (value) { details[f.name] = value; }
        });
        const request = api.createRequest(user, { serviceId: service.id, title: v.title.trim(), city: v.city, urgency: v.urgency, budget: v.budget.trim(), description: v.description.trim(), details });
        navigate(`/espace/nouvelle-demande?confirmee=${request.id}`);
    };
    return (
        <Page title="Nouvelle demande" subtitle={service.name}>
            <WizardSteps step={2} />
            <div className="detail-grid">
                <form className="card form-card" ref={formRef} onSubmit={submit} noValidate>
                    <FormError message={errors._} />
                    <h2>Votre besoin en quelques mots</h2>
                    <Field name="title" label="Titre de la demande" required placeholder="Ex. : Suivi de ma maison à Calavi" hint="Il vous servira à retrouver votre demande." error={errors.title} />
                    <div className="form-grid">
                        <Field name="city" label="Ville au Bénin" type="select" required options={CITIES} error={errors.city} />
                        <Field name="urgency" label="Urgence" type="select" required placeholderOption={false} defaultValue="normal" options={[{ value: 'normal', label: 'Normale' }, { value: 'urgent', label: 'Urgent' }]} />
                    </div>
                    <Field name="description" label="Description" type="textarea" required placeholder="Expliquez ce que vous attendez de nous." error={errors.description} />
                    <Field name="budget" label="Budget estimé" placeholder="Ex. : 200 €" />
                    <h2 className="form-section">Détails pour « {service.name} »</h2>
                    <div className="form-grid form-grid-auto">
                        {service.fields.map((f) => <Field key={f.name} {...f} type={f.type ?? 'text'} error={errors[f.name]} />)}
                    </div>
                    <div className="form-actions">
                        <Link className="btn btn-ghost" to="/espace/nouvelle-demande"><Icon name="arrow-left" size={18} />Changer de service</Link>
                        <button className="btn btn-primary btn-lg" type="submit">Envoyer ma demande</button>
                    </div>
                </form>
                <aside className="stack">
                    <section className="card service-aside">
                        <div className="service-aside-photo"><Photo name={service.image} small /><span className={`service-card-icon cat-${service.cat}`}><Icon name={service.icon} size={20} /></span></div>
                        <h2>{service.name}</h2>
                        <p className="price">{service.price}</p>
                        <ul className="check-list">{service.included.map((i) => <li key={i}><Icon name="check-circle" size={18} />{i}</li>)}</ul>
                    </section>
                    <section className="card card-soft"><h2>Rien à payer maintenant</h2><p className="muted">Vous recevez d'abord un devis. La mission démarre seulement après votre accord et votre paiement.</p></section>
                </aside>
            </div>
        </Page>
    );
}

/* ---------- Mes demandes ---------- */
export function Requests() {
    const user = useUser('client');
    const [q, setQ] = useState('');
    const [status, setStatus] = useState('all');
    const [page, setPage] = useState(1);
    const [printing, setPrinting] = useState(false);
    const all = api.requestsOf(user);
    const needle = normalize(q.trim());
    const list = all.filter((r) => (status === 'all' || r.status === status) && (!needle || normalize(`${r.title} ${r.tracking}`).includes(needle)));
    const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
    const current = Math.min(page, pages);
    const shown = printing ? list : list.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
    useEffect(() => {
        if (!printing) return undefined;
        const frame = requestAnimationFrame(() => { window.print(); setPrinting(false); });
        return () => cancelAnimationFrame(frame);
    }, [printing]);
    return (
        <Page title="Mes demandes" subtitle={plural(all.length, 'demande')}
            actions={<Link className="btn btn-primary btn-sm topbar-cta" to="/espace/nouvelle-demande"><Icon name="plus" size={18} /><span>Nouvelle demande</span></Link>}>
            <div className="toolbar no-print">
                <div className="search-field"><Icon name="magnifying-glass" size={18} /><label className="sr-only" htmlFor="requests-q">Rechercher par titre</label>
                    <input id="requests-q" type="search" placeholder="Rechercher par titre…" value={q} onChange={(event) => { setQ(event.target.value); setPage(1); }} /></div>
                <button className="btn btn-ghost" type="button" onClick={() => setPrinting(true)}><Icon name="printer" size={18} />Exporter en PDF</button>
            </div>
            <div className="chips no-print" role="group" aria-label="Filtrer par statut">
                <button className="chip" type="button" aria-pressed={status === 'all'} onClick={() => { setStatus('all'); setPage(1); }}>Toutes <span className="chip-count">{all.length}</span></button>
                {Object.keys(STATUS).map((key) => <button key={key} className="chip" type="button" aria-pressed={status === key} onClick={() => { setStatus(key); setPage(1); }}>{STATUS[key].label} <span className="chip-count">{all.filter((r) => r.status === key).length}</span></button>)}
            </div>
            <div className="print-only print-head"><strong>KWABO</strong> · Mes demandes · {user.firstName} {user.lastName} · {fmtDate(new Date().toISOString())}</div>
            <section className="card" id="requests-list">
                {list.length ? (
                    <>
                        <div className="request-list">{shown.map((r, i) => <motion.div key={r.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}><RequestRow request={r} user={user} /></motion.div>)}</div>
                        {!printing && <Pagination page={current} pages={pages} onPage={setPage} />}
                    </>
                ) : all.length
                    ? <EmptyState icon="magnifying-glass" title="Aucune demande trouvée" body="Changez votre recherche ou le filtre de statut." />
                    : <EmptyState icon="clipboard-document-list" title="Aucune demande" body="Votre première demande prend moins de 3 minutes."><Link className="btn btn-primary" to="/espace/nouvelle-demande">Faire une demande</Link></EmptyState>}
            </section>
        </Page>
    );
}

/* ---------- Détail d'une demande ---------- */
export function RequestDetail() {
    const user = useUser('client');
    const { id } = useParams();
    const { confirm, toast } = useFeedback();
    const r = requestById(id);
    const mine = r && r.userId === user.id;
    useEffect(() => { if (mine) api.markThreadRead(id, 'client'); }, [id, mine, r && api.messagesOf(id).length]);
    if (!mine) {
        return <Page title="Demande introuvable"><EmptyState icon="magnifying-glass" title="Demande introuvable" body="Elle n'existe pas ou n'est pas liée à votre compte."><Link className="btn btn-primary" to="/espace/demandes">Mes demandes</Link></EmptyState></Page>;
    }
    const due = dueInvoiceOf(r);
    const docs = api.documentsOf(r.id);
    const cancel = async () => {
        if (!(await confirm({ title: 'Annuler cette demande ?', body: `« ${r.title} » sera annulée, et son devis éventuel aussi.`, confirm: 'Annuler la demande', danger: true }))) return;
        api.cancelRequest(r);
        toast('Demande annulée.');
    };
    return (
        <Page title={r.title} subtitle={r.tracking}>
            <Link className="breadcrumb" to="/espace/demandes"><Icon name="arrow-left" size={16} />Mes demandes</Link>
            <RequestBanner request={r}><StatusSteps status={r.status} /></RequestBanner>
            {due && <DueAlert invoice={due} />}
            <div className="detail-grid">
                <div className="stack">
                    <RequestInfoCard request={r} />
                    <section className="card"><h2>Messages</h2><Thread request={r} user={user} /></section>
                    <section className="card"><h2>Documents</h2>{docs.length ? <DocumentList documents={docs} /> : <p className="muted">Vos rapports, photos, reçus et contrats apparaîtront ici.</p>}</section>
                </div>
                <aside className="stack">
                    {r.status === 'done' && <RatingCard request={r} />}
                    <HistoryCard request={r} />
                    {r.status === 'pending' && <section className="card"><h2>Changement de programme ?</h2><p className="muted">Vous pouvez annuler tant que la mission n'a pas démarré.</p><button className="btn btn-danger-ghost btn-block" type="button" onClick={cancel}><Icon name="x-circle" size={18} />Annuler la demande</button></section>}
                    <a className="card card-link card-whatsapp" href={waLink(`Bonjour KWABO, ma demande ${r.tracking}`)} target="_blank" rel="noopener"><WhatsAppIcon size={26} /><span><strong>Besoin d'une réponse rapide ?</strong><small>Écrivez-nous sur WhatsApp</small></span></a>
                </aside>
            </div>
        </Page>
    );
}

function RatingCard({ request: r }) {
    const { toast } = useFeedback();
    const review = db.reviews.find((a) => a.requestId === r.id);
    return (
        <section className="card">
            <h2>Votre avis</h2>
            <p className="muted">{r.rating ? `Merci. Vous avez donné ${r.rating} sur 5.` : 'Comment s\'est passée cette mission ?'}</p>
            <div className="stars" role="group" aria-label="Noter la mission">
                {[1, 2, 3, 4, 5].map((n) => (
                    <motion.button key={n} type="button" className={`star ${r.rating >= n ? 'is-on' : ''}`} aria-label={`Donner ${n} sur 5`} aria-pressed={r.rating === n}
                        whileTap={{ scale: 1.3 }} whileHover={{ scale: 1.12 }} onClick={() => { api.rateRequest(r, n); toast('Merci pour votre avis.'); }}>
                        <Icon name="star" size={26} />
                    </motion.button>
                ))}
            </div>
            {r.rating && (
                <form className="review-form" onSubmit={(event) => { event.preventDefault(); api.rateRequest(r, r.rating, event.currentTarget.elements.reviewComment.value.trim()); toast('Commentaire enregistré. Merci !'); }} noValidate>
                    <Field name="reviewComment" label="Votre commentaire" type="textarea" rows={2} defaultValue={review?.comment ?? ''} hint="Il est relu par KWABO avant publication." />
                    <button className="btn btn-ghost btn-sm" type="submit">Enregistrer</button>
                </form>
            )}
        </section>
    );
}

/* ---------- Documents ---------- */
export function Documents() {
    const user = useUser('client');
    const groups = api.requestsOf(user).map((r) => ({ r, docs: api.documentsOf(r.id) })).filter((g) => g.docs.length);
    return (
        <Page title="Mes documents" subtitle="Rapports, photos, vidéos, reçus et contrats">
            {groups.length ? groups.map(({ r, docs }, i) => (
                <motion.section key={r.id} className="card docs-group" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                    <div className="card-head">
                        <div className="docs-group-title"><span className="request-thumb"><Photo name={serviceById(r.serviceId).image} small /></span><div><h2>{r.title}</h2><small className="muted">{r.tracking} · {plural(docs.length, 'document')}</small></div></div>
                        <Link to={`/espace/demandes/${r.id}`}>Voir la demande</Link>
                    </div>
                    <DocumentList documents={docs} grid />
                </motion.section>
            )) : <EmptyState icon="folder" title="Aucun document" body="Les documents de vos missions apparaîtront ici." />}
        </Page>
    );
}

/* ---------- Messagerie ---------- */
export function Messages() {
    const user = useUser('client');
    const { id } = useParams();
    const requests = api.requestsOf(user);
    const selected = id ? requests.find((r) => r.id === id) : null;
    useEffect(() => { if (selected) api.markThreadRead(selected.id, 'client'); }, [selected?.id, selected && api.messagesOf(selected.id).length]);
    const threads = requests.map((r) => {
        const messages = api.messagesOf(r.id);
        return { r, last: messages.at(-1), unread: messages.filter((m) => m.from !== 'client' && !m.read).length };
    }).sort((a, b) => new Date(b.last?.at ?? 0) - new Date(a.last?.at ?? 0));
    if (!requests.length) {
        return <Page title="Messagerie"><EmptyState icon="chat-bubble-left-right" title="Aucune discussion" body="Chaque demande a son fil de discussion avec notre équipe."><Link className="btn btn-primary" to="/espace/nouvelle-demande">Faire une demande</Link></EmptyState></Page>;
    }
    return (
        <Page title="Messagerie" subtitle="Un fil de discussion par demande">
            <div className={`messenger ${selected ? 'has-thread' : ''}`}>
                <nav className="messenger-list" aria-label="Discussions">
                    {threads.map(({ r, last, unread }) => (
                        <Link key={r.id} to={`/espace/messages/${r.id}`} aria-current={selected?.id === r.id ? 'true' : undefined}>
                            <span className="request-thumb request-thumb-sm"><Photo name={serviceById(r.serviceId).image} small /></span>
                            <span className="messenger-item"><strong>{r.title}</strong><small>{last ? (last.text || last.attachment) : 'Aucun message'}</small></span>
                            {unread > 0 && <span className="count count-gold">{unread}</span>}
                        </Link>
                    ))}
                </nav>
                <section className="messenger-thread">
                    {selected ? (
                        <>
                            <header><Link className="icon-btn messenger-back" to="/espace/messages" aria-label="Retour aux discussions"><Icon name="arrow-left" /></Link>
                                <div><Link to={`/espace/demandes/${selected.id}`}><strong>{selected.title}</strong></Link><small className="muted">{selected.tracking}</small></div></header>
                            <Thread request={selected} user={user} />
                        </>
                    ) : <EmptyState icon="chat-bubble-left-right" title="Choisissez une discussion" body="Sélectionnez une demande pour voir ses messages." />}
                </section>
            </div>
        </Page>
    );
}

/* ---------- Notifications ---------- */
export function Notifications() {
    const user = useUser('client');
    const list = api.notificationsOf(user);
    const unread = list.filter((n) => !n.read).length;
    return (
        <Page title="Notifications">
            <section className="card">
                <div className="card-head"><h2>{unread > 1 ? `${unread} non lues` : `${unread} non lue`}</h2>{unread > 0 && <button className="btn btn-ghost btn-sm" type="button" onClick={() => api.markAllRead(user)}>Tout marquer comme lu</button>}</div>
                {list.length ? <ul className="notif-list">{list.map((n) => <NotificationItem key={n.id} notification={n} />)}</ul> : <EmptyState icon="bell" title="Aucune notification" body="Vous serez prévenu ici à chaque étape de vos missions." />}
            </section>
        </Page>
    );
}
