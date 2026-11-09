import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { CATEGORIES, FAQ, SERVICES, TAGS } from '../data/catalog.js';
import { useData } from '../api/hooks.js';
import { Icon, WhatsAppIcon } from '../ui/Icon.jsx';
import { Photo, Reveal } from '../ui/kit.jsx';
import { SitePage } from '../ui/layouts.jsx';
import { CategoryChips, filterServices, SearchBox, ServiceGrid, TRUST_POINTS } from '../ui/services.jsx';
import { photo, waLink } from '../ui/format.js';

const HERO_SLIDES = [
    { name: 'cotonou', place: 'Cadjèhoun, Cotonou' },
    { name: 'ganvie', place: 'Ganvié, lac Nokoué' },
    { name: 'dantokpa', place: 'Marché Dantokpa, Cotonou' },
    { name: 'ouidah-porte', place: 'Porte du Non-Retour, Ouidah' },
];

const GALLERY = [
    ['chantier', 'Un chantier suivi chaque semaine'], ['port', 'Le port autonome de Cotonou'], ['marche-ganvie', 'Le marché de Ganvié'],
    ['abomey', 'Les palais royaux d\'Abomey'], ['zemidjan', 'Les zémidjans de Cotonou'], ['wax', 'Les pagnes wax'],
    ['plage', 'La plage de Ouidah'], ['aeroport', 'L\'aéroport de Cotonou'], ['artisanat', 'L\'artisanat béninois'],
];

const STEPS = [
    ['user-plus', 'Créez votre compte', 'Gratuit, en moins d\'une minute. Votre espace personnel est prêt.'],
    ['clipboard-document-list', 'Décrivez votre besoin', 'Choisissez un service et remplissez un formulaire adapté, en moins de 3 minutes.'],
    ['document-text', 'Recevez un devis', 'Notre équipe répond sous 12 h. Clair, tout compris, sans frais cachés.'],
    ['video-camera', 'Suivez en direct', 'Vidéos, reçus, rapports et messages : tout est dans votre espace.'],
];

/* Diaporama de la page d'accueil : fondu enchaîné et léger zoom. */
function HeroSlides() {
    const [index, setIndex] = useState(0);
    const reduce = useReducedMotion();
    useEffect(() => {
        if (reduce) return undefined;
        const timer = setInterval(() => setIndex((i) => (i + 1) % HERO_SLIDES.length), 6000);
        return () => clearInterval(timer);
    }, [reduce]);
    const slide = HERO_SLIDES[index];
    return (
        <>
            <div className="hero-slides" aria-hidden="true">
                <AnimatePresence initial={false}>
                    <motion.div key={slide.name} className="hero-slide" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1.4 }}>
                        <img src={photo(slide.name)} alt="" className="hero-kenburns" />
                    </motion.div>
                </AnimatePresence>
            </div>
            <div className="hero-place">
                <AnimatePresence mode="wait">
                    <motion.span key={slide.place} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}><Icon name="map-pin" size={16} />{slide.place}</motion.span>
                </AnimatePresence>
                <span className="hero-dots">
                    {HERO_SLIDES.map((s, i) => <button key={s.name} type="button" aria-label={`Photo ${i + 1} : ${s.place}`} aria-pressed={i === index} onClick={() => setIndex(i)} />)}
                </span>
            </div>
        </>
    );
}

function TrustCollage() {
    const ref = useRef(null);
    const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
    const up = useTransform(scrollYProgress, [0, 1], [40, -40]);
    const down = useTransform(scrollYProgress, [0, 1], [-30, 30]);
    return (
        <div className="trust-collage" ref={ref} aria-hidden="true">
            <motion.div className="collage-a" style={{ y: up }}><Photo name="chantier-tour" small /></motion.div>
            <motion.div className="collage-b" style={{ y: down }}><Photo name="port-cargo" small /></motion.div>
            <motion.div className="collage-c" style={{ y: up }}><Photo name="marche-ganvie" small /></motion.div>
            <motion.span className="collage-badge" initial={{ scale: 0, rotate: -12 }} whileInView={{ scale: 1, rotate: -6 }} viewport={{ once: true }} transition={{ type: 'spring', delay: 0.3 }}>
                <Icon name="video-camera" size={18} />Preuves à l'appui
            </motion.span>
        </div>
    );
}

