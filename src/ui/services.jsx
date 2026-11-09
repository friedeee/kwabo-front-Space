import { useEffect, useId, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { CATEGORIES, SERVICES } from '../data/catalog.js';
import { Icon } from './Icon.jsx';
import { EmptyState, Photo } from './kit.jsx';
import { normalize, waLink } from './format.js';

export const TRUST_POINTS = [
    { icon: 'video-camera', title: 'Vidéos et photos', text: 'Datées, pour voir le travail réalisé.' },
    { icon: 'receipt-percent', title: 'Reçus scannés', text: 'Pour chaque dépense engagée.' },
    { icon: 'document-check', title: 'Contrat signé', text: 'Avant le début de chaque mission.' },
    { icon: 'shield-check', title: 'Devis avant mission', text: 'Clair, sans frais cachés.' },
];

export function filterServices(q = '', category = 'all') {
    const needle = normalize(q.trim());
    return SERVICES.filter((s) => s.available && (category === 'all' || s.cat === category)
        && (!needle || normalize(`${s.name} ${s.short} ${s.included.join(' ')}`).includes(needle)));
}

export function TrustStrip() {
    return (
        <ul className="trust-strip" aria-label="Nos garanties">
            {TRUST_POINTS.map((t, index) => (
                <motion.li key={t.title} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.07 }}>
                    <span className="tile"><Icon name={t.icon} /></span><span><strong>{t.title}</strong><small>{t.text}</small></span>
                </motion.li>
            ))}
        </ul>
    );
}

/* Carte de service avec sa photo. */
export function ServiceCard({ service: s, to }) {
    const category = CATEGORIES.find((c) => c.id === s.cat);
    return (
        <Link className="service-card" to={to ?? `/services/${s.id}`}>
            <span className="service-card-photo">
                <Photo name={s.image} small />
                <span className={`service-card-icon cat-${s.cat}`}><Icon name={s.icon} size={20} /></span>
                <span className="service-card-cat">{category.short}</span>
            </span>
            <span className="service-card-body">
                <strong>{s.name}</strong>
                <span className="muted">{s.short}</span>
                <span className="service-card-foot"><span className="price">{s.price}</span><Icon name="arrow-right" size={18} /></span>
            </span>
        </Link>
    );
}

export function ServiceGrid({ services, linkTo, compact = false }) {
    if (!services.length) {
        return <EmptyState icon="magnifying-glass" title="Aucun service trouvé" body="Essayez un autre mot, ou écrivez-nous sur WhatsApp."><a className="btn btn-ghost" href={waLink()} target="_blank" rel="noopener">Écrire sur WhatsApp</a></EmptyState>;
    }
    return (
        <motion.div layout className={`service-grid ${compact ? 'service-grid-compact' : ''}`}>
            <AnimatePresence mode="popLayout">
                {services.map((s) => (
                    <motion.div key={s.id} layout initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.94 }} transition={{ duration: 0.25 }}>
                        <ServiceCard service={s} to={linkTo?.(s)} />
                    </motion.div>
                ))}
            </AnimatePresence>
        </motion.div>
    );
}

export function CategoryChips({ value, onChange, withAll = true }) {
    return (
        <div className="chips" role="group" aria-label="Filtrer par univers">
            {withAll && <button className="chip" type="button" aria-pressed={value === 'all'} onClick={() => onChange('all')}><Icon name="squares-2x2" size={18} />Tous</button>}
            {CATEGORIES.map((c) => <button key={c.id} className="chip" type="button" aria-pressed={value === c.id} onClick={() => onChange(c.id)}><Icon name={c.icon} size={18} />{c.name}</button>)}
        </div>
    );
}

/* Catalogue filtrable : recherche plein texte et univers, sans perdre le curseur. */
export function Catalog({ initialQuery = '', initialCategory = 'all', linkTo }) {
    const [q, setQ] = useState(initialQuery);
    const [cat, setCat] = useState(initialCategory);
    useEffect(() => { setQ(initialQuery); setCat(initialCategory); }, [initialQuery, initialCategory]);
    const list = filterServices(q, cat);
    return (
        <>
            <div className="toolbar">
                <div className="search-field">
                    <Icon name="magnifying-glass" size={18} />
                    <label className="sr-only" htmlFor="catalog-q">Rechercher un service</label>
                    <input id="catalog-q" type="search" value={q} onChange={(event) => setQ(event.target.value)} placeholder="Rechercher un service…" autoComplete="off" />
                </div>
            </div>
            <CategoryChips value={cat} onChange={setCat} />
            <p className="muted result-count" aria-live="polite">{list.length} service{list.length > 1 ? 's' : ''}</p>
            <ServiceGrid services={list} linkTo={linkTo} />
        </>
    );
}

/* Recherche du haut de page : résultats instantanés avec vignettes. */
export function SearchBox({ large = false, placeholder, target = '/services' }) {
    const id = useId();
    const [q, setQ] = useState('');
    const [open, setOpen] = useState(false);
    const box = useRef(null);
    const navigate = useNavigate();
    const results = q.trim().length >= 2 ? filterServices(q).slice(0, 5) : [];
    useEffect(() => {
        const onClick = (event) => { if (!box.current?.contains(event.target)) setOpen(false); };
        document.addEventListener('click', onClick);
        return () => document.removeEventListener('click', onClick);
    }, []);
    return (
        <form ref={box} className={`search ${large ? 'search-lg' : ''}`} role="search" autoComplete="off"
            onSubmit={(event) => { event.preventDefault(); setOpen(false); navigate(`${target}${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`); }}
            onKeyDown={(event) => { if (event.key === 'Escape') setOpen(false); }}>
            <label className="sr-only" htmlFor={id}>Rechercher un service</label>
            <Icon name="magnifying-glass" />
            <input id={id} type="search" value={q} placeholder={placeholder} role="combobox" aria-expanded={open && q.trim().length >= 2} aria-controls={`${id}-list`} aria-autocomplete="list"
                onChange={(event) => { setQ(event.target.value); setOpen(true); }} onFocus={() => setOpen(true)} />
            <button className={`btn ${large ? 'btn-gold' : 'btn-primary btn-icon'}`} type="submit" aria-label="Rechercher">
                <Icon name="magnifying-glass" size={18} />{large && <span>Rechercher</span>}
            </button>
            <AnimatePresence>
                {open && q.trim().length >= 2 && (
                    <motion.div className="search-results" id={`${id}-list`} role="listbox" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
                        {results.length ? results.map((s) => (
                            <Link key={s.id} className="search-result" role="option" aria-selected="false" to={`/services/${s.id}`} onClick={() => setOpen(false)}>
                                <span className="search-thumb"><Photo name={s.image} small /></span>
                                <span><strong>{s.name}</strong><small>{s.price}</small></span>
                            </Link>
                        )) : (
                            <p className="search-empty">Aucun service pour « {q.trim()} ». <a href={waLink(`Bonjour KWABO, je cherche : ${q.trim()}`)} target="_blank" rel="noopener">Demandez-nous sur WhatsApp</a></p>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </form>
    );
}
