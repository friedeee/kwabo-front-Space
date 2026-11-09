import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router';
import { api, resetDemo, session } from '../api/db.js';
import { useUser } from '../api/hooks.js';
import { COUNTRIES, DIAL_CODES } from '../data/catalog.js';
import { Icon } from '../ui/Icon.jsx';
import { Field, FormError, formValues, useFormErrors } from '../ui/Field.jsx';
import { useFeedback } from '../ui/feedback.jsx';
import { AuthLayout } from '../ui/layouts.jsx';
import { TRUST_POINTS } from '../ui/services.jsx';
import { passwordProblem } from '../ui/format.js';

const POINTS = TRUST_POINTS.map((t) => [t.icon, t.title, t.text]);
const legal = <><Link to="/confidentialite">Confidentialité</Link> · <Link to="/cgu">CGU</Link> · <Link to="/">Retour au site</Link></>;

function ClientAuth({ title, photo, children }) {
    return <AuthLayout title={title} photo={photo} heading={<>Votre présence de confiance <em>au Bénin</em></>} points={POINTS} foot="Kwabo : « bienvenue » en fon." legal={legal}>{children}</AuthLayout>;
}

export function LoginPage() {
    const user = useUser('client');
    const [params] = useSearchParams();
    const next = params.get('suite') || '/espace';
    const navigate = useNavigate();
    const { toast, confirm } = useFeedback();
    const { errors, setErrors, fromApi, formRef } = useFormErrors();
    const [pending, setPending] = useState(null);
    if (user && !pending) return <Navigate to={next} replace />;

    const submit = (event) => {
        event.preventDefault();
        const v = formValues(event.currentTarget);
        const found = {};
        if (!v.email.includes('@')) found.email = 'Saisissez une adresse e-mail valide.';
        if (!v.password) found.password = 'Saisissez votre mot de passe.';
        if (!setErrors(found)) return;
        try {
            const result = api.login({ email: v.email, password: v.password, remember: Boolean(v.remember), area: 'client' });
            if (result.needsCode) { setPending({ email: v.email, password: v.password, remember: Boolean(v.remember) }); return; }
            navigate(next);
        } catch (error) { fromApi(error, 'email'); }
    };
    const submitCode = (event) => {
        event.preventDefault();
        try {
            api.login({ ...pending, code: event.currentTarget.elements.code.value.trim(), area: 'client' });
            setPending(null);
            navigate(next);
        } catch (error) { fromApi(error, 'code'); }
    };
    const fillDemo = () => {
        formRef.current.elements.email.value = 'client@kwabo.demo';
        formRef.current.elements.password.value = 'Demo1234';
        setErrors({});
        formRef.current.querySelector('button[type="submit"]').focus();
    };
    const reset = async () => {
        if (!(await confirm({ title: 'Réinitialiser la démonstration ?', body: 'Les données créées pendant vos essais seront effacées.', confirm: 'Réinitialiser', danger: true }))) return;
        resetDemo();
        toast('Démonstration réinitialisée.');
    };

    if (pending) {
        return (
            <ClientAuth title="Code de vérification" photo="ganvie">
                <h1>Code de vérification</h1>
                <p className="muted">Saisissez le code à 6 chiffres de votre application d'authentification.</p>
                <form ref={formRef} onSubmit={submitCode} noValidate>
                    <Field name="code" label="Code" required autoComplete="one-time-code" hint="Démonstration : 123456" inputMode="numeric" maxLength={6} autoFocus error={errors.code} />
                    <button className="btn btn-primary btn-lg btn-block" type="submit">Vérifier</button>
                </form>
                <button className="link-btn" type="button" onClick={() => setPending(null)}><Icon name="arrow-left" size={16} />Retour</button>
            </ClientAuth>
        );
    }
    return (
        <ClientAuth title="Connexion" photo="abomey">
            <h1>Bon retour</h1>
            <p className="muted">Connectez-vous à votre espace KWABO.</p>
            <form ref={formRef} onSubmit={submit} noValidate>
                <FormError message={errors._} />
                <Field name="email" label="E-mail" type="email" required autoComplete="username" placeholder="vous@exemple.com" error={errors.email} />
                <Field name="password" label="Mot de passe" type="password" required autoComplete="current-password" error={errors.password} />
                <div className="form-row-between">
                    <label className="check"><input type="checkbox" name="remember" />Rester connecté</label>
                    <Link to="/mot-de-passe-oublie">Mot de passe oublié ?</Link>
                </div>
                <button className="btn btn-primary btn-lg btn-block" type="submit">Se connecter</button>
            </form>
            <p className="auth-switch">Pas encore de compte ? <Link to={`/inscription${params.get('suite') ? `?suite=${encodeURIComponent(next)}` : ''}`}>Créer un compte</Link></p>
            <div className="demo-accounts">
                <p>Démonstration</p>
                <div>
                    <button className="btn btn-ghost btn-sm" type="button" onClick={fillDemo}>Remplir le compte client</button>
                    <Link className="btn btn-ghost btn-sm" to="/admin/connexion">Espace équipe</Link>
                </div>
                <button className="link-btn" type="button" onClick={reset}>Réinitialiser la démo</button>
            </div>
        </ClientAuth>
    );
}

