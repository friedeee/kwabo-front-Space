import { Link, useNavigate } from 'react-router';
import { api, resetDemo } from '../api/db.js';
import { useUser } from '../api/hooks.js';
import { COUNTRIES, NOTIFICATION_PREFS, PAYMENT_METHODS } from '../data/catalog.js';
import { Icon, WhatsAppIcon } from '../ui/Icon.jsx';
import { Field, FormError, formValues, useFormErrors } from '../ui/Field.jsx';
import { useFeedback } from '../ui/feedback.jsx';
import { Avatar, EmptyState, Photo, StatRow } from '../ui/kit.jsx';
import { Page } from '../ui/layouts.jsx';
import { InvoiceBadge, InvoiceView, PayFlow } from '../ui/requests.jsx';
import { fmtDate, money, passwordProblem } from '../ui/format.js';

/* ---------- Paiements ---------- */
export function Payments() {
    const user = useUser('client');
    const { open, confirm, toast } = useFeedback();
    const invoices = api.invoicesOf(user);
    const due = invoices.filter((i) => i.status === 'due');
    const paid = invoices.filter((i) => i.status === 'paid');
    const methods = api.methodsOf(user);
    const total = (list) => list.reduce((sum, i) => sum + i.amount, 0);
    return (
        <Page title="Paiements" subtitle="Factures, historique et moyens de paiement">
            <StatRow items={[
                { icon: 'clock', value: total(due), format: money, label: 'À payer', tone: 'gold' },
                { icon: 'check-circle', value: total(paid), format: money, label: 'Total payé', tone: 'green' },
                { icon: 'receipt-percent', value: invoices.length, label: 'Factures' },
            ]} />
            {due.map((i) => (
                <div className="alert" key={i.id}><span className="tile tile-sm alert-pulse"><Icon name="banknotes" size={18} /></span>
                    <p><strong>{i.label} : {money(i.amount)}</strong><br /><small>Facture {i.id} du {fmtDate(i.createdAt)}</small></p>
                    <button className="btn btn-gold btn-sm" type="button" onClick={() => open(<PayFlow invoiceId={i.id} />)}>Payer</button></div>
            ))}
            <section className="card"><h2>Historique</h2>
                {invoices.length ? (
                    <div className="table-wrap"><table className="table table-cards"><thead><tr><th>Facture</th><th>Objet</th><th>Date</th><th>Montant</th><th>État</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>
                        {invoices.map((i) => (
                            <tr key={i.id}><td data-label="Facture" className="nowrap">{i.id}</td><td data-label="Objet">{i.label}</td><td data-label="Date" className="nowrap">{fmtDate(i.paidAt ?? i.createdAt)}</td><td data-label="Montant"><strong>{money(i.amount)}</strong></td><td data-label="État"><InvoiceBadge invoice={i} /></td>
                                <td className="td-action"><button className="btn btn-ghost btn-sm" type="button" onClick={() => open(<InvoiceView invoice={i} />, { wide: true })}>Voir</button></td></tr>
                        ))}
                    </tbody></table></div>
                ) : <p className="muted">Aucune facture pour le moment.</p>}
            </section>
            <div className="dash-grid dash-grid-even">
                <section className="card"><h2>Moyens enregistrés</h2>
                    {methods.length ? <ul className="method-list">{methods.map((m, index) => (
                        <li key={m.label}><Icon name={PAYMENT_METHODS[m.type].icon} /><span>{m.label}</span>
                            <button className="icon-btn" type="button" aria-label={`Retirer ${m.label}`} onClick={async () => {
                                if (!(await confirm({ title: 'Retirer ce moyen de paiement ?', confirm: 'Retirer', danger: true }))) return;
                                api.removeMethod(user, index);
                                toast('Moyen de paiement retiré.');
                            }}><Icon name="x-mark" size={18} /></button></li>
                    ))}</ul> : <p className="muted">Aucun moyen enregistré.</p>}
                </section>
                <section className="card card-soft"><h2><Icon name="lock-closed" />Paiement sécurisé</h2><p className="muted">Le paiement se fait chez Stripe, Flutterwave ou Wise. KWABO ne conserve jamais les données de votre carte.</p></section>
            </div>
        </Page>
    );
}

/* ---------- Parrainage ---------- */
const REFERRAL_REWARD_EXAMPLE = 10;

