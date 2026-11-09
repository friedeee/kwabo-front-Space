import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { api, db, fullName, serviceById, userById } from '../api/db.js';
import { useUser } from '../api/hooks.js';
import { CATEGORIES } from '../data/catalog.js';
import { Icon } from '../ui/Icon.jsx';
import { Field, FormError, formValues, useFormErrors } from '../ui/Field.jsx';
import { DocumentList } from '../ui/requests.jsx';
import { EmptyState, Photo, StatRow } from '../ui/kit.jsx';
import { AuthLayout, Page } from '../ui/layouts.jsx';
import { fmtDateTime, money, plural } from '../ui/format.js';

/* Objectifs de la section 2.3 du cahier des charges. */
const KPI_TARGETS = [
    { key: 'accounts', label: 'Comptes créés', m6: 150, m12: 500, format: (v) => String(v) },
    { key: 'payers', label: 'Clients actifs payants', m6: 12, m12: 40, format: (v) => String(v) },
    { key: 'requests', label: 'Demandes de service', m6: 50, m12: 200, format: (v) => String(v) },
    { key: 'revenue', label: 'CA mensuel net', m6: 500, m12: 1500, format: (v) => money(v) },
    { key: 'rating', label: 'Note de satisfaction (sur 5)', m6: 4.2, m12: 4.5, format: (v) => (v ? v.toFixed(1).replace('.', ',') : '–') },
];

const startOfMonth = (offset = 0) => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth() + offset, 1); };
const paidInvoices = () => db.invoices.filter((i) => i.status === 'paid');
export const sum = (list) => list.reduce((total, i) => total + i.amount, 0);

export function monthlyRevenue(months = 6) {
    return Array.from({ length: months }, (_, index) => {
        const offset = index - months + 1;
        const from = startOfMonth(offset);
        const to = startOfMonth(offset + 1);
        const amount = sum(paidInvoices().filter((i) => { const d = new Date(i.paidAt); return d >= from && d < to; }));
        return { label: from.toLocaleDateString('fr-FR', { month: 'short' }), full: from.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }), amount };
    });
}

export function kpiValues() {
    const since = Date.now() - 90 * 86400000;
    const ratings = db.reviews.map((a) => a.rating);
    return {
        accounts: api.clients().length,
        payers: new Set(paidInvoices().filter((i) => new Date(i.paidAt).getTime() >= since).map((i) => i.userId)).size,
        requests: db.requests.length,
        revenue: monthlyRevenue(1)[0].amount,
        rating: ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0,
    };
}

/* Ce qui attend une action, avec la raison affichée à côté. */
function pendingWork(user) {
    return api.visibleRequests(user).filter((r) => ['pending', 'active'].includes(r.status)).map((r) => {
        const reasons = [];
        const unread = api.messagesOf(r.id).filter((m) => m.from === 'client' && !m.read).length;
        if (r.status === 'pending' && !r.quote && user.role === 'ADMIN') reasons.push(['document-text', 'Devis à préparer']);
        if (!r.operatorId && user.role === 'ADMIN') reasons.push(['user-plus', 'Agent à attribuer']);
        if (unread) reasons.push(['chat-bubble-left-right', plural(unread, 'message')]);
        if (user.role === 'OPERATOR' && r.status === 'active' && !reasons.length) reasons.push(['document-text', 'Rapport à déposer']);
        return { r, reasons };
    }).filter((w) => w.reasons.length).sort((a, b) => (b.r.urgency === 'urgent') - (a.r.urgency === 'urgent'));
}

/* Graphique en colonnes : une seule série, valeur écrite au-dessus, détail au survol, tableau disponible. */
export function RevenueChart({ months }) {
    const max = Math.max(1, ...months.map((m) => m.amount));
    return (
        <>
            <figure className="vchart">
                <figcaption className="sr-only">Chiffre d'affaires encaissé par mois</figcaption>
                <ul className="vbars">
                    {months.map((m, i) => (
                        <li key={m.full} className="vbar" tabIndex={0} data-tip={`${m.full} : ${money(m.amount)}`}>
                            <span className="vbar-value">{m.amount ? money(m.amount) : '0'}</span>
                            <span className="vbar-track"><motion.span className="vbar-fill" initial={{ height: 0 }} whileInView={{ height: `${(m.amount / max) * 100}%` }} viewport={{ once: true }} transition={{ delay: i * 0.08, duration: 0.6, ease: 'easeOut' }} /></span>
                            <span className="vbar-label">{m.label}</span>
                        </li>
                    ))}
                </ul>
            </figure>
            <details className="chart-table"><summary>Voir en tableau</summary>
                <table className="table"><thead><tr><th>Mois</th><th>Encaissé</th></tr></thead><tbody>{months.map((m) => <tr key={m.full}><td>{m.full}</td><td>{money(m.amount)}</td></tr>)}</tbody></table>
            </details>
        </>
    );
}