export function RegisterPage() {
    const user = useUser('client');
    const [params] = useSearchParams();
    const service = params.get('service');
    const next = params.get('suite') ?? (service ? `/espace/nouvelle-demande?service=${service}` : '/espace');
    const navigate = useNavigate();
    const { errors, setErrors, fromApi, formRef } = useFormErrors();
    if (user) return <Navigate to={next} replace />;
    const submit = (event) => {
        event.preventDefault();
        const v = formValues(event.currentTarget);
        const found = {};
        if (!v.firstName?.trim()) found.firstName = 'Saisissez votre prénom.';
        if (!v.lastName?.trim()) found.lastName = 'Saisissez votre nom.';
        if (!/^\S+@\S+\.\S+$/.test(v.email ?? '')) found.email = 'Saisissez une adresse e-mail valide.';
        if ((v.phone ?? '').replace(/\D/g, '').length < 6) found.phone = 'Saisissez un numéro valide.';
        if (!v.country) found.country = 'Choisissez votre pays.';
        const problem = passwordProblem(v.password ?? '');
        if (problem) found.password = problem;
        if (!v.terms) found.terms = 'Vous devez accepter les conditions pour continuer.';
        if (!setErrors(found)) return;
        try {
            const created = api.register(v);
            navigate('/verification-email', { state: { email: created.email, next } });
        } catch (error) { fromApi(error, 'email'); }
    };
    return (
        <ClientAuth title="Créer un compte" photo="ganvie-pirogue">
            <h1>Créer mon compte</h1>
            <p className="muted">Gratuit, sans engagement, en moins d'une minute.</p>
            <form ref={formRef} onSubmit={submit} noValidate>
                <FormError message={errors._} />
                <div className="form-grid">
                    <Field name="firstName" label="Prénom" required autoComplete="given-name" error={errors.firstName} />
                    <Field name="lastName" label="Nom" required autoComplete="family-name" error={errors.lastName} />
                </div>
                <Field name="email" label="E-mail" type="email" required autoComplete="email" placeholder="vous@exemple.com" error={errors.email} />
                <div className="form-grid form-grid-phone">
                    <Field name="dial" label="Indicatif" type="select" required placeholderOption={false} defaultValue="+33" options={DIAL_CODES} />
                    <Field name="phone" label="Téléphone" type="tel" required autoComplete="tel-national" error={errors.phone} />
                </div>
                <Field name="country" label="Pays de résidence" type="select" required options={COUNTRIES} autoComplete="country-name" error={errors.country} />
                <Field name="password" label="Mot de passe" type="password" required autoComplete="new-password" hint="Au moins 8 caractères, avec 1 majuscule et 1 chiffre." error={errors.password} />
                <Field name="sponsorCode" label="Code de parrainage" placeholder="KW-…" error={errors.sponsorCode} />
                <label className="check check-top" htmlFor="f-terms"><input type="checkbox" id="f-terms" name="terms" aria-invalid={errors.terms ? true : undefined} aria-describedby={errors.terms ? 'f-terms-error' : undefined} /><span>J'accepte les <Link to="/cgu">CGU</Link> et la <Link to="/confidentialite">politique de confidentialité</Link>.</span></label>
                {errors.terms && <p className="error" id="f-terms-error">{errors.terms}</p>}
                <button className="btn btn-primary btn-lg btn-block" type="submit">Créer mon compte</button>
            </form>
            <p className="auth-switch">Déjà un compte ? <Link to="/connexion">Se connecter</Link></p>
        </ClientAuth>
    );
}