export function Referral() {
    const user = useUser('client');
    const { toast } = useFeedback();
    const referrals = api.referralsOf(user);
    const activeCount = referrals.filter((r) => r.status === 'Actif').length;
    const text = `Je te recommande KWABO pour tes projets au Bénin. Mon code de parrainage : ${user.referralCode}`;
    const copy = async () => { try { await navigator.clipboard.writeText(user.referralCode); toast('Copié.'); } catch { toast(`À copier : ${user.referralCode}`); } };
    return (
        <Page title="Parrainage" subtitle="Recommandez KWABO à vos proches">
            <section className="welcome welcome-photo welcome-center">
                <Photo name="marche-ganvie" eager />
                <div><h2>Votre code de parrainage</h2><p className="referral-code">{user.referralCode}</p></div>
                <div className="btn-row">
                    <button className="btn btn-gold" type="button" onClick={copy}><Icon name="clipboard-document" size={18} />Copier le code</button>
                    <a className="btn btn-outline-light" href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener"><WhatsAppIcon />Partager</a>
                </div>
            </section>
            <StatRow items={[
                { icon: 'user-group', value: referrals.length, label: 'Filleuls' },
                { icon: 'check-circle', value: activeCount, label: 'Filleuls actifs', tone: 'green' },
                { icon: 'gift', value: activeCount * REFERRAL_REWARD_EXAMPLE, format: money, label: 'Récompenses', tone: 'gold' },
            ]} />
            <p className="notice"><Icon name="information-circle" />Exemple : {REFERRAL_REWARD_EXAMPLE} € par filleul actif. Le montant réel reste à fixer par KWABO.</p>
            <div className="dash-grid">
                <section className="card"><h2>Mes filleuls</h2>
                    {referrals.length ? <ul className="referral-list">{referrals.map((r) => (
                        <li key={r.name}><Avatar name={r.name} size="avatar-sm" /><span><strong>{r.name}</strong><small>Depuis le {fmtDate(r.at)}</small></span><span className={`badge ${r.status === 'Actif' ? 'badge-green' : 'badge-neutral'}`}>{r.status}</span></li>
                    ))}</ul> : <EmptyState icon="user-group" title="Aucun filleul" body="Partagez votre code pour commencer." />}
                </section>
                <section className="card"><h2>Comment ça marche</h2><ol className="mini-steps"><li>Partagez votre code à un proche.</li><li>Il crée son compte avec votre code.</li><li>Sa première mission payée vous donne une récompense.</li></ol></section>
            </div>
        </Page>
    );
}

