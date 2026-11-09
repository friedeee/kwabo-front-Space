import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { api, db, fullName, serviceById } from '../api/db.js';
import { useUser } from '../api/hooks.js';
import { STATUS } from '../data/catalog.js';
import { Icon } from '../ui/Icon.jsx';
import { Avatar, Photo } from '../ui/kit.jsx';
import { AppLayout } from '../ui/layouts.jsx';
import { normalize } from '../ui/format.js';

export const ADMIN_ONLY = ['indicateurs', 'paiements', 'clients', 'avis', 'parrainage', 'catalogue', 'equipe', 'journal'];

/* Recherche globale : demandes et clients, avec vignettes. */
function GlobalSearch({ user }) {
    const [q, setQ] = useState('');
    const [open, setOpen] = useState(false);
    const box = useRef(null);
    const location = useLocation();
    useEffect(() => { setOpen(false); setQ(''); }, [location.pathname]);
    useEffect(() => {
        const onClick = (event) => { if (!box.current?.contains(event.target)) setOpen(false); };
        document.addEventListener('click', onClick);
        return () => document.removeEventListener('click', onClick);
    }, []);
    const needle = normalize(q.trim());
    const requests = needle.length >= 2 ? api.visibleRequests(user).filter((r) => normalize(`${r.title} ${r.tracking}`).includes(needle)).slice(0, 5) : [];
    const clients = needle.length >= 2 && user.role === 'ADMIN' ? api.clients().filter((c) => normalize(`${fullName(c)} ${c.email}`).includes(needle)).slice(0, 4) : [];
    return (
        <div className="search admin-search" role="search" ref={box} onKeyDown={(event) => { if (event.key === 'Escape') setOpen(false); }}>
            <Icon name="magnifying-glass" size={18} />
            <label className="sr-only" htmlFor="admin-search-all">Rechercher une demande ou un client</label>
            <input id="admin-search-all" type="search" autoComplete="off" placeholder="Demande, client, n° de suivi…" value={q} onChange={(event) => { setQ(event.target.value); setOpen(true); }} onFocus={() => setOpen(true)} />
            <AnimatePresence>
                {open && needle.length >= 2 && (
                    <motion.div className="search-results" id="admin-search-list" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                        {requests.length + clients.length ? <>
                            {requests.map((r) => (
                                <Link key={r.id} className="search-result" to={`/admin/demandes/${r.id}`}><span className="search-thumb"><Photo name={serviceById(r.serviceId).image} small /></span><span><strong>{r.title}</strong><small>{r.tracking} · {STATUS[r.status].label}</small></span></Link>
                            ))}
                            {clients.map((c) => (
                                <Link key={c.id} className="search-result" to={`/admin/clients/${c.id}`}><Avatar name={fullName(c)} size="avatar-sm" /><span><strong>{fullName(c)}</strong><small>{c.email}</small></span></Link>
                            ))}
                        </> : <p className="search-empty">Aucun résultat pour « {q.trim()} ».</p>}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

/* Administration : administrateurs (tout) et agents terrain (leurs missions). */
export default function AdminLayout() {
    const user = useUser('admin');
    const location = useLocation();
    if (!user) return <Navigate to="/admin/connexion" replace />;
    const section = location.pathname.split('/')[2];
    if (ADMIN_ONLY.includes(section) && user.role !== 'ADMIN') return <Navigate to="/admin" replace />;
    const isAdmin = user.role === 'ADMIN';
    const unread = api.unreadMessages(user);
    const pendingReviews = db.reviews.filter((a) => a.status === 'pending').length;
    const nav = isAdmin ? [
        { heading: 'Pilotage' },
        { to: '/admin', icon: 'squares-2x2', label: 'Vue d\'ensemble', end: true },
        { to: '/admin/indicateurs', icon: 'chart-bar', label: 'Indicateurs' },
        { heading: 'Opérations' },
        { to: '/admin/demandes', icon: 'clipboard-document-list', label: 'Demandes' },
        { to: '/admin/messages', icon: 'chat-bubble-left-right', label: 'Messagerie', badge: unread },
        { to: '/admin/paiements', icon: 'banknotes', label: 'Paiements' },
        { heading: 'Clients' },
        { to: '/admin/clients', icon: 'users', label: 'Clients' },
        { to: '/admin/avis', icon: 'star', label: 'Avis', badge: pendingReviews },
        { to: '/admin/parrainage', icon: 'gift', label: 'Parrainage' },
        { heading: 'Configuration' },
        { to: '/admin/catalogue', icon: 'adjustments-horizontal', label: 'Catalogue' },
        { to: '/admin/equipe', icon: 'user-group', label: 'Équipe et rôles' },
        { to: '/admin/journal', icon: 'document-check', label: 'Journal d\'activité' },
    ] : [
        { to: '/admin', icon: 'squares-2x2', label: 'Mes missions', end: true },
        { to: '/admin/demandes', icon: 'clipboard-document-list', label: 'Demandes attribuées' },
        { to: '/admin/messages', icon: 'chat-bubble-left-right', label: 'Messagerie', badge: unread },
    ];
    return (
        <AppLayout
            area="admin"
            user={user}
            nav={nav}
            whatsapp={false}
            profileTo="/admin/compte"
            bellTo="/admin/notifications"
            bellCount={api.notificationsOf(user).filter((n) => !n.read).length}
            search={<GlobalSearch user={user} />}
        />
    );
}
