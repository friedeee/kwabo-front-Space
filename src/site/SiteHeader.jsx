import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import { fullName } from '../api/db.js';
import { useUser } from '../api/hooks.js';
import { Icon } from '../ui/Icon.jsx';
import { Avatar, Logo } from '../ui/kit.jsx';
import { SearchBox } from '../ui/services.jsx';

/* En-tête : transparent sur la photo de l'accueil, puis blanc dès qu'on défile. */
export function SiteHeader() {
    const user = useUser('client');
    const location = useLocation();
    const onHome = location.pathname === '/';
    const [scrolled, setScrolled] = useState(false);
    const [open, setOpen] = useState(false);
    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 40);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);
    useEffect(() => setOpen(false), [location.pathname, location.hash]);
    const overlay = onHome && !scrolled && !open;
    return (
        <header className={`site-header ${overlay ? 'is-overlay' : ''}`}>
            <div className="container site-header-inner">
                <Logo light={overlay} />
                {!onHome && <div className="site-header-search"><SearchBox placeholder="Cherchez un service…" /></div>}
                <button className="menu-toggle" type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="site-nav" aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}>
                    <Icon name={open ? 'x-mark' : 'bars-3'} size={24} />
                </button>
                <nav className={`site-nav ${open ? 'open' : ''}`} id="site-nav" aria-label="Navigation principale">
                    <NavLink to="/services">Services</NavLink>
                    <Link to="/#confiance">Confiance</Link>
                    <Link to="/#faq">FAQ</Link>
                    {user
                        ? <Link className="user-pill" to="/espace"><Avatar name={fullName(user)} size="avatar-sm" /><span>Mon espace</span></Link>
                        : <><Link to="/connexion">Se connecter</Link><Link className="btn btn-primary" to="/inscription">S'inscrire</Link></>}
                </nav>
            </div>
        </header>
    );
}