/* ---------- Profil ---------- */
export function Profile() {
    const user = useUser('client');
    const navigate = useNavigate();
    const { open, close, confirm, toast } = useFeedback();
    const info = useFormErrors();
    const pass = useFormErrors();

    const saveInfo = (event) => {
        event.preventDefault();
        const v = formValues(event.currentTarget);
        const found = {};
        if (!v.firstName.trim()) found.firstName = 'Saisissez votre prénom.';
        if (!v.lastName.trim()) found.lastName = 'Saisissez votre nom.';
        if (v.phone.replace(/\D/g, '').length < 6) found.phone = 'Saisissez un numéro valide.';
        if (!v.country) found.country = 'Choisissez votre pays.';
        if (!info.setErrors(found)) return;
        api.updateProfile(user, { firstName: v.firstName.trim(), lastName: v.lastName.trim(), phone: v.phone.trim(), country: v.country });
        toast('Informations enregistrées.');
    };
    const savePassword = (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const found = {};
        if (!form.elements.current.value) found.current = 'Saisissez votre mot de passe actuel.';
        const problem = passwordProblem(form.elements.next.value);
        if (problem) found.next = problem;
        if (!pass.setErrors(found)) return;
        try {
            api.changePassword(user, form.elements.current.value, form.elements.next.value);
            form.reset();
            toast('Mot de passe changé.');
        } catch (error) { pass.fromApi(error, 'current'); }
    };
    const toggleTwoFactor = async () => {
        if (user.twoFactor) {
            if (!(await confirm({ title: 'Désactiver la double authentification ?', body: 'Votre compte sera moins bien protégé.', confirm: 'Désactiver', danger: true }))) return;
            api.updateProfile(user, { twoFactor: false });
            toast('Double authentification désactivée.');
            return;
        }
        open(<EnableTwoFactor onDone={() => { api.updateProfile(user, { twoFactor: true }); close(); toast('Double authentification activée.'); }} />);
    };
    const logoutEverywhere = async () => {
        if (!(await confirm({ title: 'Déconnecter tous vos appareils ?', body: 'Vous devrez vous reconnecter partout.', confirm: 'Déconnecter' }))) return;
        api.logout('client');
        navigate('/connexion');
    };
    const deleteAccount = async () => {
        if (!(await confirm({ title: 'Supprimer définitivement votre compte ?', body: 'Vos demandes, documents, messages et factures seront effacés. Cette action est irréversible.', confirm: 'Supprimer mon compte', danger: true }))) return;
        api.deleteAccount(user);
        toast('Votre compte et vos données ont été supprimés.');
        navigate('/');
    };
    const reset = async () => {
        if (!(await confirm({ title: 'Réinitialiser la démonstration ?', body: 'Les données créées pendant vos essais seront effacées.', confirm: 'Réinitialiser', danger: true }))) return;
        resetDemo();
        toast('Démonstration réinitialisée.');
        navigate('/connexion');
    };
    return (
        <Page title="Mon profil" subtitle={user.email}>
            <div className="dash-grid dash-grid-even">
                <div className="stack">
                    <form className="card form-card" ref={info.formRef} onSubmit={saveInfo} noValidate key={`info-${user.id}`}>
                        <h2>Mes informations</h2>
                        <div className="form-grid">
                            <Field name="firstName" label="Prénom" required defaultValue={user.firstName} autoComplete="given-name" error={info.errors.firstName} />
                            <Field name="lastName" label="Nom" required defaultValue={user.lastName} autoComplete="family-name" error={info.errors.lastName} />
                        </div>
                        <Field name="email" label="E-mail" type="email" defaultValue={user.email} optionalMark={false} readOnly hint="Pour le changer, écrivez-nous : il sera vérifié à nouveau." />
                        <Field name="phone" label="Téléphone" type="tel" required defaultValue={user.phone} autoComplete="tel" error={info.errors.phone} />
                        <Field name="country" label="Pays de résidence" type="select" required defaultValue={user.country} options={COUNTRIES} error={info.errors.country} />
                        <button className="btn btn-primary" type="submit">Enregistrer</button>
                    </form>
                    <form className="card form-card" ref={pass.formRef} onSubmit={savePassword} noValidate>
                        <h2>Mot de passe</h2>
                        <FormError message={pass.errors._} />
                        <Field name="current" label="Mot de passe actuel" type="password" required autoComplete="current-password" error={pass.errors.current} />
                        <Field name="next" label="Nouveau mot de passe" type="password" required autoComplete="new-password" hint="Au moins 8 caractères, avec 1 majuscule et 1 chiffre." error={pass.errors.next} />
                        <button className="btn btn-primary" type="submit">Changer le mot de passe</button>
                    </form>
                </div>
                <div className="stack">
                    <section className="card"><h2>Sécurité</h2>
                        <div className="setting"><span className="tile tile-sm"><Icon name="shield-check" size={18} /></span><div><strong>Double authentification</strong><small>{user.twoFactor ? 'Activée. Un code est demandé à chaque connexion.' : 'Désactivée. Ajoutez un code à chaque connexion.'}</small></div>
                            <button className="btn btn-ghost btn-sm" type="button" onClick={toggleTwoFactor}>{user.twoFactor ? 'Désactiver' : 'Activer'}</button></div>
                        <div className="setting"><span className="tile tile-sm"><Icon name="arrow-right-on-rectangle" size={18} /></span><div><strong>Tous mes appareils</strong><small>Vous déconnecte partout, y compris ici.</small></div>
                            <button className="btn btn-ghost btn-sm" type="button" onClick={logoutEverywhere}>Déconnecter</button></div>
                    </section>
                    <section className="card"><h2>Notifications par e-mail</h2>
                        <div className="pref-list">{NOTIFICATION_PREFS.map((p) => (
                            <label className="switch" key={p.key}><span>{p.label}</span>
                                <input type="checkbox" checked={Boolean(user.prefs[p.key])} onChange={(event) => { api.updateProfile(user, { prefs: { ...user.prefs, [p.key]: event.target.checked } }); toast('Préférence enregistrée.'); }} />
                                <span className="switch-track" aria-hidden="true" /></label>
                        ))}</div>
                    </section>
                    <section className="card"><h2>Mes données</h2>
                        <p className="muted">Supprimer votre compte efface définitivement vos demandes, documents, messages et factures.</p>
                        <div className="btn-row"><Link className="btn btn-ghost" to="/confidentialite">Confidentialité</Link><button className="btn btn-danger-ghost" type="button" onClick={deleteAccount}><Icon name="x-circle" size={18} />Supprimer mon compte</button></div>
                    </section>
                    <section className="card card-soft"><h2>Démonstration</h2><p className="muted">Remet les comptes et les données d'exemple à leur état de départ.</p><button className="btn btn-ghost" type="button" onClick={reset}>Réinitialiser la démo</button></section>
                </div>
            </div>
        </Page>
    );
}

export function EnableTwoFactor({ onDone }) {
    const { close } = useFeedback();
    const { errors, setErrors, formRef } = useFormErrors();
    return (
        <>
            <h2 className="dialog-title" id="dialog-heading">Activer la double authentification</h2>
            <p className="muted">Scannez le QR code avec une application d'authentification, puis saisissez le code affiché.</p>
            <div className="doc-preview"><Icon name="shield-check" size={48} /><p className="muted">Le QR code s'affichera ici. Pour la démonstration, le code est 123456.</p></div>
            <form ref={formRef} noValidate onSubmit={(event) => {
                event.preventDefault();
                if (!setErrors(event.currentTarget.elements.twoFactorCode.value.trim() === '123456' ? {} : { twoFactorCode: 'Code incorrect.' })) return;
                onDone();
            }}>
                <Field name="twoFactorCode" label="Code à 6 chiffres" required autoComplete="one-time-code" inputMode="numeric" maxLength={6} error={errors.twoFactorCode} />
                <div className="dialog-actions"><button className="btn btn-ghost" type="button" onClick={close}>Annuler</button><button className="btn btn-primary" type="submit">Activer</button></div>
            </form>
        </>
    );
}
