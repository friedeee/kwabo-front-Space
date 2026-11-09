import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, NavLink, useLocation, useNavigate, useOutlet } from 'react-router';
import { motion } from 'motion/react';
import { api, fullName } from '../api/db.js';
import { Icon, WhatsAppIcon } from './Icon.jsx';
import { Avatar, Logo, Photo, WhatsAppFloat } from './kit.jsx';
import { useFeedback } from './feedback.jsx';
import { waLink } from './format.js';

/*
 * Contenu de page qui apparaît en fondu à chaque changement d'adresse.
 * Pas d'animation de sortie : l'ancienne page se redessinerait avec l'adresse de la nouvelle.
 */
function AnimatedOutlet({ className = '' }) {
    const outlet = useOutlet();
    const location = useLocation();
    const first = useRef(true);
    useEffect(() => {
        if (first.current) { first.current = false; return; }
        window.scrollTo(0, 0);
        document.getElementById('main')?.focus({ preventScroll: true });
    }, [location.pathname]);
    return (
        <motion.div key={location.pathname} className={className} initial={first.current ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease: 'easeOut' }}>
            {outlet}
        </motion.div>
    );
}

const usePageTitle = (title, suffix = 'KWABO') => useEffect(() => { document.title = title ? `${title} · ${suffix}` : suffix; }, [title, suffix]);

/* ---------- Espaces connectés (client et administration) ---------- */
const SlotContext = createContext(null);

function SideLink({ item }) {
    if (item.heading) return <p className="side-heading">{item.heading}</p>;
    return (
        <NavLink className="side-link" to={item.to} end={item.end}>
            <Icon name={item.icon} /><span>{item.label}</span>
            {item.badge ? <motion.span className="count" key={item.badge} initial={{ scale: 0.4 }} animate={{ scale: 1 }}>{item.badge}</motion.span> : null}
        </NavLink>
    );
}

export function AppLayout({ area, user, nav, tabs, bellTo, bellCount = 0, whatsapp = true, profileTo, search = null, legalPrefix = '' }) {
    const [slot, setSlot] = useState(null);
    const [open, setOpen] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const { toast } = useFeedback();
    useEffect(() => setOpen(false), [location.pathname]);
    useEffect(() => {
        if (!open) return undefined;
        const onKey = (event) => { if (event.key === 'Escape') setOpen(false); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open]);
    const logout = () => {
        api.logout(area);
        toast('Vous êtes déconnecté.');
        navigate(area === 'admin' ? '/admin/connexion' : '/connexion');
    };
    const UserTag = profileTo ? Link : 'div';
    return (
        <div className={`app app-${area}`}>
            <a className="skip-link" href="#main" onClick={(event) => { event.preventDefault(); document.getElementById('main')?.focus(); }}>Aller au contenu</a>
            <aside className={`sidebar ${open ? 'open' : ''}`} id="sidebar" aria-label="Menu de l'espace">
                <div className="sidebar-top"><Logo light to={area === 'admin' ? '/admin' : '/'} /><button className="sidebar-close" type="button" onClick={() => setOpen(false)} aria-label="Fermer le menu"><Icon name="x-mark" size={22} /></button></div>
                <nav className="side-nav">{nav.map((item) => <SideLink key={item.to ?? item.heading} item={item} />)}</nav>
                <div className="sidebar-foot">
                    {whatsapp && <a className="side-whatsapp" href={waLink()} target="_blank" rel="noopener"><WhatsAppIcon /><span>WhatsApp</span></a>}
                    <UserTag {...(profileTo ? { to: profileTo } : {})} className="side-user"><Avatar name={fullName(user)} /><span><strong>{fullName(user)}</strong><small>{user.email}</small></span></UserTag>
                    <button className="side-link side-logout" type="button" onClick={logout}><Icon name="arrow-right-on-rectangle" /><span>Se déconnecter</span></button>
                    {whatsapp && <p className="side-legal"><Link to={`${legalPrefix}/confidentialite`}>Confidentialité</Link> · <Link to={`${legalPrefix}/cgu`}>CGU</Link></p>}
                </div>
            </aside>
            {open && <div className="sidebar-overlay" onClick={() => setOpen(false)} />}
            <div className="app-main">
                <header className="topbar">
                    <button className="icon-btn menu-btn" type="button" onClick={() => setOpen(true)} aria-label="Ouvrir le menu" aria-controls="sidebar" aria-expanded={open}><Icon name="bars-3" size={24} /></button>
                    <div className="topbar-title" ref={setSlot} />
                    <div className="topbar-actions">
                        {search}
                        {bellTo && (
                            <Link className="icon-btn" to={bellTo} aria-label={`Notifications, ${bellCount} non lues`}>
                                <Icon name="bell" size={22} />
                                {bellCount > 0 && <motion.span className="dot-count" key={bellCount} initial={{ scale: 0 }} animate={{ scale: 1 }}>{bellCount}</motion.span>}
                            </Link>
                        )}
                    </div>
                </header>
                <SlotContext.Provider value={slot}>
                    <main className="app-content-host" id="main" tabIndex={-1}>
                        <AnimatedOutlet className="app-content" />
                    </main>
                </SlotContext.Provider>
            </div>
            {tabs && (
                <nav className="tabbar" aria-label="Accès rapide">
                    {tabs.map((t) => (
                        <NavLink key={t.to} to={t.to} end={t.end} className={t.primary ? 'tab-primary' : ''}>
                            <Icon name={t.icon} size={22} /><span>{t.label}</span>{t.badge ? <span className="dot-count">{t.badge}</span> : null}
                        </NavLink>
                    ))}
                </nav>
            )}
            {whatsapp && <WhatsAppFloat />}
        </div>
    );
}

/* Chaque page place son titre et ses actions dans la barre du haut. */
export function Page({ title, subtitle, actions, children, suffix }) {
    const slot = useContext(SlotContext);
    usePageTitle(title, suffix);
    return (
        <>
            {slot && createPortal(
                <div className="topbar-heading">
                    <motion.h1 key={title} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}>{title}</motion.h1>
                    {subtitle && <p>{subtitle}</p>}
                    {actions && <div className="topbar-page-actions">{actions}</div>}
                </div>,
                slot,
            )}
            {children}
        </>
    );
}