export function Bars({ rows, wide = false }) {
    const max = Math.max(1, ...rows.map((r) => r.value));
    return (
        <ul className={`bars ${wide ? 'bars-wide' : ''}`}>
            {rows.map((row, i) => (
                <li key={row.label} title={`${row.label} : ${row.value}`}>
                    <span className="bars-label">{row.label}</span>
                    <span className="bars-track"><motion.span className="bars-fill" initial={{ width: 0 }} whileInView={{ width: `${(row.value / max) * 100}%` }} viewport={{ once: true }} transition={{ delay: i * 0.08, duration: 0.6 }} /></span>
                    <span className="bars-value">{row.value}</span>
                </li>
            ))}
        </ul>
    );
}

const categoryRows = (requests) => CATEGORIES.map((c) => ({ label: c.short, value: requests.filter((r) => serviceById(r.serviceId).cat === c.id).length }));

function WorkList({ work }) {
    if (!work.length) return <EmptyState icon="check-circle" title="Tout est à jour" body="Aucune demande n'attend d'action." />;
    return (
        <div className="request-list">
            {work.slice(0, 6).map(({ r, reasons }, i) => {
                const s = serviceById(r.serviceId);
                return (
                    <motion.div key={r.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                        <Link className="work-row" to={`/admin/demandes/${r.id}`}>
                            <span className="request-thumb"><Photo name={s.image} small /><span className={`request-thumb-icon cat-${s.cat}`}><Icon name={s.icon} size={14} /></span></span>
                            <span className="request-row-main"><strong>{r.title}</strong><small>{r.tracking} · {fullName(userById(r.userId))}</small>
                                <span className="reasons">{r.urgency === 'urgent' && <span className="badge badge-red"><Icon name="bolt" size={14} />Urgent</span>}{reasons.map(([icon, text]) => <span key={text} className="badge badge-gold"><Icon name={icon} size={14} />{text}</span>)}</span></span>
                            <Icon name="chevron-right" size={18} />
                        </Link>
                    </motion.div>
                );
            })}
        </div>
    );
}

export function Dashboard() {
    const user = useUser('admin');
    if (user.role === 'OPERATOR') return <OperatorDashboard user={user} />;
    const requests = db.requests;
    const count = (status) => requests.filter((r) => r.status === status).length;
    const operators = api.operators();
    return (
        <Page title="Vue d'ensemble" subtitle={new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} suffix="Administration KWABO">
            <section className="admin-hero">
                <Photo name="port" eager />
                <div><h2>Bonjour {user.firstName}</h2><p>{plural(pendingWork(user).length, 'demande')} attendent une action aujourd'hui.</p></div>
                <Link className="btn btn-gold" to="/admin/demandes">Ouvrir les demandes<Icon name="arrow-right" size={18} /></Link>
            </section>
            <StatRow items={[
                { icon: 'document-text', value: requests.filter((r) => r.status === 'pending' && !r.quote).length, label: 'Devis à préparer', tone: 'gold', to: '/admin/demandes?statut=pending' },
                { icon: 'bolt', value: count('active'), label: 'Missions en cours', tone: 'green', to: '/admin/demandes?statut=active' },
                { icon: 'banknotes', value: kpiValues().revenue, format: money, label: 'Encaissé ce mois-ci', tone: 'green', to: '/admin/paiements' },
                { icon: 'clock', value: sum(db.invoices.filter((i) => i.status === 'due')), format: money, label: 'En attente de paiement', tone: 'gold', to: '/admin/paiements?statut=due' },
            ]} />
            <div className="dash-grid">
                <section className="card"><div className="card-head"><h2>À traiter en priorité</h2><Link to="/admin/demandes">Toutes les demandes</Link></div><WorkList work={pendingWork(user)} /></section>
                <section className="card"><div className="card-head"><h2>Encaissements</h2><Link to="/admin/indicateurs">Indicateurs</Link></div><RevenueChart months={monthlyRevenue()} /></section>
            </div>
            <div className="grid-3">
                <section className="card"><h2>Demandes par univers</h2><Bars rows={categoryRows(requests)} /></section>
                <section className="card"><div className="card-head"><h2>Charge des agents</h2><Link to="/admin/equipe">Équipe</Link></div><p className="muted small-text">Missions en cours par agent</p>
                    <Bars wide rows={operators.map((o) => ({ label: fullName(o), value: db.requests.filter((r) => r.operatorId === o.id && r.status === 'active').length }))} /></section>
                <section className="card"><div className="card-head"><h2>Activité récente</h2><Link to="/admin/journal">Journal</Link></div>
                    <ol className="timeline">{db.audit.slice(0, 4).map((j) => <li key={j.id}><strong>{j.text}</strong><small>{j.actor} · {fmtDateTime(j.at)}</small></li>)}</ol></section>
            </div>
        </Page>
    );
}

function OperatorDashboard({ user }) {
    const requests = api.visibleRequests(user);
    const count = (status) => requests.filter((r) => r.status === status).length;
    const docs = db.documents.filter((d) => requests.some((r) => r.id === d.requestId)).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 6);
    return (
        <Page title={`Bonjour ${user.firstName}`} subtitle="Vos missions sur le terrain" suffix="Administration KWABO">
            <section className="admin-hero"><Photo name="chantier-terrain" eager /><div><h2>Sur le terrain aujourd'hui</h2><p>Déposez vos rapports, photos et reçus : le client les voit tout de suite.</p></div></section>
            <StatRow items={[
                { icon: 'clipboard-document-list', value: requests.length, label: 'Missions attribuées' },
                { icon: 'clock', value: count('pending'), label: 'En attente', tone: 'gold' },
                { icon: 'bolt', value: count('active'), label: 'En cours', tone: 'green' },
                { icon: 'check-circle', value: count('done'), label: 'Terminées' },
            ]} />
            <div className="dash-grid">
                <section className="card"><div className="card-head"><h2>À faire</h2><Link to="/admin/demandes">Toutes mes missions</Link></div><WorkList work={pendingWork(user)} /></section>
                <section className="card"><h2>Derniers documents déposés</h2>{docs.length ? <DocumentList documents={docs} /> : <p className="muted">Aucun document pour le moment.</p>}</section>
            </div>
        </Page>
    );
}