export default function Home() {
    useData();
    const location = useLocation();
    const [category, setCategory] = useState('all');
    useEffect(() => {
        if (!location.hash) return;
        const target = document.getElementById(location.hash.slice(1));
        setTimeout(() => target?.scrollIntoView({ behavior: 'smooth' }), 80);
    }, [location.hash]);
    const words = ['Vos', 'projets', 'au', 'Bénin,'];
    return (
        <SitePage title="Services de confiance pour la diaspora béninoise">
            <section className="hero hero-photo">
                <HeroSlides />
                <div className="container hero-inner">
                    <motion.p className="hero-eyebrow" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>Services de confiance pour la diaspora béninoise</motion.p>
                    <h1>
                        {words.map((w, i) => <span key={w}><motion.span className="hero-word" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.08, ease: [0.22, 1, 0.36, 1], duration: 0.6 }}>{w}</motion.span>{' '}</span>)}
                        <br /><motion.em initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.6 }}>entre de bonnes mains</motion.em>
                    </h1>
                    <motion.p className="hero-sub" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>Immobilier, famille, démarches, logistique : une équipe sur place à Cotonou, qui prouve son travail par des vidéos, des reçus et des rapports.</motion.p>
                    <motion.div className="hero-search" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.85 }}>
                        <SearchBox large placeholder="Que cherchez-vous ? Suivi de chantier, visa, fret…" />
                    </motion.div>
                    <motion.div className="hero-tags" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}>
                        {[['suivi-chantier', 'Suivi de chantier'], ['sante', 'Santé de vos proches'], ['faire-venir', 'Dossier visa'], ['fret', 'Fret Europe'], ['comptabilite', 'Création d\'entreprise']].map(([id, label]) => <Link key={id} to={`/services/${id}`}>{label}</Link>)}
                    </motion.div>
                    <ul className="hero-checks">
                        {['Compte gratuit, sans engagement', 'Devis sous 12 h', 'Satisfait ou remboursé 30 jours'].map((t) => <li key={t}><Icon name="check-circle" size={18} />{t}</li>)}
                    </ul>
                </div>
                <HeroScrollHint />
            </section>

            <section className="section">
                <div className="container">
                    <Reveal className="section-head"><div><h2>4 univers pour vos projets</h2><p className="muted">Tout ce que vous ne pouvez pas faire sur place, nous le faisons pour vous.</p></div></Reveal>
                    <div className="universes">
                        {CATEGORIES.map((c, index) => (
                            <Reveal key={c.id} delay={index * 0.08}>
                                <Link className="universe-card" to={`/services?cat=${c.id}`}>
                                    <Photo name={c.image} small />
                                    <span className="universe-text">
                                        <span className={`universe-icon cat-${c.id}`}><Icon name={c.icon} size={22} /></span>
                                        <strong>{c.name}</strong>
                                        <small>{c.blurb}</small>
                                        <span className="universe-count">{SERVICES.filter((s) => s.cat === c.id && s.available).length} services<Icon name="arrow-right" size={16} /></span>
                                    </span>
                                </Link>
                            </Reveal>
                        ))}
                    </div>
                </div>
            </section>

            <section className="section section-white" id="services">
                <div className="container">
                    <Reveal className="section-head"><div><h2>12 services, une seule équipe</h2><p className="muted">Filtrez par univers, ou cherchez directement.</p></div>
                        <Link className="btn btn-ghost" to="/services">Voir le catalogue<Icon name="arrow-right" size={18} /></Link></Reveal>
                    <CategoryChips value={category} onChange={setCategory} />
                    <ServiceGrid services={filterServices('', category)} />
                </div>
            </section>

            <section className="section" id="comment">
                <div className="container">
                    <Reveal className="section-head section-head-center"><div><h2>Comment ça marche</h2><p className="muted">De l'inscription à la mission réalisée, en 4 étapes.</p></div></Reveal>
                    <ol className="steps steps-animated">
                        <motion.span className="steps-line" aria-hidden="true" initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: 1.2, ease: 'easeInOut' }} />
                        {STEPS.map(([icon, title, text], i) => (
                            <Reveal as="li" key={title} delay={0.2 + i * 0.15}>
                                <span className="step-num"><Icon name={icon} size={22} /><span className="step-index">{i + 1}</span></span>
                                <h3>{title}</h3><p className="muted">{text}</p>
                            </Reveal>
                        ))}
                    </ol>
                </div>
            </section>

            <section className="section trust-section" id="confiance">
                <div className="container trust-grid">
                    <TrustCollage />
                    <div>
                        <Reveal><p className="eyebrow-gold">Pourquoi KWABO</p><h2>La transparence, notre seule loi</h2>
                            <p>Chaque intervention est documentée : vidéo, photos datées, reçus scannés pour chaque dépense, rapport écrit. Votre confiance n'est pas un bonus, c'est notre produit principal.</p></Reveal>
                        <ul className="trust-cards">
                            {TRUST_POINTS.map((t, i) => (
                                <Reveal as="li" key={t.title} delay={i * 0.08}><span className="trust-card-icon"><Icon name={t.icon} size={22} /></span><strong>{t.title}</strong><span>{t.text}</span></Reveal>
                            ))}
                        </ul>
                        <div className="btn-row">
                            <Link className="btn btn-gold btn-lg" to="/inscription">Créer mon compte gratuit</Link>
                            <a className="btn btn-outline-light btn-lg" href={waLink()} target="_blank" rel="noopener"><WhatsAppIcon />WhatsApp</a>
                        </div>
                    </div>
                </div>
            </section>

            <section className="section section-white gallery-section">
                <div className="container"><Reveal className="section-head section-head-center"><div><h2>Le Bénin, suivi de près</h2><p className="muted">Partout où vous avez un projet, notre équipe se déplace.</p></div></Reveal></div>
                <div className="marquee" aria-label="Photos du Bénin">
                    <ul className="marquee-track">
                        {[...GALLERY, ...GALLERY].map(([name, caption], i) => (
                            <li key={`${name}-${i}`} aria-hidden={i >= GALLERY.length ? 'true' : undefined}>
                                <Photo name={name} small alt={i < GALLERY.length ? caption : ''} />
                                <span>{caption}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </section>

            <section className="section">
                <div className="container">
                    <Reveal className="section-head section-head-center"><div><h2>Ce que la diaspora nous demande</h2></div></Reveal>
                    <div className="tag-cloud">
                        {TAGS.map((t, i) => (
                            <motion.span key={t} initial={{ opacity: 0, scale: 0.8 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.03 }}>
                                <Link to={`/services?q=${encodeURIComponent(t)}`}>{t}</Link>
                            </motion.span>
                        ))}
                    </div>
                </div>
            </section>

            <section className="section section-white" id="faq">
                <div className="container container-narrow">
                    <Reveal className="section-head section-head-center"><div><h2>Questions fréquentes</h2></div></Reveal>
                    <div className="faq">{FAQ.map((f) => <FaqItem key={f.q} item={f} />)}</div>
                </div>
            </section>

            <section className="cta-photo">
                <Photo name="cotonou" />
                <Reveal className="container cta-photo-inner">
                    <h2>Votre espace personnel vous attend</h2>
                    <p>Inscription gratuite, aucune carte bancaire. Un devis clair avant chaque mission.</p>
                    <div className="btn-row btn-row-center">
                        <Link className="btn btn-gold btn-lg" to="/inscription"><Icon name="user-plus" size={20} />Créer mon compte gratuit</Link>
                        <Link className="btn btn-outline-light btn-lg" to="/connexion">J'ai déjà un compte</Link>
                    </div>
                </Reveal>
            </section>
        </SitePage>
    );
}

function HeroScrollHint() {
    return <motion.a className="hero-scroll" href="#services" aria-label="Voir les services" onClick={(event) => { event.preventDefault(); document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' }); }}
        animate={{ y: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 2 }}><Icon name="chevron-down" size={24} /></motion.a>;
}

function FaqItem({ item }) {
    const [open, setOpen] = useState(false);
    return (
        <div className={`faq-item ${open ? 'is-open' : ''}`}>
            <h3><button type="button" aria-expanded={open} onClick={() => setOpen(!open)}>{item.q}<Icon name="chevron-down" size={20} /></button></h3>
            <AnimatePresence initial={false}>
                {open && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} style={{ overflow: 'hidden' }}>
                        <p>{item.a}</p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