/* ---------- Site public ---------- */
export function SiteLayout({ header }) {
    return (
        <>
            <a className="skip-link" href="#main" onClick={(event) => { event.preventDefault(); document.getElementById('main')?.focus(); }}>Aller au contenu</a>
            {header}
            <main id="main" tabIndex={-1}><AnimatedOutlet /></main>
            <SiteFooter />
            <WhatsAppFloat />
        </>
    );
}

export function SitePage({ title, children }) {
    usePageTitle(title);
    return children;
}

function SiteFooter() {
    return (
        <footer className="site-footer">
            <div className="footer-photo" aria-hidden="true"><Photo name="ganvie" /></div>
            <div className="container footer-grid">
                <div className="footer-brand">
                    <Logo light />
                    <p>Votre présence de confiance au Bénin. Kwabo signifie « bienvenue » en fon.</p>
                    <a className="btn btn-outline-light" href={waLink()} target="_blank" rel="noopener"><WhatsAppIcon />WhatsApp</a>
                </div>
                <div><h3>Services</h3><ul>
                    <li><Link to="/services?cat=immobilier">Immobilier & Foncier</Link></li>
                    <li><Link to="/services?cat=famille">Famille & Santé</Link></li>
                    <li><Link to="/services?cat=demarches">Démarches & Administratif</Link></li>
                    <li><Link to="/services?cat=logistique">Logistique & Transferts</Link></li>
                </ul></div>
                <div><h3>KWABO</h3><ul>
                    <li><Link to="/#comment">Comment ça marche</Link></li>
                    <li><Link to="/#confiance">Notre engagement</Link></li>
                    <li><Link to="/#faq">Questions fréquentes</Link></li>
                    <li><Link to="/espace">Mon espace client</Link></li>
                    <li><Link to="/admin">Espace équipe</Link></li>
                </ul></div>
                <div><h3>Légal</h3><ul>
                    <li><Link to="/mentions-legales">Mentions légales</Link></li>
                    <li><Link to="/confidentialite">Confidentialité</Link></li>
                    <li><Link to="/cgu">CGU</Link></li>
                    <li><Link to="/credits-photos">Crédits photos</Link></li>
                </ul></div>
            </div>
            <div className="container footer-bottom"><span>© 2026 KWABO Services · Cotonou, Bénin</span><span>Conçu pour la diaspora béninoise</span></div>
        </footer>
    );
}

/* ---------- Connexion : formulaire à droite, photo du Bénin à gauche ---------- */
export function AuthLayout({ title, photo = 'abomey', heading, points, foot, children, legal }) {
    usePageTitle(title);
    return (
        <div className="auth">
            <aside className="auth-aside">
                <motion.div className="auth-photo" initial={{ scale: 1.08 }} animate={{ scale: 1 }} transition={{ duration: 1.6, ease: 'easeOut' }}><Photo name={photo} eager /></motion.div>
                <Logo light />
                <div>
                    <motion.h2 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>{heading}</motion.h2>
                    <ul className="auth-points">
                        {points.map(([icon, strong, small], index) => (
                            <motion.li key={strong} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 + index * 0.08 }}>
                                <span className="trust-card-icon"><Icon name={icon} size={20} /></span><span><strong>{strong}</strong><small>{small}</small></span>
                            </motion.li>
                        ))}
                    </ul>
                </div>
                <p className="auth-foot">{foot}</p>
            </aside>
            <main className="auth-main" id="main" tabIndex={-1}>
                <div className="auth-mobile-logo"><Logo /></div>
                <motion.div className="auth-card" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>{children}</motion.div>
                <p className="auth-legal">{legal}</p>
            </main>
            <WhatsAppFloat />
        </div>
    );
}