export function Kpis() {
    useUser('admin');
    const values = kpiValues();
    const paid = paidInvoices();
    return (
        <Page title="Indicateurs" subtitle="Objectifs de la première année, selon le cahier des charges" suffix="Administration KWABO">
            <p className="notice"><Icon name="information-circle" />Valeurs calculées sur les données de démonstration.</p>
            <section className="card"><h2>Objectifs à 6 et 12 mois</h2>
                <div className="table-wrap"><table className="table table-cards"><thead><tr><th>Indicateur</th><th>Actuel</th><th>Objectif M6</th><th>Objectif M12</th><th>Progression vers M6</th></tr></thead><tbody>
                    {KPI_TARGETS.map((k) => {
                        const share = Math.min(100, Math.round((values[k.key] / k.m6) * 100));
                        return (
                            <tr key={k.key}><td data-label="Indicateur"><strong>{k.label}</strong></td><td data-label="Actuel"><strong>{k.format(values[k.key])}</strong></td><td data-label="Objectif M6">{k.format(k.m6)}</td><td data-label="Objectif M12">{k.format(k.m12)}</td>
                                <td data-label="Progression"><span className="meter" role="img" aria-label={`${share} % de l'objectif à 6 mois`}><span className="bars-track"><motion.span className="bars-fill" initial={{ width: 0 }} animate={{ width: `${share}%` }} transition={{ duration: 0.8 }} /></span><span>{share} %</span></span></td></tr>
                        );
                    })}
                </tbody></table></div>
            </section>
            <div className="dash-grid dash-grid-even">
                <section className="card"><h2>Encaissements sur 6 mois</h2><RevenueChart months={monthlyRevenue()} /></section>
                <div className="stack">
                    <StatRow items={[{ icon: 'receipt-percent', value: Math.round(paid.length ? sum(paid) / paid.length : 0), format: money, label: 'Facture moyenne' }, { icon: 'banknotes', value: sum(paid), format: money, label: 'Total encaissé', tone: 'green' }]} />
                    <section className="card"><h2>Demandes par univers</h2><Bars rows={categoryRows(db.requests)} /></section>
                </div>
            </div>
        </Page>
    );
}

