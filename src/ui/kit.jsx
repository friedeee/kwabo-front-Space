import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { animate, motion, useInView, useReducedMotion } from 'motion/react';
import { STATUS } from '../data/catalog.js';
import { Icon, WhatsAppIcon } from './Icon.jsx';
import { initials, photo, waLink } from './format.js';

export function Logo({ light = false, to = '/' }) {
    return (
        <Link className={`logo ${light ? 'logo-light' : ''}`} to={to} aria-label="KWABO, accueil">
            <span className="logo-mark">K</span><span className="logo-text">KWABO<span className="logo-dot">.</span></span>
        </Link>
    );
}

export const Avatar = ({ name, size = '' }) => <span className={`avatar ${size}`} aria-hidden="true">{initials(name)}</span>;

export function StatusBadge({ status }) {
    const s = STATUS[status];
    return <span className={`badge badge-${s.tone}`}><Icon name={s.icon} size={14} />{s.label}</span>;
}

export function EmptyState({ icon, title, body, children }) {
    return (
        <div className="empty">
            <span className="tile tile-lg"><Icon name={icon} size={28} /></span>
            <h3>{title}</h3>
            <p className="muted">{body}</p>
            {children}
        </div>
    );
}

export function Pagination({ page, pages, onPage }) {
    if (pages <= 1) return null;
    return (
        <nav className="pagination" aria-label="Pagination">
            <button className="btn btn-ghost btn-sm" type="button" disabled={page <= 1} onClick={() => onPage(page - 1)}><Icon name="arrow-left" size={16} />Précédent</button>
            <span className="muted">Page {page} sur {pages}</span>
            <button className="btn btn-ghost btn-sm" type="button" disabled={page >= pages} onClick={() => onPage(page + 1)}>Suivant<Icon name="arrow-right" size={16} /></button>
        </nav>
    );
}

/* Photo qui apparaît en fondu une fois chargée (les photos décoratives ont alt=""). */
export function Photo({ name, small = false, alt = '', className = '', eager = false }) {
    const [loaded, setLoaded] = useState(false);
    return (
        <img
            className={`photo ${loaded ? 'is-loaded' : ''} ${className}`}
            src={photo(name, small)}
            alt={alt}
            loading={eager ? 'eager' : 'lazy'}
            decoding="async"
            onLoad={() => setLoaded(true)}
        />
    );
}

/* Apparition au défilement. */
export function Reveal({ children, delay = 0, y = 24, className = '', as = 'div' }) {
    const Component = motion[as];
    return (
        <Component className={className} initial={{ opacity: 0, y }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}>
            {children}
        </Component>
    );
}

/* Chiffre qui défile jusqu'à sa valeur quand il devient visible. */
export function CountUp({ value, format = (v) => String(v) }) {
    const ref = useRef(null);
    const inView = useInView(ref, { once: true });
    const reduce = useReducedMotion();
    const [shown, setShown] = useState(reduce ? value : 0);
    useEffect(() => {
        if (!inView || reduce) { setShown(value); return undefined; }
        const controls = animate(0, value, { duration: 0.9, ease: 'easeOut', onUpdate: (v) => setShown(Number.isInteger(value) ? Math.round(v) : v) });
        return () => controls.stop();
    }, [inView, value, reduce]);
    return <span ref={ref}>{format(shown)}</span>;
}

export function WhatsAppFloat() {
    return (
        <motion.a className="wa-float" href={waLink()} target="_blank" rel="noopener" aria-label="Nous écrire sur WhatsApp" title="WhatsApp"
            initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.6, type: 'spring', stiffness: 260, damping: 18 }}>
            <WhatsAppIcon />
            <span className="wa-pulse" aria-hidden="true" />
        </motion.a>
    );
}

export function StatusSteps({ status }) {
    if (status === 'cancelled') return <p className="notice notice-red"><Icon name="x-circle" />Cette demande a été annulée.</p>;
    const order = ['pending', 'active', 'done'];
    const reached = order.indexOf(status);
    return (
        <ol className="status-steps">
            {order.map((key, i) => {
                const done = i < reached || status === 'done';
                const current = i === reached && status !== 'done';
                return (
                    <li key={key} className={`${done ? 'is-done' : ''} ${current ? 'is-current' : ''}`} aria-current={i === reached ? 'step' : undefined}>
                        <motion.span className="status-step-dot" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: i * 0.12 }}>
                            <Icon name={done ? 'check' : STATUS[key].icon} size={16} />
                        </motion.span>
                        <span>{STATUS[key].label}</span>
                    </li>
                );
            })}
        </ol>
    );
}

export function StatRow({ items }) {
    return (
        <ul className={`stats stats-${items.length}`}>
            {items.map(({ icon, value, label, tone = 'neutral', to, format }, index) => (
                <motion.li key={label} className={`stat stat-${tone} ${to ? 'stat-link' : ''}`} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06 }}>
                    <span className="tile tile-sm"><Icon name={icon} size={18} /></span>
                    <strong>{typeof value === 'number' ? <CountUp value={value} format={format} /> : value}</strong>
                    <span>{to ? <Link to={to}>{label}</Link> : label}</span>
                </motion.li>
            ))}
        </ul>
    );
}

export function Stars({ rating }) {
    return (
        <span className="stars-read" role="img" aria-label={`${rating} sur 5`}>
            {[1, 2, 3, 4, 5].map((n) => <span key={n} className={n <= rating ? 'is-on' : ''}><Icon name="star" size={18} /></span>)}
        </span>
    );
}
