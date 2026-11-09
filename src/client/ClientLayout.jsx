import { Navigate, useLocation } from 'react-router';
import { api } from '../api/db.js';
import { useUser } from '../api/hooks.js';
import { AppLayout } from '../ui/layouts.jsx';

/* Espace client : réservé aux comptes clients connectés. */
export default function ClientLayout() {
    const user = useUser('client');
    const location = useLocation();
    if (!user) return <Navigate to={`/connexion?suite=${encodeURIComponent(location.pathname + location.search)}`} replace />;
    const unreadMessages = api.unreadMessages(user);
    const unreadNotifications = api.notificationsOf(user).filter((n) => !n.read).length;
    const dueCount = api.invoicesOf(user).filter((i) => i.status === 'due').length;
    return (
        <AppLayout
            area="client"
            user={user}
            bellTo="/espace/notifications"
            bellCount={unreadNotifications}
            profileTo="/espace/profil"
            nav={[
                { to: '/espace', icon: 'home', label: 'Tableau de bord', end: true },
                { to: '/espace/services', icon: 'squares-2x2', label: 'Catalogue' },
                { to: '/espace/nouvelle-demande', icon: 'plus-circle', label: 'Nouvelle demande' },
                { to: '/espace/demandes', icon: 'clipboard-document-list', label: 'Mes demandes' },
                { to: '/espace/documents', icon: 'folder', label: 'Mes documents' },
                { to: '/espace/messages', icon: 'chat-bubble-left-right', label: 'Messagerie', badge: unreadMessages },
                { to: '/espace/paiements', icon: 'credit-card', label: 'Paiements', badge: dueCount },
                { to: '/espace/parrainage', icon: 'gift', label: 'Parrainage' },
                { to: '/espace/profil', icon: 'user', label: 'Mon profil' },
            ]}
            tabs={[
                { to: '/espace', icon: 'home', label: 'Accueil', end: true },
                { to: '/espace/demandes', icon: 'clipboard-document-list', label: 'Demandes' },
                { to: '/espace/nouvelle-demande', icon: 'plus', label: 'Nouvelle', primary: true },
                { to: '/espace/messages', icon: 'chat-bubble-left-right', label: 'Messages', badge: unreadMessages },
                { to: '/espace/profil', icon: 'user', label: 'Profil' },
            ]}
        />
    );
}
