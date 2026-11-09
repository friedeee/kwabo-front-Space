import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router';
import { MotionConfig } from 'motion/react';
import { FeedbackProvider } from './ui/feedback.jsx';
import { SiteLayout } from './ui/layouts.jsx';
import { SiteHeader } from './site/SiteHeader.jsx';
import Home from './site/Home.jsx';
import { CreditsPage, LegalPage, NotFoundPage, ServiceDetailPage, ServicesPage } from './site/pages.jsx';
import { ForgotPage, LoginPage, RegisterPage, ResetPage, VerifyEmailPage } from './site/auth.jsx';

/* L'espace client et l'administration sont chargés seulement quand on y va. */
const ClientLayout = lazy(() => import('./client/ClientLayout.jsx'));
const client = (name) => lazy(() => import('./client/requests.jsx').then((m) => ({ default: m[name] })));
const account = (name) => lazy(() => import('./client/account.jsx').then((m) => ({ default: m[name] })));
const AdminLayout = lazy(() => import('./admin/AdminLayout.jsx'));
const overview = (name) => lazy(() => import('./admin/overview.jsx').then((m) => ({ default: m[name] })));
const adminRequests = (name) => lazy(() => import('./admin/requests.jsx').then((m) => ({ default: m[name] })));
const manage = (name) => lazy(() => import('./admin/manage.jsx').then((m) => ({ default: m[name] })));

const C = {
    Dashboard: client('Dashboard'), Catalog: client('ClientCatalog'), NewRequest: client('NewRequest'), Requests: client('Requests'), RequestDetail: client('RequestDetail'),
    Documents: client('Documents'), Messages: client('Messages'), Notifications: client('Notifications'),
    Payments: account('Payments'), Referral: account('Referral'), Profile: account('Profile'),
};
const A = {
    Login: overview('StaffLogin'), Dashboard: overview('Dashboard'), Kpis: overview('Kpis'),
    Requests: adminRequests('Requests'), RequestDetail: adminRequests('RequestDetail'), Inbox: adminRequests('Inbox'),
    Payments: manage('Payments'), Clients: manage('Clients'), ClientFile: manage('ClientFile'), Reviews: manage('Reviews'), Referrals: manage('Referrals'),
    Catalog: manage('Catalog'), Team: manage('Team'), Journal: manage('Journal'), Notifications: manage('StaffNotifications'), Account: manage('Account'),
};

function Loading() {
    return <div className="page-loading" role="status"><span className="logo-mark">K</span><span className="sr-only">Chargement…</span></div>;
}

export default function App() {
    return (
        <MotionConfig reducedMotion="user">
            <FeedbackProvider>
                <Suspense fallback={<Loading />}>
                    <Routes>
                        <Route element={<SiteLayout header={<SiteHeader />} />}>
                            <Route index element={<Home />} />
                            <Route path="services" element={<ServicesPage />} />
                            <Route path="services/:id" element={<ServiceDetailPage />} />
                            <Route path="mentions-legales" element={<LegalPage page="mentions-legales" />} />
                            <Route path="confidentialite" element={<LegalPage page="confidentialite" />} />
                            <Route path="cgu" element={<LegalPage page="cgu" />} />
                            <Route path="credits-photos" element={<CreditsPage />} />
                            <Route path="*" element={<NotFoundPage />} />
                        </Route>
                        <Route path="connexion" element={<LoginPage />} />
                        <Route path="inscription" element={<RegisterPage />} />
                        <Route path="verification-email" element={<VerifyEmailPage />} />
                        <Route path="mot-de-passe-oublie" element={<ForgotPage />} />
                        <Route path="reinitialiser-mot-de-passe" element={<ResetPage />} />

                        <Route path="espace" element={<ClientLayout />}>
                            <Route index element={<C.Dashboard />} />
                            <Route path="services" element={<C.Catalog />} />
                            <Route path="nouvelle-demande" element={<C.NewRequest />} />
                            <Route path="demandes" element={<C.Requests />} />
                            <Route path="demandes/:id" element={<C.RequestDetail />} />
                            <Route path="documents" element={<C.Documents />} />
                            <Route path="messages" element={<C.Messages />} />
                            <Route path="messages/:id" element={<C.Messages />} />
                            <Route path="paiements" element={<C.Payments />} />
                            <Route path="notifications" element={<C.Notifications />} />
                            <Route path="parrainage" element={<C.Referral />} />
                            <Route path="profil" element={<C.Profile />} />
                        </Route>

                        <Route path="admin/connexion" element={<A.Login />} />
                        <Route path="admin" element={<AdminLayout />}>
                            <Route index element={<A.Dashboard />} />
                            <Route path="indicateurs" element={<A.Kpis />} />
                            <Route path="demandes" element={<A.Requests />} />
                            <Route path="demandes/:id" element={<A.RequestDetail />} />
                            <Route path="messages" element={<A.Inbox />} />
                            <Route path="messages/:id" element={<A.Inbox />} />
                            <Route path="paiements" element={<A.Payments />} />
                            <Route path="clients" element={<A.Clients />} />
                            <Route path="clients/:id" element={<A.ClientFile />} />
                            <Route path="avis" element={<A.Reviews />} />
                            <Route path="parrainage" element={<A.Referrals />} />
                            <Route path="catalogue" element={<A.Catalog />} />
                            <Route path="equipe" element={<A.Team />} />
                            <Route path="journal" element={<A.Journal />} />
                            <Route path="notifications" element={<A.Notifications />} />
                            <Route path="compte" element={<A.Account />} />
                        </Route>
                    </Routes>
                </Suspense>
            </FeedbackProvider>
        </MotionConfig>
    );
}