export function VerifyEmailPage() {
    const { state } = useLocation();
    const navigate = useNavigate();
    const { toast } = useFeedback();
    const confirmEmail = () => {
        const user = api.verifyEmail(state.email);
        session.open('client', user.id, false);
        toast(`Bienvenue ${user.firstName}, votre compte est actif.`);
        navigate(state.next ?? '/espace');
    };
    return (
        <ClientAuth title="Vérifiez votre e-mail" photo="ouidah-porte">
            <span className="tile tile-lg mail-bounce"><Icon name="envelope" size={28} /></span>
            <h1>Vérifiez votre e-mail</h1>
            <p className="muted">Nous avons envoyé un lien de confirmation à <strong>{state?.email ?? 'votre adresse'}</strong>. Votre compte s'active dès que vous cliquez dessus.</p>
            {state?.email
                ? <div className="demo-accounts"><p>Démonstration : aucun e-mail n'est vraiment envoyé.</p><button className="btn btn-primary btn-block" type="button" onClick={confirmEmail}>Simuler le clic sur le lien</button></div>
                : <Link className="btn btn-primary btn-block" to="/connexion">Aller à la connexion</Link>}
        </ClientAuth>
    );
}

export function ForgotPage() {
    const navigate = useNavigate();
    const { errors, setErrors, formRef } = useFormErrors();
    const submit = (event) => {
        event.preventDefault();
        const email = event.currentTarget.elements.email.value.trim().toLowerCase();
        if (!setErrors(email.includes('@') ? {} : { email: 'Saisissez une adresse e-mail valide.' })) return;
        navigate('/reinitialiser-mot-de-passe', { state: { email } });
    };
    return (
        <ClientAuth title="Mot de passe oublié" photo="cotonou">
            <h1>Mot de passe oublié</h1>
            <p className="muted">Indiquez votre e-mail : nous vous enverrons un lien valable 1 heure.</p>
            <form ref={formRef} onSubmit={submit} noValidate>
                <Field name="email" label="E-mail" type="email" required autoComplete="email" error={errors.email} />
                <button className="btn btn-primary btn-lg btn-block" type="submit">Envoyer le lien</button>
            </form>
            <p className="auth-switch"><Link to="/connexion">Retour à la connexion</Link></p>
        </ClientAuth>
    );
}

export function ResetPage() {
    const { state } = useLocation();
    const navigate = useNavigate();
    const { toast } = useFeedback();
    const { errors, setErrors, fromApi, formRef } = useFormErrors();
    if (!state?.email) return <Navigate to="/mot-de-passe-oublie" replace />;
    const submit = (event) => {
        event.preventDefault();
        const password = event.currentTarget.elements.password.value;
        const problem = passwordProblem(password);
        if (!setErrors(problem ? { password: problem } : {})) return;
        try {
            api.resetPassword(state.email, password);
            toast('Mot de passe enregistré. Vous pouvez vous connecter.');
            navigate('/connexion');
        } catch (error) { fromApi(error); }
    };
    return (
        <ClientAuth title="Nouveau mot de passe" photo="cotonou">
            <h1>Nouveau mot de passe</h1>
            <p className="notice"><Icon name="information-circle" />Démonstration : en vrai, on arrive ici par le lien reçu par e-mail.</p>
            <form ref={formRef} onSubmit={submit} noValidate>
                <FormError message={errors._} />
                <Field name="password" label="Nouveau mot de passe" type="password" required autoComplete="new-password" hint="Au moins 8 caractères, avec 1 majuscule et 1 chiffre." error={errors.password} />
                <button className="btn btn-primary btn-lg btn-block" type="submit">Enregistrer</button>
            </form>
        </ClientAuth>
    );
}
