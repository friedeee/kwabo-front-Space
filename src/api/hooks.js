import { useSyncExternalStore } from 'react';
import { currentUser, getVersion, subscribe } from './db.js';

/* Redessine le composant à chaque changement de données (ici ou dans une autre fenêtre). */
export function useData() {
    return useSyncExternalStore(subscribe, getVersion);
}

/* Utilisateur connecté sur l'espace client ('client') ou sur l'administration ('admin'). */
export function useUser(area = 'client') {
    useData();
    return currentUser(area);
}
