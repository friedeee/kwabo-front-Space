import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { api, audit, db, fullName, requestById, resetDemo, serviceById, userById } from '../api/db.js';
import { useUser } from '../api/hooks.js';
import { CATEGORIES, PAYMENT_METHODS, SERVICES } from '../data/catalog.js';
import { EnableTwoFactor } from '../client/account.jsx';
import { Icon } from '../ui/Icon.jsx';
import { Field, formValues, useFormErrors } from '../ui/Field.jsx';
import { useFeedback } from '../ui/feedback.jsx';
import { Avatar, EmptyState, Pagination, Photo, StatRow, Stars } from '../ui/kit.jsx';
import { Page } from '../ui/layouts.jsx';
import { InvoiceBadge, InvoiceView, NotificationItem, RequestRow } from '../ui/requests.jsx';
import { downloadCsv, fmtDate, fmtDateTime, money, normalize, passwordProblem, plural } from '../ui/format.js';
import { kpiValues, sum } from './overview.jsx';

const SUFFIX = 'Administration KWABO';
const LIST_SIZE = 10;
const ROLE_LABEL = { ADMIN: 'Administrateur', OPERATOR: 'Agent terrain', USER: 'Client' };
const paginate = (list, page) => list.slice((page - 1) * LIST_SIZE, page * LIST_SIZE);
const pagesOf = (list) => Math.max(1, Math.ceil(list.length / LIST_SIZE));

