import { WHATSAPP } from '../data/catalog.js';

export const normalize = (value) => String(value ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
export const fmtDate = (iso) => new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
export const fmtDateTime = (iso) => new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
export const money = (amount) => `${Number(amount).toLocaleString('fr-FR')} €`;
export const initials = (name) => name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
export const plural = (n, word) => `${n} ${word}${n > 1 ? 's' : ''}`;
export const waLink = (text = 'Bonjour KWABO, j\'ai une question.') => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`;

/* Photos libres de droits (voir la page Crédits photos). La version 500 px sert aux vignettes. */
export const photo = (name, small = false) => `/photos/${name}${small ? '-500' : ''}.jpg`;

export function passwordProblem(password) {
    if (password.length < 8 || !/[A-ZÀ-Ý]/.test(password) || !/\d/.test(password)) return 'Au moins 8 caractères, avec 1 majuscule et 1 chiffre.';
    return null;
}

/* Téléchargement réel d'un fichier CSV lisible par Excel, protégé contre les formules. */
export function downloadCsv(filename, rows) {
    const safe = (value) => {
        const text = String(value ?? '');
        return `"${(/^[=+\-@]/.test(text) ? `'${text}` : text).replace(/"/g, '""')}"`;
    };
    const blob = new Blob([`﻿${rows.map((row) => row.map(safe).join(';')).join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
}