/* ---------- Connexion de l'équipe ---------- */
export function StaffLogin() {
    const user = useUser('admin');
    const navigate = useNavigate();
    const { errors, setErrors, fromApi, formRef } = useFormErrors();
    const [pending, setPending] = useState(null);
    if (user && !pending) return <Navigate to="/admin" replace />;
    const submit = (event) => {
        event.preventDefault();
        const v = formValues(event.currentTarget);
        const found = {};
        if (!v.email.includes('@')) found.email = 'Saisissez une adresse e-mail valide.';
        if (!v.password) found.password = 'Saisissez votre mot de passe.';
        if (!setErrors(found)) return;
        try {
            const result = api.login({ email: v.email, password: v.password, remember: false, area: 'admin' });
            if (result.needsCode) { setPending({ email: v.email, password: v.password }); return; }
            navigate('/admin');
        } catch (error) { fromApi(error, 'email'); }
    };
    const submitCode = (event) => {
        event.preventDefault();
        try {
            api.login({ ...pending, remember: false, code: event.currentTarget.elements.code.value.trim(), area: 'admin' });
            setPending(null);
            navigate('/admin');
        } catch (error) { fromApi(error, 'code'); }
    };
    const fill = (email) => {
        formRef.current.elements.email.value = email;
        formRef.current.elements.password.value = 'Demo1234';
        setErrors({});
        formRef.current.querySelector('button[type="submit"]').focus();
    };
    return (
        <AuthLayout title="Espace équipe" photo="port" foot="admin.kwabo.bj"
            heading={<>Toutes les missions, <em>au même endroit</em></>}
            points={[
                ['clipboard-document-list', 'Demandes et devis', 'Attribuez, chiffrez et suivez chaque mission.'],
                ['chat-bubble-left-right', 'Messagerie client', 'Un fil de discussion par demande.'],
                ['document-check', 'Preuves de terrain', 'Rapports, photos, vidéos et reçus déposés par les agents.'],
                ['chart-bar', 'Indicateurs', 'Les objectifs de la première année, suivis en direct.'],
            ]}
            legal={<><Link to="/">Site public</Link> · <Link to="/connexion">Espace client</Link></>}>
            {pending ? (
                <>
                    <h1>Code de vérification</h1>
                    <p className="muted">Saisissez le code à 6 chiffres de votre application d'authentification.</p>
                    <form ref={formRef} onSubmit={submitCode} noValidate>
                        <Field name="code" label="Code" required autoComplete="one-time-code" hint="Démonstration : 123456" inputMode="numeric" maxLength={6} error={errors.code} />
                        <button className="btn btn-primary btn-lg btn-block" type="submit">Vérifier</button>
                    </form>
                    <button className="link-btn" type="button" onClick={() => setPending(null)}><Icon name="arrow-left" size={16} />Retour</button>
                </>
            ) : (
                <>
                    <h1>Espace équipe</h1>
                    <p className="muted">Accès réservé aux administrateurs et aux agents terrain.</p>
                    <form ref={formRef} onSubmit={submit} noValidate>
                        <FormError message={errors._} />
                        <Field name="email" label="E-mail professionnel" type="email" required autoComplete="username" placeholder="prenom@kwabo.bj" error={errors.email} />
                        <Field name="password" label="Mot de passe" type="password" required autoComplete="current-password" error={errors.password} />
                        <button className="btn btn-primary btn-lg btn-block" type="submit">Se connecter</button>
                    </form>
                    <div className="demo-accounts"><p>Comptes de démonstration</p><div>
                        <button className="btn btn-ghost btn-sm" type="button" onClick={() => fill('admin@kwabo.demo')}>Administrateur</button>
                        <button className="btn btn-ghost btn-sm" type="button" onClick={() => fill('agent@kwabo.demo')}>Agent terrain</button>
                    </div></div>
                </>
            )}
        </AuthLayout>
    );
}