/* ---------- Paiements ---------- */
export function Payments() {
    useUser('admin');
    const [params] = useSearchParams();
    const { open, confirm, toast } = useFeedback();
    const [q, setQ] = useState('');
    const [status, setStatus] = useState(params.get('statut') ?? 'all');
    const [page, setPage] = useState(1);
    const needle = normalize(q.trim());
    const list = api.allInvoices().filter((i) => (status === 'all' || i.status === status) && (!needle || normalize(`${i.id} ${i.label} ${fullName(userById(i.userId))}`).includes(needle)));
    const current = Math.min(page, pagesOf(list));
    const refund = async (invoice) => {
        if (!(await confirm({ title: `Rembourser ${money(invoice.amount)} ?`, body: `Facture ${invoice.id}, ${invoice.label}. Le client sera prévenu.`, confirm: 'Rembourser', danger: true }))) return;
        api.refundInvoice(invoice);
        toast('Remboursement enregistré.');
    };
    const exportCsv = () => {
        downloadCsv('kwabo-factures.csv', [['Facture', 'Client', 'Objet', 'Moyen', 'Date', 'Montant (€)', 'État'],
            ...list.map((i) => [i.id, fullName(userById(i.userId)), i.label, i.method ? PAYMENT_METHODS[i.method].label : '', fmtDate(i.paidAt ?? i.createdAt), i.amount, i.status])]);
        toast('kwabo-factures.csv téléchargé.');
    };
    return (
        <Page title="Paiements" subtitle="Factures et encaissements" suffix={SUFFIX}>
            <StatRow items={[
                { icon: 'banknotes', value: kpiValues().revenue, format: money, label: 'Encaissé ce mois-ci', tone: 'green' },
                { icon: 'chart-bar', value: sum(db.invoices.filter((i) => i.status === 'paid')), format: money, label: 'Total encaissé' },
                { icon: 'clock', value: sum(db.invoices.filter((i) => i.status === 'due')), format: money, label: 'En attente', tone: 'gold' },
                { icon: 'arrow-left', value: sum(db.invoices.filter((i) => i.status === 'refunded')), format: money, label: 'Remboursé' },
            ]} />
            <div className="toolbar">
                <div className="search-field"><Icon name="magnifying-glass" size={18} /><label className="sr-only" htmlFor="invoices-q">Filtrer les factures</label>
                    <input id="invoices-q" type="search" placeholder="Facture, client ou objet…" value={q} onChange={(event) => { setQ(event.target.value); setPage(1); }} /></div>
                <label className="sr-only" htmlFor="invoices-status">État</label>
                <select id="invoices-status" className="select-inline" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
                    {[['all', 'Tous les états'], ['due', 'À payer'], ['paid', 'Payées'], ['refunded', 'Remboursées'], ['cancelled', 'Annulées']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                <button className="btn btn-ghost btn-sm" type="button" onClick={exportCsv}><Icon name="arrow-down-tray" size={18} />Exporter en CSV</button>
            </div>
            <section className="card">
                {list.length ? <>
                    <div className="table-wrap"><table className="table table-cards"><thead><tr><th>Facture</th><th>Client</th><th>Objet</th><th>Moyen</th><th>Date</th><th>Montant</th><th>État</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>
                        {paginate(list, current).map((i) => (
                            <tr key={i.id}>
                                <td data-label="Facture" className="nowrap">{i.id}</td><td data-label="Client">{fullName(userById(i.userId))}</td><td data-label="Objet">{i.label}</td>
                                <td data-label="Moyen">{i.method ? PAYMENT_METHODS[i.method].label : <span className="muted">–</span>}</td><td data-label="Date" className="nowrap">{fmtDate(i.paidAt ?? i.createdAt)}</td>
                                <td data-label="Montant"><strong>{money(i.amount)}</strong></td><td data-label="État"><InvoiceBadge invoice={i} /></td>
                                <td className="td-action"><span className="row-actions"><button className="btn btn-ghost btn-sm" type="button" onClick={() => open(<InvoiceView invoice={i} />, { wide: true })}>Voir</button>
                                    {i.status === 'paid' && <button className="btn btn-danger-ghost btn-sm" type="button" onClick={() => refund(i)}>Rembourser</button>}</span></td>
                            </tr>
                        ))}
                    </tbody></table></div>
                    <Pagination page={current} pages={pagesOf(list)} onPage={setPage} />
                </> : <EmptyState icon="magnifying-glass" title="Aucune facture" body="Changez votre recherche ou le filtre." />}
            </section>
            <p className="notice"><Icon name="lock-closed" />Les données de carte restent chez Stripe, Flutterwave et Wise : KWABO n'en conserve aucune.</p>
        </Page>
    );
}

/* ---------- Clients ---------- */
const clientState = (c) => (c.suspended ? 'suspended' : c.verified ? 'active' : 'unverified');
const CLIENT_STATE = {
    active: <span className="badge badge-green">Actif</span>,
    unverified: <span className="badge badge-gold">E-mail à confirmer</span>,
    suspended: <span className="badge badge-red">Suspendu</span>,
};

export function Clients() {
    useUser('admin');
    const { toast } = useFeedback();
    const [q, setQ] = useState('');
    const [state, setState] = useState('all');
    const [page, setPage] = useState(1);
    const needle = normalize(q.trim());
    const list = api.clients().filter((c) => (state === 'all' || clientState(c) === state) && (!needle || normalize(`${fullName(c)} ${c.email} ${c.country}`).includes(needle)))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const current = Math.min(page, pagesOf(list));
    const exportCsv = () => {
        downloadCsv('kwabo-clients.csv', [['Client', 'E-mail', 'Téléphone', 'Pays', 'Demandes', 'Inscription'], ...list.map((c) => [fullName(c), c.email, c.phone, c.country, api.requestsOf(c).length, fmtDate(c.createdAt)])]);
        toast('kwabo-clients.csv téléchargé.');
    };
    return (
        <Page title="Clients" subtitle={plural(api.clients().length, 'client')} suffix={SUFFIX}>
            <div className="toolbar">
                <div className="search-field"><Icon name="magnifying-glass" size={18} /><label className="sr-only" htmlFor="clients-q">Filtrer les clients</label>
                    <input id="clients-q" type="search" placeholder="Nom, e-mail ou pays…" value={q} onChange={(event) => { setQ(event.target.value); setPage(1); }} /></div>
                <label className="sr-only" htmlFor="clients-state">État</label>
                <select id="clients-state" className="select-inline" value={state} onChange={(event) => { setState(event.target.value); setPage(1); }}>
                    {[['all', 'Tous les états'], ['active', 'Actifs'], ['unverified', 'E-mail à confirmer'], ['suspended', 'Suspendus']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                <button className="btn btn-ghost btn-sm" type="button" onClick={exportCsv}><Icon name="arrow-down-tray" size={18} />Exporter en CSV</button>
            </div>
            <section className="card">
                {list.length ? <>
                    <div className="table-wrap"><table className="table table-cards"><thead><tr><th>Client</th><th>E-mail</th><th>Pays</th><th>Demandes</th><th>Payé</th><th>État</th><th>Inscription</th></tr></thead><tbody>
                        {paginate(list, current).map((c) => (
                            <tr key={c.id}>
                                <td data-label="Client"><Link className="client-mini table-link" to={`/admin/clients/${c.id}`}><Avatar name={fullName(c)} size="avatar-sm" />{fullName(c)}</Link></td>
                                <td data-label="E-mail">{c.email}</td><td data-label="Pays">{c.country}</td><td data-label="Demandes">{api.requestsOf(c).length}</td>
                                <td data-label="Payé" className="nowrap">{money(sum(api.invoicesOf(c).filter((i) => i.status === 'paid')))}</td>
                                <td data-label="État">{CLIENT_STATE[clientState(c)]}</td><td data-label="Inscription" className="nowrap">{fmtDate(c.createdAt)}</td>
                            </tr>
                        ))}
                    </tbody></table></div>
                    <Pagination page={current} pages={pagesOf(list)} onPage={setPage} />
                </> : <EmptyState icon="magnifying-glass" title="Aucun client trouvé" body="Essayez un autre nom, e-mail ou pays." />}
            </section>
        </Page>
    );
}

function useSuspend() {
    const { confirm, toast } = useFeedback();
    return async (person) => {
        const suspending = !person.suspended;
        const yes = await confirm({
            title: suspending ? `Suspendre ${fullName(person)} ?` : `Réactiver ${fullName(person)} ?`,
            body: suspending ? 'Cette personne perd l\'accès immédiatement, sur tous ses appareils.' : 'Cette personne pourra se reconnecter.',
            confirm: suspending ? 'Suspendre' : 'Réactiver', danger: suspending,
        });
        if (!yes) return;
        api.setSuspended(person, suspending);
        toast(suspending ? 'Compte suspendu.' : 'Compte réactivé.');
    };
}

export function ClientFile() {
    const admin = useUser('admin');
    const { id } = useParams();
    const navigate = useNavigate();
    const { open, confirm, toast } = useFeedback();
    const toggleSuspend = useSuspend();
    const c = userById(id);
    if (!c || c.role !== 'USER') {
        return <Page title="Client introuvable" suffix={SUFFIX}><EmptyState icon="magnifying-glass" title="Client introuvable" body="Ce compte n'existe pas ou a été supprimé."><Link className="btn btn-primary" to="/admin/clients">Retour aux clients</Link></EmptyState></Page>;
    }
    const requests = api.requestsOf(c);
    const invoices = api.invoicesOf(c);
    const erase = async () => {
        if (!(await confirm({ title: `Effacer le compte de ${fullName(c)} ?`, body: 'Demandes, documents, messages, factures et avis seront supprimés. Cette action est irréversible.', confirm: 'Effacer définitivement', danger: true }))) return;
        const name = fullName(c);
        audit(`Compte effacé : ${name}`);
        api.eraseUser(c);
        toast(`Compte de ${name} effacé.`);
        navigate('/admin/clients');
    };
    return (
        <Page title={fullName(c)} subtitle={`Client depuis le ${fmtDate(c.createdAt)}`} suffix={SUFFIX}>
            <Link className="breadcrumb" to="/admin/clients"><Icon name="arrow-left" size={16} />Clients</Link>
            <StatRow items={[
                { icon: 'clipboard-document-list', value: requests.length, label: 'Demandes' },
                { icon: 'bolt', value: requests.filter((r) => r.status === 'active').length, label: 'En cours', tone: 'green' },
                { icon: 'banknotes', value: sum(invoices.filter((i) => i.status === 'paid')), format: money, label: 'Total payé', tone: 'green' },
                { icon: 'clock', value: sum(invoices.filter((i) => i.status === 'due')), format: money, label: 'À payer', tone: 'gold' },
            ]} />
            <div className="detail-grid">
                <div className="stack">
                    <section className="card"><h2>Demandes</h2>{requests.length ? <div className="request-list">{requests.map((r) => <RequestRow key={r.id} request={r} user={admin} />)}</div> : <p className="muted">Aucune demande.</p>}</section>
                    <section className="card"><h2>Factures</h2>{invoices.length ? <ul className="mini-invoices">{invoices.map((i) => <li key={i.id}><button className="link-btn" type="button" onClick={() => open(<InvoiceView invoice={i} />, { wide: true })}>{i.id}</button><span className="muted">{i.label}</span><strong>{money(i.amount)}</strong><InvoiceBadge invoice={i} /></li>)}</ul> : <p className="muted">Aucune facture.</p>}</section>
                </div>
                <aside className="stack">
                    <section className="card"><div className="client-mini"><Avatar name={fullName(c)} /><span><strong>{fullName(c)}</strong><small>{c.country}</small></span></div>
                        <p className="client-state">{CLIENT_STATE[clientState(c)]}</p>
                        <ul className="contact-list"><li><Icon name="envelope" size={18} /><a href={`mailto:${c.email}`}>{c.email}</a></li><li><Icon name="phone" size={18} /><a href={`tel:${c.phone.replace(/\s/g, '')}`}>{c.phone}</a></li><li><Icon name="gift" size={18} /><span>Code : {c.referralCode}</span></li><li><Icon name="shield-check" size={18} /><span>Double authentification {c.twoFactor ? 'activée' : 'désactivée'}</span></li></ul>
                    </section>
                    <section className="card"><h2>Actions sur le compte</h2><div className="action-stack">
                        <button className="btn btn-ghost btn-block" type="button" onClick={() => toast(`Démonstration : lien valable 1 heure envoyé à ${c.email}.`)}><Icon name="envelope" size={18} />Envoyer un lien de mot de passe</button>
                        <button className="btn btn-ghost btn-block" type="button" onClick={() => toggleSuspend(c)}><Icon name={c.suspended ? 'check-circle' : 'hand-raised'} size={18} />{c.suspended ? 'Réactiver le compte' : 'Suspendre le compte'}</button>
                        <button className="btn btn-danger-ghost btn-block" type="button" onClick={erase}><Icon name="x-circle" size={18} />Effacer le compte et ses données</button>
                    </div><p className="muted small-text">L'effacement répond au droit à l'effacement (RGPD). Il est définitif.</p></section>
                </aside>
            </div>
        </Page>
    );
}

/* ---------- Avis ---------- */
const REVIEW_TABS = { pending: 'À modérer', published: 'Publiés', hidden: 'Masqués' };

export function Reviews() {
    useUser('admin');
    const { toast } = useFeedback();
    const [tab, setTab] = useState('pending');
    const ratings = db.reviews.map((a) => a.rating);
    const average = ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1).replace('.', ',') : '–';
    const list = db.reviews.filter((a) => a.status === tab).sort((a, b) => new Date(b.at) - new Date(a.at));
    return (
        <Page title="Avis" subtitle={`Note moyenne : ${average} sur 5, sur ${ratings.length} avis`} suffix={SUFFIX}>
            <div className="chips" role="group" aria-label="Filtrer les avis">
                {Object.entries(REVIEW_TABS).map(([key, label]) => <button key={key} className="chip" type="button" aria-pressed={tab === key} onClick={() => setTab(key)}>{label} <span className="chip-count">{db.reviews.filter((a) => a.status === key).length}</span></button>)}
            </div>
            {list.length ? (
                <ul className="review-list">
                    <AnimatePresence mode="popLayout">
                        {list.map((a) => {
                            const r = requestById(a.requestId);
                            return (
                                <motion.li key={a.id} className="card review-card" layout initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, x: 40 }}>
                                    {r && <div className="review-photo"><Photo name={serviceById(r.serviceId).image} small /></div>}
                                    <div className="review-head"><Stars rating={a.rating} /><small className="muted">{fmtDate(a.at)}</small></div>
                                    <p className="review-text">{a.comment || <span className="muted">Pas de commentaire.</span>}</p>
                                    <p className="muted small-text">{fullName(userById(a.userId)) || 'Client'}{r && <> · <Link to={`/admin/demandes/${r.id}`}>{r.title}</Link></>}</p>
                                    <div className="btn-row">
                                        {a.status !== 'published' && <button className="btn btn-primary btn-sm" type="button" onClick={() => { api.moderateReview(a, 'published'); toast('Avis publié.'); }}><Icon name="check" size={16} />Publier</button>}
                                        {a.status !== 'hidden' && <button className="btn btn-ghost btn-sm" type="button" onClick={() => { api.moderateReview(a, 'hidden'); toast('Avis masqué.'); }}><Icon name="eye-slash" size={16} />Masquer</button>}
                                    </div>
                                </motion.li>
                            );
                        })}
                    </AnimatePresence>
                </ul>
            ) : <EmptyState icon="star" title="Aucun avis ici" body={tab === 'pending' ? 'Tous les avis ont été modérés.' : 'Les avis apparaîtront ici après modération.'} />}
        </Page>
    );
}

/* ---------- Parrainage ---------- */
export function Referrals() {
    useUser('admin');
    const rows = Object.entries(db.referrals).map(([id, referrals]) => ({ user: userById(id), referrals })).filter((row) => row.user);
    const converted = rows.reduce((total, row) => total + row.referrals.filter((r) => r.status === 'Actif').length, 0);
    const example = 10;
    return (
        <Page title="Parrainage" subtitle="Parrains, filleuls et récompenses" suffix={SUFFIX}>
            <StatRow items={[
                { icon: 'user-group', value: rows.length, label: 'Parrains' },
                { icon: 'user-plus', value: rows.reduce((n, row) => n + row.referrals.length, 0), label: 'Filleuls' },
                { icon: 'check-circle', value: converted, label: 'Filleuls convertis', tone: 'green' },
                { icon: 'gift', value: converted * example, format: money, label: 'Récompenses', tone: 'gold' },
            ]} />
            <p className="notice"><Icon name="information-circle" />Exemple : {example} € par filleul converti. Le montant réel reste à fixer par KWABO.</p>
            <section className="card">
                {rows.length ? (
                    <div className="table-wrap"><table className="table table-cards"><thead><tr><th>Parrain</th><th>Code</th><th>Filleuls</th><th>Convertis</th><th>Récompense</th></tr></thead><tbody>
                        {rows.map(({ user, referrals }) => {
                            const count = referrals.filter((r) => r.status === 'Actif').length;
                            return <tr key={user.id}><td data-label="Parrain"><Link className="table-link" to={`/admin/clients/${user.id}`}>{fullName(user)}</Link></td><td data-label="Code">{user.referralCode}</td><td data-label="Filleuls">{referrals.map((r) => r.name).join(', ')}</td><td data-label="Convertis">{count}</td><td data-label="Récompense"><strong>{money(count * example)}</strong></td></tr>;
                        })}
                    </tbody></table></div>
                ) : <EmptyState icon="gift" title="Aucun parrainage" body="Les parrainages apparaîtront ici." />}
            </section>
        </Page>
    );
}

/* ---------- Catalogue ---------- */
export function Catalog() {
    useUser('admin');
    const { open, close, toast } = useFeedback();
    const editPrice = (s) => open(<PriceForm service={s} onSave={(price) => { api.setService(s.id, { price }); close(); toast('Tarif enregistré.'); }} />);
    return (
        <Page title="Catalogue" subtitle="Un service indisponible disparaît du site et de l'espace client" suffix={SUFFIX}>
            {CATEGORIES.map((c) => (
                <section className="card" key={c.id}>
                    <div className="catalog-head"><span className="request-thumb"><Photo name={c.image} small /></span><h2>{c.name}</h2></div>
                    <ul className="catalog-grid">
                        {SERVICES.filter((s) => s.cat === c.id).map((s) => (
                            <motion.li key={s.id} className={`catalog-item ${s.available ? '' : 'is-off'}`} layout>
                                <div className="catalog-photo"><Photo name={s.image} small /><span className={`service-card-icon cat-${s.cat}`}><Icon name={s.icon} size={18} /></span></div>
                                <div className="catalog-body">
                                    <strong>{s.name}</strong>
                                    <span className="price">{s.price}</span>
                                    <small className="muted">{plural(db.requests.filter((r) => r.serviceId === s.id).length, 'demande')}</small>
                                </div>
                                <div className="catalog-actions">
                                    <label className="switch switch-inline"><span className="sr-only">{s.name} disponible</span>
                                        <input type="checkbox" checked={s.available} onChange={(event) => { api.setService(s.id, { available: event.target.checked }); toast(event.target.checked ? 'Service disponible.' : 'Service retiré du site et de l\'espace client.'); }} />
                                        <span className="switch-track" aria-hidden="true" /></label>
                                    <button className="btn btn-ghost btn-sm" type="button" onClick={() => editPrice(s)}>Modifier le tarif</button>
                                </div>
                            </motion.li>
                        ))}
                    </ul>
                </section>
            ))}
        </Page>
    );
}

function PriceForm({ service, onSave }) {
    const { close } = useFeedback();
    const { errors, setErrors, formRef } = useFormErrors();
    return (
        <>
            <h2 className="dialog-title" id="dialog-heading">{service.name}</h2>
            <form ref={formRef} noValidate onSubmit={(event) => {
                event.preventDefault();
                const price = event.currentTarget.elements.servicePrice.value.trim();
                if (!setErrors(price ? {} : { servicePrice: 'Saisissez un tarif.' })) return;
                onSave(price);
            }}>
                <Field name="servicePrice" label="Tarif affiché" required defaultValue={service.price} hint="Exemple : Dès 50 €/démarche. Le prix exact figure dans le devis." error={errors.servicePrice} />
                <div className="dialog-actions"><button className="btn btn-ghost" type="button" onClick={close}>Annuler</button><button className="btn btn-primary" type="submit">Enregistrer</button></div>
            </form>
        </>
    );
}

/* ---------- Équipe et rôles ---------- */
const PERMISSIONS = [
    ['Voir ses propres demandes et documents', true, true, true],
    ['Écrire au client sur une demande', true, true, true],
    ['Déposer rapports, photos, reçus', false, true, true],
    ['Changer le statut d\'une demande attribuée', false, true, true],
    ['Voir toutes les demandes', false, false, true],
    ['Attribuer un agent, envoyer un devis', false, false, true],
    ['Gérer clients, paiements et avis', false, false, true],
    ['Gérer le catalogue et l\'équipe', false, false, true],
];
const TEAM_COVERS = ['port', 'chantier-terrain', 'rue-cotonou', 'zemidjan', 'mairie'];

export function Team() {
    const me = useUser('admin');
    const { open } = useFeedback();
    const toggleSuspend = useSuspend();
    const team = db.users.filter((u) => u.role !== 'USER');
    return (
        <Page title="Équipe et rôles" subtitle={plural(team.length, 'membre')} suffix={SUFFIX}
            actions={<button className="btn btn-primary btn-sm topbar-cta" type="button" onClick={() => open(<AddOperator />)}><Icon name="user-plus" size={18} /><span>Ajouter un agent</span></button>}>
            <ul className="team-grid">
                {team.map((u, i) => {
                    const assigned = db.requests.filter((r) => r.operatorId === u.id);
                    return (
                        <motion.li key={u.id} className="card team-card" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                            <div className="team-cover"><Photo name={TEAM_COVERS[i % TEAM_COVERS.length]} small /></div>
                            <div className="client-mini"><Avatar name={fullName(u)} /><span><strong>{fullName(u)}</strong><small>{ROLE_LABEL[u.role]}</small></span>{u.suspended && <span className="badge badge-red">Suspendu</span>}</div>
                            <ul className="contact-list"><li><Icon name="envelope" size={18} /><span>{u.email}</span></li><li><Icon name="phone" size={18} /><span>{u.phone}</span></li></ul>
                            {u.role === 'OPERATOR'
                                ? <p className="team-load"><strong>{assigned.filter((r) => r.status === 'active').length}</strong> en cours · <strong>{assigned.length}</strong> au total</p>
                                : <p className="team-load muted">Accès à toutes les demandes</p>}
                            {u.id !== me.id && <button className="btn btn-ghost btn-sm" type="button" onClick={() => toggleSuspend(u)}>{u.suspended ? 'Réactiver' : 'Suspendre'}</button>}
                        </motion.li>
                    );
                })}
            </ul>
            <section className="card"><h2>Qui peut faire quoi</h2>
                <div className="table-wrap"><table className="table table-perms"><thead><tr><th>Permission</th><th>Client</th><th>Agent terrain</th><th>Administrateur</th></tr></thead><tbody>
                    {PERMISSIONS.map(([label, ...roles]) => <tr key={label}><td>{label}</td>{roles.map((allowed, n) => <td key={n}>{allowed ? <span className="perm-yes"><Icon name="check" size={18} /><span className="sr-only">Oui</span></span> : <span className="perm-no" aria-label="Non">–</span>}</td>)}</tr>)}
                </tbody></table></div>
            </section>
        </Page>
    );
}

function AddOperator() {
    const { close, toast } = useFeedback();
    const { errors, setErrors, fromApi, formRef } = useFormErrors();
    const submit = (event) => {
        event.preventDefault();
        const v = formValues(event.currentTarget);
        const found = {};
        if (!v.opFirstName.trim()) found.opFirstName = 'Saisissez le prénom.';
        if (!v.opLastName.trim()) found.opLastName = 'Saisissez le nom.';
        if (!/^\S+@\S+\.\S+$/.test(v.opEmail)) found.opEmail = 'Saisissez une adresse e-mail valide.';
        if (v.opPhone.replace(/\D/g, '').length < 6) found.opPhone = 'Saisissez un numéro valide.';
        if (!setErrors(found)) return;
        try {
            api.addOperator({ firstName: v.opFirstName, lastName: v.opLastName, email: v.opEmail, phone: v.opPhone });
            close();
            toast('Agent ajouté.');
        } catch (error) { fromApi(error, 'opEmail'); }
    };
    return (
        <>
            <h2 className="dialog-title" id="dialog-heading">Ajouter un agent terrain</h2>
            <form ref={formRef} onSubmit={submit} noValidate>
                <div className="form-grid">
                    <Field name="opFirstName" label="Prénom" required error={errors.opFirstName} />
                    <Field name="opLastName" label="Nom" required error={errors.opLastName} />
                </div>
                <Field name="opEmail" label="E-mail" type="email" required error={errors.opEmail} />
                <Field name="opPhone" label="Téléphone" type="tel" required placeholder="+229 01…" error={errors.opPhone} />
                <p className="muted small-text">Démonstration : le mot de passe de ce compte est Demo1234. En vrai, l'agent reçoit une invitation par e-mail.</p>
                <div className="dialog-actions"><button className="btn btn-ghost" type="button" onClick={close}>Annuler</button><button className="btn btn-primary" type="submit">Ajouter</button></div>
            </form>
        </>
    );
}

/* ---------- Journal ---------- */
export function Journal() {
    useUser('admin');
    const [q, setQ] = useState('');
    const [page, setPage] = useState(1);
    const needle = normalize(q.trim());
    const list = db.audit.filter((j) => !needle || normalize(`${j.text} ${j.actor}`).includes(needle));
    const current = Math.min(page, pagesOf(list));
    return (
        <Page title="Journal d'activité" subtitle="Qui a fait quoi, et quand" suffix={SUFFIX}>
            <div className="toolbar"><div className="search-field"><Icon name="magnifying-glass" size={18} /><label className="sr-only" htmlFor="journal-q">Filtrer le journal</label>
                <input id="journal-q" type="search" placeholder="Action ou personne…" value={q} onChange={(event) => { setQ(event.target.value); setPage(1); }} /></div></div>
            <section className="card">
                {list.length ? <>
                    <ol className="timeline">{paginate(list, current).map((j) => <li key={j.id}><strong>{j.text}</strong><small>{j.actor} · {fmtDateTime(j.at)}</small></li>)}</ol>
                    <Pagination page={current} pages={pagesOf(list)} onPage={setPage} />
                </> : <EmptyState icon="document-check" title="Aucune activité" body="Changez votre recherche." />}
            </section>
        </Page>
    );
}

/* ---------- Notifications et compte ---------- */
export function StaffNotifications() {
    const user = useUser('admin');
    const list = api.notificationsOf(user);
    const unread = list.filter((n) => !n.read).length;
    return (
        <Page title="Notifications" subtitle={unread > 1 ? `${unread} non lues` : `${unread} non lue`} suffix={SUFFIX}>
            <section className="card">
                {unread > 0 && <div className="card-head card-head-end"><button className="btn btn-ghost btn-sm" type="button" onClick={() => api.markAllRead(user)}>Tout marquer comme lu</button></div>}
                {list.length ? <ul className="notif-list">{list.map((n) => <NotificationItem key={n.id} notification={n} />)}</ul> : <EmptyState icon="bell" title="Aucune notification" body="Vous serez prévenu ici." />}
            </section>
        </Page>
    );
}

export function Account() {
    const user = useUser('admin');
    const navigate = useNavigate();
    const { open, close, confirm, toast } = useFeedback();
    const { errors, setErrors, fromApi, formRef } = useFormErrors();
    const savePassword = (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const found = {};
        if (!form.elements.current.value) found.current = 'Saisissez votre mot de passe actuel.';
        const problem = passwordProblem(form.elements.next.value);
        if (problem) found.next = problem;
        if (!setErrors(found)) return;
        try {
            api.changePassword(user, form.elements.current.value, form.elements.next.value);
            form.reset();
            toast('Mot de passe changé.');
        } catch (error) { fromApi(error, 'current'); }
    };
    const toggleTwoFactor = async () => {
        if (user.twoFactor) {
            if (!(await confirm({ title: 'Désactiver la double authentification ?', body: 'Votre compte sera moins bien protégé.', confirm: 'Désactiver', danger: true }))) return;
            api.updateProfile(user, { twoFactor: false });
            return;
        }
        open(<EnableTwoFactor onDone={() => { api.updateProfile(user, { twoFactor: true }); close(); toast('Double authentification activée.'); }} />);
    };
    const reset = async () => {
        if (!(await confirm({ title: 'Réinitialiser la démonstration ?', body: 'Les données créées pendant vos essais seront effacées.', confirm: 'Réinitialiser', danger: true }))) return;
        resetDemo();
        toast('Démonstration réinitialisée.');
        navigate('/admin/connexion');
    };
    return (
        <Page title="Mon compte" subtitle={`${ROLE_LABEL[user.role]} · ${user.email}`} suffix={SUFFIX}>
            <div className="dash-grid dash-grid-even">
                <form className="card form-card" ref={formRef} onSubmit={savePassword} noValidate>
                    <h2>Mot de passe</h2>
                    <Field name="current" label="Mot de passe actuel" type="password" required autoComplete="current-password" error={errors.current} />
                    <Field name="next" label="Nouveau mot de passe" type="password" required autoComplete="new-password" hint="Au moins 8 caractères, avec 1 majuscule et 1 chiffre." error={errors.next} />
                    <button className="btn btn-primary" type="submit">Changer le mot de passe</button>
                </form>
                <div className="stack">
                    <section className="card"><h2>Sécurité</h2>
                        <div className="setting"><span className="tile tile-sm"><Icon name="shield-check" size={18} /></span><div><strong>Double authentification</strong><small>{user.twoFactor ? 'Activée.' : 'Conseillée pour les comptes de l\'équipe.'}</small></div>
                            <button className="btn btn-ghost btn-sm" type="button" onClick={toggleTwoFactor}>{user.twoFactor ? 'Désactiver' : 'Activer'}</button></div>
                    </section>
                    <section className="card card-soft"><h2>Démonstration</h2><p className="muted">Remet les comptes et les données d'exemple à leur état de départ, sur l'espace client et l'administration.</p><button className="btn btn-ghost" type="button" onClick={reset}>Réinitialiser la démo</button></section>
                </div>
            </div>
        </Page>
    );
}
