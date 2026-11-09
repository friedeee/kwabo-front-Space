import { Link, useParams, useSearchParams } from 'react-router';
import { motion, useScroll, useTransform } from 'motion/react';
import { CATEGORIES, SERVICES } from '../data/catalog.js';
import { PHOTO_CREDITS } from '../data/credits.js';
import { serviceById } from '../api/db.js';
import { useData, useUser } from '../api/hooks.js';
import { Icon, WhatsAppIcon } from '../ui/Icon.jsx';
import { EmptyState, Photo, Reveal } from '../ui/kit.jsx';
import { SitePage } from '../ui/layouts.jsx';
import { Catalog, ServiceCard, TrustStrip } from '../ui/services.jsx';
import { photo, waLink } from '../ui/format.js';

function PhotoBanner({ name, children }) {
    const { scrollY } = useScroll();
    const y = useTransform(scrollY, [0, 400], [0, 90]);
    return (
        <section className="page-banner page-banner-photo">
            <motion.img src={photo(name)} alt="" style={{ y }} />
            <div className="container">{children}</div>
        </section>
    );
}

export function ServicesPage() {
    useData();
    const [params] = useSearchParams();
    return (
        <SitePage title="Nos services">
            <PhotoBanner name="dantokpa">
                <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>Nos services</motion.h1>
                <p>Trouvez le service adapté à votre besoin, en quelques secondes.</p>
            </PhotoBanner>
            <section className="section section-tight"><div className="container">
                <Catalog initialQuery={params.get('q') ?? ''} initialCategory={params.get('cat') ?? 'all'} />
                <div className="spacer" />
                <TrustStrip />
            </div></section>
        </SitePage>
    );
}

export function ServiceDetailPage() {
    useData();
    const { id } = useParams();
    const user = useUser('client');
    const s = serviceById(id);
    if (!s) return <NotFoundPage />;
    const category = CATEGORIES.find((c) => c.id === s.cat);
    const others = SERVICES.filter((x) => x.cat === s.cat && x.id !== s.id && x.available);
    const start = user ? `/espace/nouvelle-demande?service=${s.id}` : `/inscription?service=${s.id}`;
    return (
        <SitePage title={s.name}>
            <PhotoBanner name={s.image}>
                <Link className="breadcrumb" to={`/services?cat=${s.cat}`}><Icon name="arrow-left" size={16} />{category.name}</Link>
                <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>{s.name}</motion.h1>
                <p>{s.short}</p>
            </PhotoBanner>
            <section className="section section-tight">
                <div className="container detail-grid">
                    <div className="stack">
                        <Reveal className="card"><h2>Ce qui est inclus</h2>
                            <ul className="check-list">{s.included.map((i, n) => <motion.li key={i} initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: n * 0.08 }}><Icon name="check-circle" size={20} />{i}</motion.li>)}</ul>
                        </Reveal>
                        <Reveal className="card service-proof">
                            <div><h2>Comment ça se passe</h2>
                                <ol className="mini-steps"><li>Vous décrivez votre besoin en moins de 3 minutes.</li><li>Vous recevez un devis sous 12 h.</li><li>Après paiement, la mission démarre.</li><li>Vous suivez tout depuis votre espace : documents, messages, statut.</li></ol></div>
                            <Photo name={category.image} small />
                        </Reveal>
                        <TrustStrip />
                    </div>
                    <aside className="card price-card">
                        <span className="muted">Tarif indicatif</span>
                        <strong className="price-big">{s.price}</strong>
                        <p className="muted">Le prix exact figure dans votre devis, avant tout paiement.</p>
                        {s.available
                            ? <Link className="btn btn-primary btn-lg btn-block" to={start}>Demander ce service</Link>
                            : <p className="notice">Ce service est momentanément indisponible.</p>}
                        <a className="btn btn-ghost btn-block" href={waLink(`Bonjour KWABO, j'ai une question sur : ${s.name}`)} target="_blank" rel="noopener"><WhatsAppIcon />Une question ?</a>
                    </aside>
                </div>
            </section>
            {others.length > 0 && (
                <section className="section section-white"><div className="container">
                    <div className="section-head"><div><h2>Dans le même univers</h2></div></div>
                    <div className="service-grid">{others.map((x) => <ServiceCard key={x.id} service={x} />)}</div>
                </div></section>
            )}
        </SitePage>
    );
}

/* Pages légales : textes de travail, à faire valider. */
export const LEGAL = {
    'mentions-legales': { title: 'Mentions légales', body: [
        ['Éditeur', 'KWABO Services, Cotonou, Bénin. Forme juridique, numéro d\'immatriculation et adresse complète : à compléter.'],
        ['Contact', 'À compléter : e-mail et téléphone officiels.'],
        ['Hébergement', 'À compléter selon l\'hébergeur retenu.'],
    ] },
    confidentialite: { title: 'Politique de confidentialité', body: [
        ['Données collectées', 'Identité, e-mail, téléphone, pays de résidence, et les informations que vous donnez dans vos demandes.'],
        ['Utilisation', 'Traiter vos demandes, vous envoyer vos devis et rapports, et vous informer de l\'avancement de vos missions.'],
        ['Données bancaires', 'Aucune donnée de carte bancaire n\'est conservée par KWABO. Les paiements sont gérés par le prestataire de paiement.'],
        ['Vos droits', 'Vous pouvez consulter, corriger et supprimer vos données. La suppression de votre compte efface toutes les données associées, depuis « Mon profil ».'],
    ] },
    cgu: { title: 'Conditions générales d\'utilisation', body: [
        ['Objet', 'Ces conditions encadrent l\'utilisation de la plateforme KWABO.'],
        ['Devis et paiement', 'Une mission démarre après acceptation et paiement du devis.'],
        ['Annulation', 'Vous pouvez annuler une demande tant qu\'elle n\'a pas été acceptée.'],
    ] },
};

export function LegalPage({ page }) {
    const content = LEGAL[page];
    return (
        <SitePage title={content.title}>
            <section className="page-banner"><div className="container"><h1>{content.title}</h1></div></section>
            <section className="section section-tight"><div className="container container-narrow"><div className="card legal">
                <p className="notice"><Icon name="information-circle" />Texte de travail, à faire valider par un juriste avant la mise en ligne.</p>
                {content.body.map(([t, d]) => <div key={t}><h2>{t}</h2><p>{d}</p></div>)}
            </div></div></section>
        </SitePage>
    );
}

export function CreditsPage() {
    return (
        <SitePage title="Crédits photos">
            <section className="page-banner"><div className="container"><h1>Crédits photos</h1><p>Photos du Bénin sous licence libre, issues de Wikimedia Commons. Merci à leurs auteurs.</p></div></section>
            <section className="section section-tight"><div className="container">
                <ul className="credits-grid">
                    {PHOTO_CREDITS.map((c) => (
                        <li key={c.file} className="card">
                            <Photo name={c.file} small />
                            <div><strong>{c.title}</strong><small>{c.author || 'Auteur non indiqué'} · {c.license}</small><a href={c.source} target="_blank" rel="noopener">Voir la source</a></div>
                        </li>
                    ))}
                </ul>
            </div></section>
        </SitePage>
    );
}

export function NotFoundPage() {
    return (
        <SitePage title="Page introuvable">
            <section className="section"><div className="container container-narrow">
                <div className="notfound"><Photo name="plage" small /><EmptyState icon="magnifying-glass" title="Page introuvable" body="Cette page n'existe pas ou a été déplacée."><Link className="btn btn-primary" to="/">Retour à l'accueil</Link></EmptyState></div>
            </div></section>
        </SitePage>
    );
}
